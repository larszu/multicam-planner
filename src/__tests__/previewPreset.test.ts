import { describe, expect, it } from 'vitest';
import {
  assignPreset,
  copyPresetToCamera,
  groupPresets,
  hasPose,
  type PreviewPreset,
} from '../utils/previewPreset';

const preset = (id: string, over: Partial<PreviewPreset> = {}): PreviewPreset => ({
  id,
  name: `Preset ${id}`,
  focalLength: 35,
  aperture: 2.8,
  focusDistance: 8,
  ...over,
});

describe('groupPresets', () => {
  const own = preset('a', { cameraId: 'cam-1' });
  const foreign = preset('b', { cameraId: 'cam-2' });
  const legacy = preset('c');
  const orphan = preset('d', { cameraId: 'cam-weg' });
  const all = [own, foreign, legacy, orphan];
  const existing = ['cam-1', 'cam-2'];

  it('zeigt nur die Presets der aktiven Kamera', () => {
    // Der eigentliche Fehler: ein Preset von CAM 2 fuhr CAM 1 an dessen Position.
    const g = groupPresets(all, 'cam-1', existing);
    expect(g.own).toEqual([own]);
    expect(g.own.some((p) => p.cameraId === 'cam-2')).toBe(false);
  });

  it('wirft Altbestand ohne Zuordnung nicht weg', () => {
    expect(groupPresets(all, 'cam-1', existing).unassigned).toContain(legacy);
  });

  it('behandelt Presets geloeschter Kameras als unzugeordnet', () => {
    // Nach dem Laden eines anderen Projekts haben alle Kameras neue Ids —
    // stilles Loeschen waere Datenverlust.
    expect(groupPresets(all, 'cam-1', existing).unassigned).toContain(orphan);
  });

  it('zeigt bei jeder Kamera deren eigene Presets', () => {
    expect(groupPresets(all, 'cam-2', existing).own).toEqual([foreign]);
  });

  it('kommt ohne ausgewaehlte Kamera klar', () => {
    const g = groupPresets(all, null, existing);
    expect(g.own).toEqual([]);
    expect(g.unassigned).toEqual([legacy, orphan]);
  });

  it('laesst die Reihenfolge unangetastet', () => {
    const g = groupPresets([preset('x'), preset('y')], 'cam-1', existing);
    expect(g.unassigned.map((p) => p.id)).toEqual(['x', 'y']);
  });
});

describe('assignPreset', () => {
  it('ordnet genau ein Preset zu', () => {
    const next = assignPreset([preset('a'), preset('b')], 'a', 'cam-3');
    expect(next[0].cameraId).toBe('cam-3');
    expect(next[1].cameraId).toBeUndefined();
  });

  it('mutiert die Liste nicht', () => {
    const list = [preset('a')];
    assignPreset(list, 'a', 'cam-3');
    expect(list[0].cameraId).toBeUndefined();
  });

  it('ignoriert unbekannte Ids', () => {
    const list = [preset('a')];
    expect(assignPreset(list, 'gibtsnicht', 'cam-3')).toEqual(list);
  });
});

describe('copyPresetToCamera', () => {
  it('legt eine Kopie fuer die andere Kamera an, das Original bleibt', () => {
    const next = copyPresetToCamera([preset('a', { cameraId: 'cam-1' })], 'a', 'cam-2', 'neu', ' (CAM 2)');
    expect(next).toHaveLength(2);
    expect(next[0].cameraId).toBe('cam-1');
    expect(next[1]).toMatchObject({ id: 'neu', cameraId: 'cam-2', name: 'Preset a (CAM 2)' });
  });

  it('tut nichts bei unbekannter Id', () => {
    const list = [preset('a')];
    expect(copyPresetToCamera(list, 'x', 'cam-2', 'neu')).toEqual(list);
  });
});

describe('hasPose', () => {
  it('erkennt Presets mit Position im Raum', () => {
    expect(hasPose(preset('a', { pan: 30 }))).toBe(true);
    expect(hasPose(preset('a', { x: 4 }))).toBe(true);
    expect(hasPose(preset('a', { z: 1.5 }))).toBe(true);
  });

  it('meldet rein optische Presets als ohne Position', () => {
    expect(hasPose(preset('a'))).toBe(false);
  });
});
