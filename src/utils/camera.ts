import type { VenueCamera } from '../types';

/**
 * Effective camera position once the live-motion track slider (jib / dolly)
 * is applied. The "parked" position is `cam.x` / `cam.y`; the track shifts
 * along the camera's current look direction (so a positive offset is "track
 * in" for a dolly, "extend" for a jib). Returns the unmodified parked
 * position when no offset is set.
 */
export function effectiveCameraPos(cam: VenueCamera): { x: number; y: number } {
  const offset = cam.trackOffset ?? 0;
  if (!offset) return { x: cam.x, y: cam.y };
  const panRad = (cam.pan * Math.PI) / 180;
  return {
    x: cam.x + Math.cos(panRad) * offset,
    y: cam.y + Math.sin(panRad) * offset,
  };
}
