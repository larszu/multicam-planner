// ───────────────────────────────────────────────────────────────────────────
// Zusammenfuehren beim Lager-Import im Modus „merge".
//
// ADR-005, Regel 2: eine Projektion darf nicht ueberschreiben. Der Import
// nahm den eingehenden Datensatz bisher ALS GANZES:
//
//   for (const x of add) byId.set(x.id, x)
//
// Damit loescht eine aeltere Datei still, was sie nicht kennt. Konkret: eine
// v1-Datei (vor ADR-002) traegt keine `deviceTypeId`. Steht im lokalen Lager
// derselbe Artikel MIT bestaetigter Typ-Identitaet, ist sie nach dem Import
// weg — und mit ihr die autoritative Aufloesung auf das Datenblatt.
//
// Zeichengleich zu cable-planner src/renderer/lib/inventoryMerge.ts (bis auf
// die Semikolon-Konvention): das Format ist app-uebergreifend, also muss auch
// sein Zusammenfuehren in allen drei Apps dasselbe tun.
//
// Was die Datei nicht sagt, sagt nichts — und loescht nichts. Wer den
// Datensatz wirklich ersetzen will, nimmt den Modus „replace".
// ───────────────────────────────────────────────────────────────────────────

/**
 * `over` ueber `base` legen, aber nur dort, wo `over` einen Wert HAT.
 * `undefined` heisst „keine Aussage", nicht „loeschen".
 */
export const mergeDefined = <T extends object>(base: T, over: T): T => {
  const out = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(over)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
};

/**
 * Eingehende Datensaetze in den Bestand mischen: bekannte Ids feldweise
 * fortschreiben, unbekannte anhaengen.
 */
export const mergeById = <T extends { id: string }>(base: T[], add: T[]): T[] => {
  const byId = new Map(base.map((x) => [x.id, x]));
  for (const incoming of add) {
    const existing = byId.get(incoming.id);
    byId.set(incoming.id, existing ? mergeDefined(existing, incoming) : incoming);
  }
  return [...byId.values()];
};
