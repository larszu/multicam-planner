// Rig-Steuerung: das Pult zum Fahren der Kamera.
//
// Kern ist eine einzige rAF-Schleife, die pro Frame ALLE ausgelenkten Achsen
// zusammen verrechnet (`applyDrive`). Genau darum laesst sich der Dolly
// verschieben, waehrend man neigt — Tastatur und Pad koennen dabei
// gleichzeitig anliegen.
//
// Die Schleife liest den Kamerazustand ueber `useStore.getState()` statt ueber
// Props: sonst wuerde sich der Effekt bei jedem geschriebenen Frame neu
// aufsetzen. Abhaengig ist er nur von "scharf" und "Tempo".
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCircle, FiPlay, FiSquare, FiTrash2, FiRepeat, FiCrosshair } from 'react-icons/fi';
import { useStore } from '../../store/useStore';
import { getLensById } from '../../data/lenses';
import { MOUNT_TYPE_LABELS, type RigTake, type TakeSample } from '../../types';
import { rigYaw } from '../../utils/camera';
import { rigLimits } from '../../utils/rigLimits';
import { profileForMount } from '../../utils/motionProfile';
import {
  DEFAULT_SPEED_INDEX,
  DRIVE_KEYS,
  PARK_KEY,
  SPEED_STEPS,
  applyDrive,
  driveFromKeys,
  isIdle,
  mergeInput,
  type DriveInput,
} from '../../utils/rigDrive';
import {
  TAKE_MIN_DURATION_S,
  appendSample,
  defaultTakeName,
  formatTakeTime,
  sampleFromCamera,
  sampleTakeAt,
  takeDuration,
} from '../../utils/rigTake';

/** Nach so langem Leerlauf haelt die Fahr-Schleife wieder an (ms). */
const LOOP_IDLE_STOP_MS = 700;

/** Auslenkungs-Flaeche: Zeiger ziehen = Achse auslenken, loslassen = zurueck auf 0. */
function Deflector({
  label,
  hint,
  axes,
  onChange,
  disabled,
  size,
}: {
  label: string;
  hint: string;
  /** 'xy' = Pan/Tilt-Pad, 'x' = einachsiger Jog. */
  axes: 'xy' | 'x';
  onChange: (input: DriveInput) => void;
  disabled?: boolean;
  /** Kantenlaenge des Pads bzw. Hoehe des Jogs (px). */
  size: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const update = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      const next = { x: nx, y: axes === 'xy' ? ny : 0 };
      setPos(next);
      // Bildschirm-y zeigt nach unten, Tilt nach oben — daher das Minus.
      onChange(axes === 'xy' ? { pan: next.x, tilt: -next.y } : { travel: next.x });
    },
    [axes, onChange],
  );

  const release = useCallback(() => {
    setPos({ x: 0, y: 0 });
    onChange({});
  }, [onChange]);

  return (
    <div className={axes === 'xy' ? 'shrink-0' : 'w-full'} style={axes === 'xy' ? { width: size } : undefined}>
      <div className="text-[10px] text-gray-500 mb-1">{label}</div>
      <div
        ref={ref}
        title={hint}
        style={{ height: axes === 'xy' ? size : 40 }}
        className={`relative rounded-lg border ${disabled ? 'border-bc-border/50 bg-bc-dark/40' : 'border-bc-border bg-bc-dark cursor-crosshair'}`}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          update(e);
        }}
        onPointerMove={(e) => {
          if (disabled || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
          update(e);
        }}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); release(); }}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        {/* Fadenkreuz */}
        <div className="absolute inset-x-2 top-1/2 border-t border-bc-border/60" />
        <div className="absolute inset-y-2 left-1/2 border-l border-bc-border/60" />
        {!disabled && (
          <div
            className="absolute w-3 h-3 rounded-full bg-bc-yellow shadow"
            style={{
              left: `calc(50% + ${pos.x * 45}% - 6px)`,
              top: `calc(50% + ${pos.y * 45}% - 6px)`,
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Spielt eine aufgezeichnete Fahrt auf `cameraId` ab und liefert eine
 * Abbruch-Funktion. Die Schleife setzt am Ende nur die Zeitbasis zurueck —
 * kein rekursiver Neustart, damit der Cancel-Griff derselbe bleibt.
 */
function runTakePlayback(
  take: RigTake,
  cameraId: string,
  shouldLoop: () => boolean,
  onDone: () => void,
): () => void {
  const duration = takeDuration(take);
  if (duration <= 0) {
    onDone();
    return () => {};
  }
  let raf = 0;
  let cancelled = false;
  let startTs = performance.now();

  const frame = (now: number) => {
    if (cancelled) return;
    let t = (now - startTs) / 1000;
    if (t >= duration) {
      if (shouldLoop()) {
        startTs = now;
        t = 0;
      } else {
        const end = sampleTakeAt(take, duration);
        if (end) useStore.getState().updateCamera(cameraId, end);
        onDone();
        return;
      }
    }
    const patch = sampleTakeAt(take, t);
    if (patch) useStore.getState().updateCamera(cameraId, patch);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}

export default function RigControlPanel() {
  const cameras = useStore((s) => s.cameras);
  const selectedCameraId = useStore((s) => s.selectedCameraId);
  const selectCamera = useStore((s) => s.selectCamera);
  const rigTakes = useStore((s) => s.rigTakes);
  const addRigTake = useStore((s) => s.addRigTake);
  const removeRigTake = useStore((s) => s.removeRigTake);
  const renameRigTake = useStore((s) => s.renameRigTake);
  const takeStorageFull = useStore((s) => s.takeStorageFull);

  const cam = cameras.find((c) => c.id === selectedCameraId) ?? cameras[0] ?? null;
  const limits = cam ? rigLimits(cam) : null;
  const profile = profileForMount(cam?.mountType);

  const [armed, setArmed] = useState(true);
  const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED_INDEX);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loop, setLoop] = useState(false);
  // Der laufende Take fragt die Schleifen-Einstellung ueber diesen Ref ab,
  // damit ein Umschalten waehrend der Wiedergabe sofort greift.
  const loopRef = useRef(false);

  // Live-Eingaben. Refs statt State: sie aendern sich pro Frame und duerfen
  // keinen Re-Render ausloesen.
  const keysRef = useRef<Set<string>>(new Set());
  const padRef = useRef<DriveInput>({});
  const jogRef = useRef<DriveInput>({});
  const recRef = useRef<{ startedAt: number; camId: string; samples: TakeSample[] } | null>(null);

  // Tempo im Ref: die Fahr-Schleife soll beim Umschalten nicht neu starten
  // (sonst geht die Zeitbasis und damit ein Stueck Fahrweg verloren).
  const speedRef = useRef<number>(SPEED_STEPS[DEFAULT_SPEED_INDEX].factor);
  const setSpeed = useCallback((i: number) => {
    speedRef.current = SPEED_STEPS[i].factor;
    setSpeedIndex(i);
  }, []);

  // ── Fahr-Schleife ───────────────────────────────────────────────────────
  // Laeuft nur, solange wirklich etwas passiert: das Panel ist wegen
  // `tabEnableRenderOnDemand: false` immer gemountet, ein Dauer-rAF waere also
  // auch dann aktiv, wenn der Nutzer im 2D-Plan arbeitet. Tastendruck, Pad und
  // Aufnahme starten die Schleife; nach kurzem Leerlauf haelt sie wieder an.
  const loopRaf = useRef(0);
  const loopIdleSince = useRef(0);

  const startLoop = useCallback(() => {
    if (loopRaf.current) return;
    let last = performance.now();
    loopIdleSince.current = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const st = useStore.getState();
      const live = st.cameras.find((c) => c.id === st.selectedCameraId) ?? st.cameras[0];
      const input = mergeInput(mergeInput(driveFromKeys(keysRef.current), padRef.current), jogRef.current);
      const idle = isIdle(input);

      if (live && !idle) {
        const lens = getLensById(live.lensId);
        const patch = applyDrive(
          {
            cam: live,
            limits: rigLimits(live),
            profile: profileForMount(live.mountType),
            focalRange: lens ? { min: lens.focalLengthMin, max: lens.focalLengthMax } : undefined,
          },
          input,
          dt,
          speedRef.current,
        );
        if (patch) st.updateCamera(live.id, patch);
      }

      // Aufnahme laeuft unabhaengig davon, ob gerade gefahren wird — eine
      // Pause im Take ist Teil der Fahrt.
      const rec = recRef.current;
      if (rec) {
        const t = (now - rec.startedAt) / 1000;
        const after = st.cameras.find((c) => c.id === rec.camId);
        if (after) rec.samples = appendSample(rec.samples, sampleFromCamera(after, t));
        // Die Anzeige nur zehnmal je Sekunde nachziehen: ein setState pro Frame
        // rendert das ganze Panel mit und bringt fuer eine Zehntel-Anzeige
        // nichts.
        setRecSeconds((prev) => (Math.abs(t - prev) >= 0.1 ? t : prev));
      }

      if (idle && !rec) {
        if (!loopIdleSince.current) loopIdleSince.current = now;
        if (now - loopIdleSince.current > LOOP_IDLE_STOP_MS) {
          loopRaf.current = 0;
          return;
        }
      } else {
        loopIdleSince.current = 0;
      }
      loopRaf.current = requestAnimationFrame(tick);
    };
    loopRaf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(
    () => () => {
      if (loopRaf.current) cancelAnimationFrame(loopRaf.current);
      loopRaf.current = 0;
    },
    [],
  );

  // ── Tastatur ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!armed) {
      keysRef.current.clear();
      return;
    }
    const typing = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    };
    const held = keysRef.current;
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
      const k = e.key.toLowerCase();
      if (DRIVE_KEYS[k]) {
        e.preventDefault();
        keysRef.current.add(k);
        startLoop();
        return;
      }
      if (k === PARK_KEY) {
        e.preventDefault();
        const st = useStore.getState();
        const live = st.cameras.find((c) => c.id === st.selectedCameraId);
        if (live) st.updateCamera(live.id, { trackOffset: 0 });
        return;
      }
      const step = SPEED_STEPS.findIndex((s) => s.key === k);
      if (step >= 0) {
        e.preventDefault();
        setSpeed(step);
      }
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    // Beim Fensterwechsel bleiben sonst Tasten "haengen" und das Rig faehrt weiter.
    const blur = () => keysRef.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      held.clear();
    };
  }, [armed, startLoop, setSpeed]);

  // ── Aufnahme ────────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const st = useStore.getState();
    const live = st.cameras.find((c) => c.id === st.selectedCameraId) ?? st.cameras[0];
    if (!live) return;
    recRef.current = { startedAt: performance.now(), camId: live.id, samples: [sampleFromCamera(live, 0)] };
    setRecSeconds(0);
    setRecording(true);
    startLoop();
  }, [startLoop]);

  const stopRecording = useCallback(() => {
    const rec = recRef.current;
    recRef.current = null;
    setRecording(false);
    if (!rec) return;
    const duration = rec.samples.length ? rec.samples[rec.samples.length - 1].t : 0;
    if (duration < TAKE_MIN_DURATION_S || rec.samples.length < 2) return;
    const live = useStore.getState().cameras.find((c) => c.id === rec.camId);
    addRigTake({
      name: live ? defaultTakeName(live, duration) : `Fahrt ${duration.toFixed(1)}s`,
      cameraId: rec.camId,
      mountType: live?.mountType,
      samples: rec.samples,
      createdAt: Date.now(),
    });
  }, [addRigTake]);

  // ── Wiedergabe ──────────────────────────────────────────────────────────
  const playCancel = useRef<(() => void) | null>(null);

  const stopPlayback = useCallback(() => {
    playCancel.current?.();
    playCancel.current = null;
    setPlayingId(null);
  }, []);

  const playTake = useCallback(
    (take: RigTake) => {
      playCancel.current?.();
      const st = useStore.getState();
      // Auf die aufgezeichnete Kamera zurueckfallen, sonst auf die gewaehlte —
      // ein Take soll auch nach dem Loeschen "seiner" Kamera abspielbar sein.
      const target =
        st.cameras.find((c) => c.id === take.cameraId) ??
        st.cameras.find((c) => c.id === st.selectedCameraId) ??
        st.cameras[0];
      if (!target) return;
      playCancel.current = runTakePlayback(
        take,
        target.id,
        () => loopRef.current,
        () => {
          playCancel.current = null;
          setPlayingId(null);
        },
      );
      setPlayingId(take.id);
    },
    [],
  );

  useEffect(() => () => { playCancel.current?.(); }, []);

  if (!cam || !limits) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Keine Kamera vorhanden — links im Panel „Cameras" eine anlegen.
      </div>
    );
  }

  const takes = rigTakes.filter((t) => t.cameraId === cam.id);
  const otherTakes = rigTakes.filter((t) => t.cameraId !== cam.id);
  const hasTravel = limits.travelM > 0;

  return (
    <div className="h-full overflow-auto bg-bc-panel text-xs text-white" data-rig-control>
      <div className="p-3 space-y-3 max-w-[860px]">
        {/* Kopf: welche Kamera, welches Rig */}
        <div className="flex items-center gap-2">
          <select
            className="bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
            value={cam.id}
            onChange={(e) => selectCamera(e.target.value)}
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <span className="text-gray-400 truncate">
            {limits.rig?.name ?? MOUNT_TYPE_LABELS[limits.type]} · {profile.label}
          </span>
          <button
            onClick={() => setArmed((a) => !a)}
            className={`ml-auto px-2 py-1 rounded border ${armed ? 'border-bc-yellow text-bc-yellow' : 'border-bc-border text-gray-400'}`}
            title="Tastatur-Steuerung scharf schalten. Aus, wenn die Tasten woanders gebraucht werden."
          >
            {armed ? 'Tasten aktiv' : 'Tasten aus'}
          </button>
        </div>

        {/* Tempo */}
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Tempo</span>
          {SPEED_STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setSpeed(i)}
              title={`${s.hint} (Taste ${s.key})`}
              className={`px-2 py-0.5 rounded border ${i === speedIndex ? 'border-bc-yellow text-bc-yellow' : 'border-bc-border text-gray-400'}`}
            >
              {s.label}
            </button>
          ))}
          <span className="ml-auto text-gray-600">
            max {profile.maxTravelMps.toFixed(2)} m/s · {profile.maxRotDps}°/s · {profile.maxLiftMps.toFixed(2)} m/s Hub
          </span>
        </div>

        {/* Pult */}
        <div className="flex gap-3 items-start">
          <Deflector
            label="Pan / Tilt (← → ↑ ↓)"
            hint="Ziehen schwenkt und neigt — gleichzeitig mit der Fahrt moeglich."
            axes="xy"
            size={220}
            onChange={(i) => { padRef.current = i; startLoop(); }}
          />
          <div className="flex-1 min-w-0 space-y-2">
            <Deflector
              label={hasTravel ? 'Fahrweg (J / L)' : 'Fahrweg — dieses Rig faehrt nicht'}
              hint={hasTravel ? 'Ziehen faehrt den Wagen; loslassen stoppt.' : 'Stativ, Hi-Hat & Co. haben keinen Fahrweg.'}
              axes="x"
              size={40}
              disabled={!hasTravel}
              onChange={(i) => { jogRef.current = i; startLoop(); }}
            />
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              <Readout label="Fahrweg" value={hasTravel ? `${(cam.trackOffset ?? 0).toFixed(2)} m` : '—'} sub={hasTravel ? `±${limits.travelM.toFixed(2)} m` : ''} />
              <Readout label="Hoehe" value={`${cam.z.toFixed(2)} m`} sub={`${limits.minHeightM.toFixed(2)}–${limits.maxHeightM.toFixed(2)}`} />
              <Readout label="Pan" value={`${cam.pan.toFixed(1)}°`} />
              <Readout label="Tilt" value={`${cam.tilt.toFixed(1)}°`} />
              <Readout label="Ausrichtung" value={`${rigYaw(cam).toFixed(0)}°`} sub={cam.rigRotation === undefined ? 'folgt Kamera' : 'fest'} />
              <Readout label="Brennweite" value={`${cam.focalLength.toFixed(0)} mm`} />
            </div>
          </div>
        </div>

        {/* Tastenlegende */}
        <div className="rounded border border-bc-border bg-bc-dark px-2 py-1.5 text-[10px] text-gray-400 leading-relaxed">
          <b className="text-gray-300">Tasten</b> — <b>J/L</b> Fahrweg · <b>← →</b> Pan · <b>↑ ↓</b> Tilt ·
          {' '}<b>R/F</b> Hoehe · <b>[ ]</b> Rig ausrichten · <b>, .</b> Zoom · <b>0</b> parken ·
          {' '}<b>1/2/3</b> Tempo. Mehrere Tasten gleichzeitig fahren mehrere Achsen zusammen.
        </div>

        {/* Aufnahme */}
        <div className="flex items-center gap-2">
          {recording ? (
            <button onClick={stopRecording} className="flex items-center gap-1 px-2 py-1 rounded bg-bc-red text-white">
              <FiSquare size={11} /> Stop {formatTakeTime(recSeconds)}
            </button>
          ) : (
            <button onClick={startRecording} className="flex items-center gap-1 px-2 py-1 rounded border border-bc-border text-bc-red hover:border-bc-red">
              <FiCircle size={11} /> Fahrt aufzeichnen
            </button>
          )}
          <button
            onClick={() => { loopRef.current = !loopRef.current; setLoop(loopRef.current); }}
            className={`flex items-center gap-1 px-2 py-1 rounded border ${loop ? 'border-bc-yellow text-bc-yellow' : 'border-bc-border text-gray-400'}`}
            title="Aufgezeichnete Fahrt in Schleife abspielen"
          >
            <FiRepeat size={11} /> Loop
          </button>
          {playingId && (
            <button onClick={stopPlayback} className="px-2 py-1 rounded border border-bc-border text-gray-300">
              Wiedergabe stoppen
            </button>
          )}
          <span className="ml-auto text-gray-600">{takes.length} Fahrt(en) fuer {cam.label}</span>
        </div>

        {takeStorageFull && (
          <div className="rounded border border-bc-red/60 bg-bc-red/10 px-2 py-1 text-[11px] text-bc-red">
            Der Speicher ist voll — die letzte Fahrt konnte nicht gesichert werden. Aeltere Fahrten loeschen.
          </div>
        )}

        {/* Takes */}
        <div className="space-y-1">
          {takes.length === 0 && (
            <p className="text-gray-600 text-[11px]">
              Noch keine Fahrt aufgezeichnet. „Fahrt aufzeichnen" druecken, fahren, „Stop" — die Bewegung
              laesst sich danach beliebig oft abspielen.
            </p>
          )}
          {takes.map((t) => (
            <div key={t.id} className={`flex items-center gap-1 rounded border px-2 py-1 ${playingId === t.id ? 'border-bc-yellow' : 'border-bc-border'}`}>
              <button onClick={() => (playingId === t.id ? stopPlayback() : playTake(t))} className="text-gray-300 hover:text-white p-0.5" title="Abspielen">
                {playingId === t.id ? <FiSquare size={12} /> : <FiPlay size={12} />}
              </button>
              <input
                className="flex-1 bg-transparent outline-none text-white"
                value={t.name}
                title="Fahrt benennen"
                onChange={(e) => renameRigTake(t.id, e.target.value)}
              />
              <span className="text-gray-500">{formatTakeTime(takeDuration(t))}</span>
              <span className="text-gray-600 text-[10px]">{t.samples.length} Pkt.</span>
              <button
                onClick={() => { if (playingId === t.id) stopPlayback(); removeRigTake(t.id); }}
                className="text-gray-500 hover:text-bc-red p-0.5"
                title="Fahrt loeschen"
              >
                <FiTrash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {otherTakes.length > 0 && (
          <div className="text-[10px] text-gray-600 flex items-center gap-1">
            <FiCrosshair size={10} /> {otherTakes.length} weitere Fahrt(en) gehoeren zu anderen Kameras.
          </div>
        )}
      </div>
    </div>
  );
}

function Readout({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border border-bc-border bg-bc-dark px-2 py-1">
      <div className="text-gray-500 text-[10px]">{label}</div>
      <div className="text-white tabular-nums">{value}</div>
      {sub && <div className="text-gray-600 text-[10px]">{sub}</div>}
    </div>
  );
}

