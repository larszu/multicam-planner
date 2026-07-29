import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCamera,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiPlay,
  FiPlus,
  FiPrinter,
  FiSquare,
  FiTrash2,
} from 'react-icons/fi';
import { useStore } from '../../store/useStore';
import { captureCurrentShot } from '../../utils/captureShot';
import {
  TRANSITION_LABEL,
  nextTransitionMode,
  runCameraTransition,
  transitionSeconds,
} from '../../utils/cameraTransition';
import { indexOfShot, shotTargetFromState, stepShotIndex } from '../../utils/shot';
import {
  MOTION_PROFILES,
  feasibleDurationRounded,
  profileForMount,
} from '../../utils/motionProfile';
import { MOUNT_TYPE_LABELS, type CameraMountType } from '../../types';
import { exportStoryboardPng, printStoryboard, shotOpticsLabel } from '../../utils/storyboard';
import type { Shot } from '../../types';

/**
 * Shotlist-/Storyboard-Panel (#62 Punkt 5).
 *
 * Ein Preset ist ein einzelner Kamera-Zustand — ein Shot ist derselbe Zustand,
 * benannt, mit Framegrab und als Teil einer geordneten Sequenz. Das Panel
 * nimmt Shots auf, faehrt sie einzeln oder als Sequenz an (mit derselben
 * Transition-Engine wie die Presets, #62 Punkt 4) und exportiert sie als
 * Storyboard (PNG-Kontaktbogen oder Druck/PDF).
 */
export default function ShotlistPanel() {
  const {
    shotlists,
    activeShotlistId,
    currentShotId,
    shotlistStorageFull,
    addShotlist,
    removeShotlist,
    renameShotlist,
    setActiveShotlist,
    updateShot,
    removeShot,
    moveShot,
    setCurrentShotId,
    cameras,
    selectedCameraId,
    selectCamera,
    updateCamera,
    venue,
  } = useStore();

  const list = shotlists.find((l) => l.id === activeShotlistId) ?? null;
  // Memoisiert, damit die Sequenz-Callbacks stabile Dependencies haben (sonst
  // ist `?? []` bei jedem Render ein neues Array).
  const shots = useMemo(() => list?.shots ?? [], [list]);

  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Abbruch-Handle der laufenden Fahrt. Ein neuer Sprung bricht die alte Fahrt
  // ab, damit sich zwei Interpolationen nicht gegenseitig ueberschreiben.
  const cancelRef = useRef<(() => void) | null>(null);
  const playingRef = useRef(false);

  const stopTransition = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
  }, []);

  const stopPlayback = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    stopTransition();
  }, [stopTransition]);

  // Laufende Fahrt beim Unmount stoppen — sonst schreibt der RAF-Tick weiter
  // in den Store, obwohl das Panel schon weg ist.
  useEffect(() => () => {
    playingRef.current = false;
    cancelRef.current?.();
  }, []);

  const flash = useCallback((msg: string) => {
    setHint(msg);
    window.setTimeout(() => setHint((h) => (h === msg ? null : h)), 3500);
  }, []);

  /** Faehrt einen Shot an. `onDone` treibt die Playback-Kette. */
  const goToShot = useCallback(
    (shot: Shot, onDone?: () => void) => {
      stopTransition();

      // Shot kann zu einer anderen Kamera gehoeren — erst umschalten.
      if (shot.cameraId !== selectedCameraId) selectCamera(shot.cameraId);

      const from = useStore.getState().cameras.find((c) => c.id === shot.cameraId);
      setCurrentShotId(shot.id);

      if (!from) {
        // Kamera wurde geloescht, seit der Shot aufgenommen wurde.
        flash('Kamera dieses Shots existiert nicht mehr.');
        onDone?.();
        return;
      }

      const target = shotTargetFromState(shot.state);
      const secs = transitionSeconds(shot.transition, shot.transitionSeconds);
      // Bewegungsstil: explizit am Shot gesetzt, sonst der der Montage.
      const profile = profileForMount(shot.motionStyle ?? from.mountType);

      cancelRef.current = runCameraTransition({
        from,
        to: target,
        seconds: secs,
        profile,
        apply: (patch) => updateCamera(shot.cameraId, patch),
        onDone: () => {
          cancelRef.current = null;
          onDone?.();
        },
      });
    },
    [flash, selectCamera, selectedCameraId, setCurrentShotId, stopTransition, updateCamera],
  );

  /** Shot aus der aktuellen Preview-Ansicht aufnehmen. */
  const captureShot = useCallback(() => {
    const res = captureCurrentShot();
    if (!res.ok) {
      flash(res.reason ?? 'Aufnehmen fehlgeschlagen.');
      return;
    }
    if (!res.hadThumbnail) {
      // Sollte dank Offscreen-Render praktisch nie passieren — nur wenn gar
      // keine Preview gemountet ist (z. B. Panel allein im Grid-Preset).
      flash('Shot gespeichert — ohne Bild (Preview nicht verfuegbar).');
    }
  }, [flash]);

  /** Vor/Zurueck in der Sequenz (Klick oder Q/E). */
  const step = useCallback(
    (dir: 1 | -1) => {
      if (shots.length === 0) return;
      stopPlayback();
      const next = stepShotIndex(indexOfShot(shots, currentShotId), shots.length, dir);
      if (next >= 0) goToShot(shots[next]);
    },
    [currentShotId, goToShot, shots, stopPlayback],
  );

  /** Sequenz ab dem aktuellen (oder ersten) Shot abspielen. */
  const play = useCallback(() => {
    if (shots.length === 0) return;
    stopTransition();
    playingRef.current = true;
    setPlaying(true);

    const startAt = Math.max(0, indexOfShot(shots, currentShotId));
    const runFrom = (i: number) => {
      if (!playingRef.current) return;
      if (i >= shots.length) {
        playingRef.current = false;
        setPlaying(false);
        return;
      }
      goToShot(shots[i], () => runFrom(i + 1));
    };
    // Beim Start auf dem letzten Shot von vorn beginnen, sonst ist sofort Ende.
    runFrom(startAt >= shots.length - 1 ? 0 : startAt);
  }, [currentShotId, goToShot, shots, stopTransition]);

  // Q/E-Navigation wie in Cine Tracer. Tippen in Feldern darf nicht springen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === 'q') { e.preventDefault(); step(-1); }
      else if (k === 'e') { e.preventDefault(); step(1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  const doExportPng = useCallback(async () => {
    if (!list || list.shots.length === 0) return;
    setBusy(true);
    try {
      await exportStoryboardPng(list, venue.name);
    } catch {
      flash('Export fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }, [flash, list, venue.name]);

  const btn =
    'px-2 py-1 rounded text-[11px] border border-bc-border text-gray-300 hover:text-white hover:border-bc-accent/60 disabled:opacity-40 disabled:hover:text-gray-300 disabled:hover:border-bc-border transition-colors';

  return (
    <div data-shotlist-panel className="w-full h-full flex flex-col bg-bc-panel text-white overflow-hidden">
      {/* ── Kopfzeile: Liste waehlen / anlegen ── */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-bc-border shrink-0">
        <select
          value={activeShotlistId ?? ''}
          onChange={(e) => setActiveShotlist(e.target.value || null)}
          className="bg-bc-dark border border-bc-border rounded px-1.5 py-1 text-xs text-white max-w-[45%] flex-1 min-w-0"
        >
          {shotlists.length === 0 && <option value="">— keine Shotlist —</option>}
          {shotlists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.shots.length})
            </option>
          ))}
        </select>
        <button className={btn} onClick={() => addShotlist(`Shotlist ${shotlists.length + 1}`)} title="Neue Shotlist">
          <FiPlus size={13} />
        </button>
        <button
          className={btn}
          disabled={!list}
          title="Shotlist umbenennen"
          onClick={() => {
            if (!list) return;
            const name = window.prompt('Name der Shotlist:', list.name);
            if (name && name.trim()) renameShotlist(list.id, name.trim());
          }}
        >
          Umbenennen
        </button>
        <button
          className={btn}
          disabled={!list}
          title="Shotlist loeschen"
          onClick={() => {
            if (!list) return;
            if (window.confirm(`Shotlist "${list.name}" mit ${list.shots.length} Shots loeschen?`)) {
              stopPlayback();
              removeShotlist(list.id);
            }
          }}
        >
          <FiTrash2 size={13} />
        </button>
      </div>

      {/* ── Aktionsleiste ── */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-bc-border shrink-0 flex-wrap">
        <button
          className="px-2 py-1 rounded text-[11px] font-medium border border-bc-accent/60 text-bc-accent bg-bc-accent/10 hover:bg-bc-accent/20 disabled:opacity-40 transition-colors flex items-center gap-1"
          onClick={captureShot}
          disabled={!selectedCameraId}
          title="Aktuelle Preview-Ansicht als Shot speichern"
        >
          <FiCamera size={13} /> Shot aufnehmen
        </button>

        <div className="w-px h-4 bg-bc-border" />

        <button className={btn} onClick={() => step(-1)} disabled={shots.length === 0} title="Vorheriger Shot (Q)">
          <FiChevronLeft size={13} />
        </button>
        <button className={btn} onClick={() => step(1)} disabled={shots.length === 0} title="Naechster Shot (E)">
          <FiChevronRight size={13} />
        </button>
        {playing ? (
          <button className={btn} onClick={stopPlayback} title="Sequenz stoppen">
            <FiSquare size={13} />
          </button>
        ) : (
          <button className={btn} onClick={play} disabled={shots.length === 0} title="Sequenz abspielen">
            <FiPlay size={13} />
          </button>
        )}

        <div className="w-px h-4 bg-bc-border" />

        <button className={btn} onClick={doExportPng} disabled={!list || shots.length === 0 || busy} title="Storyboard als PNG">
          <FiDownload size={13} />
        </button>
        <button
          className={btn}
          onClick={() => list && printStoryboard(list, venue.name)}
          disabled={!list || shots.length === 0}
          title="Storyboard drucken / als PDF sichern"
        >
          <FiPrinter size={13} />
        </button>

        <span className="ml-auto text-[10px] text-gray-500">Q / E</span>
      </div>

      {(hint || shotlistStorageFull) && (
        <div className="px-2 py-1 text-[10px] border-b border-bc-border shrink-0">
          {hint && <div className="text-bc-yellow">{hint}</div>}
          {shotlistStorageFull && (
            <div className="text-bc-red">
              Speicher voll — die letzte Aenderung wurde nicht dauerhaft gesichert. Aeltere Shots
              loeschen oder Storyboard exportieren.
            </div>
          )}
        </div>
      )}

      {/* ── Shot-Streifen ── */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {shots.length === 0 && (
          <div className="text-center text-gray-500 text-xs py-8 leading-relaxed">
            Noch keine Shots.
            <br />
            Kamera im Preview einrichten und <span className="text-bc-accent">Shot aufnehmen</span>{' '}
            klicken.
          </div>
        )}

        {shots.map((shot, i) => {
          const isCurrent = shot.id === currentShotId;
          const shotCam = cameras.find((c) => c.id === shot.cameraId);
          const camGone = !shotCam;
          const secs = transitionSeconds(shot.transition, shot.transitionSeconds);
          // Bewegungsstil + physikalische Mindestdauer auf diesem Rig. Die
          // Fahrt geht vom aktuellen Kamerastand zum Shot — genau die Strecke,
          // die beim Abspielen zurueckgelegt wird.
          const effStyle: CameraMountType = shot.motionStyle ?? shotCam?.mountType ?? 'tripod';
          const profile = profileForMount(effStyle);
          const needS = shotCam ? feasibleDurationRounded(profile, shotCam, shot.state) : 0;
          const tooFast = secs > 0 && needS > secs;
          return (
            <div
              key={shot.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dropIndex !== i) setDropIndex(i);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (list && dragIndex !== null && dragIndex !== i) moveShot(list.id, dragIndex, i);
                setDragIndex(null);
                setDropIndex(null);
              }}
              className={`rounded border overflow-hidden cursor-pointer transition-colors ${
                isCurrent ? 'border-bc-accent bg-bc-accent/10' : 'border-bc-border bg-bc-dark hover:border-bc-accent/50'
              } ${dropIndex === i && dragIndex !== null && dragIndex !== i ? 'ring-1 ring-bc-accent' : ''} ${
                dragIndex === i ? 'opacity-50' : ''
              }`}
              onClick={() => {
                stopPlayback();
                goToShot(shot);
              }}
            >
              <div className="flex gap-2 p-1.5">
                {/* Framegrab */}
                <div className="relative w-28 shrink-0 aspect-video bg-black rounded overflow-hidden flex items-center justify-center">
                  {shot.thumbnail ? (
                    <img src={shot.thumbnail} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[9px] text-gray-600">kein Bild</span>
                  )}
                  <span className="absolute top-0.5 left-0.5 bg-black/70 text-bc-yellow font-bold text-[9px] px-1 rounded">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Daten */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <input
                    value={shot.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => list && updateShot(list.id, shot.id, { name: e.target.value })}
                    className="bg-transparent border border-transparent hover:border-bc-border focus:border-bc-accent rounded px-1 py-0.5 text-xs font-medium text-white w-full outline-none"
                    title="Shot benennen"
                  />
                  <div className="text-[10px] text-gray-400 px-1 truncate">{shotOpticsLabel(shot)}</div>
                  <div className="flex items-center gap-1 px-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (list) updateShot(list.id, shot.id, { transition: nextTransitionMode(shot.transition) });
                      }}
                      className="text-[9px] px-1 py-0.5 rounded border border-bc-border text-gray-400 hover:text-white hover:border-bc-accent/60"
                      title="Fahrtzeit umschalten (OFF / Schnell / Langsam / Manuell)"
                    >
                      {TRANSITION_LABEL[shot.transition]}
                      {secs > 0 ? ` ${secs}s` : ''}
                    </button>
                    {shot.transition === 'manual' && (
                      <input
                        type="number"
                        min={0}
                        max={120}
                        step={0.5}
                        value={shot.transitionSeconds ?? 6}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (list) {
                            updateShot(list.id, shot.id, {
                              transitionSeconds: Number.isFinite(v) ? Math.max(0, Math.min(120, v)) : 0,
                            });
                          }
                        }}
                        className="w-12 bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-[9px] text-white"
                        title="Fahrtzeit in Sekunden"
                      />
                    )}
                    {/* Bewegungsstil: leer = der der Montage. */}
                    <select
                      value={shot.motionStyle ?? ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (!list) return;
                        const v = e.target.value;
                        updateShot(list.id, shot.id, {
                          motionStyle: v ? (v as CameraMountType) : undefined,
                        });
                      }}
                      className="bg-bc-panel border border-bc-border rounded px-0.5 py-0.5 text-[9px] text-gray-400 max-w-[86px]"
                      title={`Bewegungsstil — ${profile.hint}`}
                    >
                      <option value="">
                        Rig: {MOUNT_TYPE_LABELS[shotCam?.mountType ?? 'tripod']}
                      </option>
                      {(Object.keys(MOTION_PROFILES) as CameraMountType[]).map((m) => (
                        <option key={m} value={m}>{MOTION_PROFILES[m].label}</option>
                      ))}
                    </select>
                    {tooFast && (
                      <span
                        className="text-[9px] text-bc-yellow"
                        title={`Auf einem ${profile.label} braucht diese Fahrt mindestens ${needS}s — die eingestellten ${secs}s sind physikalisch nicht zu schaffen.`}
                      >
                        min {needS}s
                      </span>
                    )}
                    {camGone && (
                      <span className="text-[9px] text-bc-red" title="Die Kamera dieses Shots wurde geloescht">
                        Kamera fehlt
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (list) removeShot(list.id, shot.id);
                      }}
                      className="ml-auto p-0.5 text-gray-500 hover:text-bc-red"
                      title="Shot loeschen"
                    >
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                  <input
                    value={shot.note ?? ''}
                    placeholder="Notiz…"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => list && updateShot(list.id, shot.id, { note: e.target.value })}
                    className="bg-transparent border border-transparent hover:border-bc-border focus:border-bc-accent rounded px-1 py-0.5 text-[10px] text-gray-300 w-full outline-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
