// Die abgeglichenen Bibliothekseintraege als Katalogquelle — ausserhalb von
// React lesbar, damit `getCameraById` / `getLensById` sie finden, ohne dass
// jede der zwanzig Aufrufstellen eine dritte Liste durchreichen muss.
import type { Camera, Lens } from '../types';

let cameras: Camera[] = [];
let lenses: Lens[] = [];

export const libraryCameras = (): readonly Camera[] => cameras;
export const libraryLenses = (): readonly Lens[] => lenses;

export function setLibraryCatalog(next: { cameras: Camera[]; lenses: Lens[] }): void {
  cameras = next.cameras;
  lenses = next.lenses;
}
