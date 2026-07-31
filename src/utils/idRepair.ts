// Ids beim Laden eines Plans in Ordnung bringen (#72).
//
// Der Fehler: `applyProjectFile` setzte die Id-Zaehler auf 1 zurueck, behielt
// aber die Ids der geladenen Objekte. Der naechste "Hinzufuegen"-Klick vergab
// damit eine Id, die es im Plan schon gab. Beide Objekte hingen ab da am
// selben Datensatz — das alte sprang an die Position des neuen, und in der
// 3D-Ansicht verschwand eines davon, weil React zwei gleiche Keys nicht
// nebeneinander rendert (in 2D blieben beide sichtbar). Genau das beschreibt
// die Meldung.
//
// Zwei Regeln beheben das dauerhaft:
//   1. Zaehler hinter die hoechste vergebene Nummer setzen — neue Ids koennen
//      nicht mehr mit geladenen kollidieren.
//   2. Doppelte Ids INNERHALB der Datei reparieren — Plaene, die vor dem Fix
//      gespeichert wurden, tragen den Schaden schon in sich.
//
// Ids bleiben dabei erhalten, wo sie eindeutig sind. Das ist wichtig, weil
// ausserhalb des Plans darauf verwiesen wird: Shots, Takes und Presets haengen
// an `VenueCamera.id`, der Fokus-Lock an `ReferencePerson.id`. Ein pauschales
// Neuvergeben (wie es fuer Kameras passierte) macht diese Verweise wertlos.

/** Hoechste Zahl am Ende der Ids (`cam-12` → 12). 0, wenn keine passt. */
export function maxIdSuffix(ids: Iterable<string>): number {
  let max = 0;
  for (const id of ids) {
    const m = /-(\d+)$/.exec(id);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max;
}

export interface DedupeResult<T> {
  items: T[];
  /** Wie viele Eintraege eine neue Id bekommen haben. */
  repaired: number;
}

/**
 * Macht Ids innerhalb einer Liste eindeutig. Der ERSTE Eintrag einer Id behaelt
 * sie — so bleibt der Verweis, den ein Fokus-Lock oder ein Shot schon haelt,
 * auf einem existierenden Objekt stehen. Nachfolgende Dubletten bekommen eine
 * frische Id.
 */
export function dedupeIds<T extends { id: string }>(
  items: T[],
  makeId: () => string,
): DedupeResult<T> {
  const seen = new Set<string>();
  let repaired = 0;
  const out = items.map((item) => {
    if (!item.id || seen.has(item.id)) {
      repaired += 1;
      let next = makeId();
      // Der Generator koennte selbst eine schon belegte Id liefern.
      while (seen.has(next)) next = makeId();
      seen.add(next);
      return { ...item, id: next };
    }
    seen.add(item.id);
    return item;
  });
  return { items: out, repaired };
}
