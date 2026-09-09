/** DE-Overrides: Lager / Bestand (InventoryDialog). Keys: inventory.* */
export const inventory: Record<string, string> = {
  'inventory.title': 'Lager / Bestand',
  'inventory.close': 'Schließen',
  'inventory.scanPlaceholder': 'Code scannen / eingeben (Artikel, Lagerort, Einheit)…',
  'inventory.resolve': 'Auflösen',
  'inventory.export': 'Export',
  'inventory.export.title': 'Export (App-übergreifend)',
  'inventory.import': 'Import',
  'inventory.import.title': 'Import',
  'inventory.addItem': 'Artikel',
  'inventory.editItem': 'Artikel bearbeiten',
  'inventory.newItem': 'Neuer Artikel',
  'inventory.field.model': 'Modell *',
  'inventory.field.manufacturer': 'Hersteller',
  'inventory.field.category': 'Kategorie',
  'inventory.field.quantity': 'Menge',
  'inventory.field.code': 'Code',
  'inventory.field.ownership': 'Eigentum',
  'inventory.ownership.none': '—',
  'inventory.ownership.owned': 'Eigentum',
  'inventory.ownership.rented': 'gemietet',
  'inventory.ownership.subhire': 'Sub-Miete',
  'inventory.cancel': 'Abbrechen',
  'inventory.save': 'Speichern',
  'inventory.empty': 'Noch keine Lager-Artikel. Lege welche an oder importiere ein Lager aus Cable/Light Planner.',
  'inventory.col.model': 'Modell',
  'inventory.col.quantity': 'Menge',
  'inventory.col.code': 'Code',
  'inventory.col.ownership': 'Eigentum',
  'inventory.edit': 'Edit',
  'inventory.delete': 'Löschen',
  'inventory.extras': '+ {nodes} Lagerorte/Cases · {units} serialisierte Einheiten (aus Import, verlustfrei erhalten)',
  'inventory.import.invalid': 'Keine gültige Lager-Datei (avplan-inventory).',
  // DIE FRAGE IST WEG, DIE VORSCHAU HAT SIE ABGELÖST (E-15, multicam#111).
  //
  // Hier standen fünf Schlüssel für den `choiceDialog` aus `suite#154`:
  // `import.replaceTitle`, `import.replaceBody`, `import.replace`,
  // `import.merge` und `import.cancelled`. Das war das Zwischenmaß — es hat
  // verhindert, dass Escape und der Klick daneben zusammenführen, aber
  // gefragt hat es immer noch, bevor jemand sehen konnte, worüber er
  // entscheidet. Genau dafür war es angekündigt: „bleibt, bis die Vorschau es
  // ablöst". Ein Schlüssel ohne Aufrufer ist eine Übersetzung für einen Knopf,
  // den es nicht gibt.
  'inventory.import.full': '{count} Objekte gelesen, aber NICHT gespeichert: der lokale Speicher ist voll. Erst Platz schaffen, dann erneut importieren.',
  'inventory.import.done': '{count} Objekte importiert.',

  // ── Import-Vorschau (E-15) ───────────────────────────────────────────────
  'inventory.preview.title': 'Was dieser Import ändert',
  'inventory.preview.merge': 'Zusammenführen',
  'inventory.preview.replace': 'Ersetzen',
  'inventory.preview.mergeHint': 'Fortschreiben — es fällt nichts weg.',
  'inventory.preview.replaceHint': 'Der bisherige Bestand wird verworfen.',
  'inventory.preview.new': 'neu',
  'inventory.preview.changed': 'geändert',
  'inventory.preview.same': 'unverändert',
  'inventory.preview.removed': 'entfällt',
  'inventory.preview.untouched': 'bleibt',
  'inventory.preview.cancel': 'Abbrechen',
  'inventory.preview.apply': 'Importieren',
  'inventory.preview.removes': '{count} vorhandene Datensätze fallen weg. Das lässt sich nicht rückgängig machen.',
  'inventory.preview.nothing': 'Diese Datei ändert nichts am Bestand.',
  'inventory.preview.items': 'Artikel',
  'inventory.preview.nodes': 'Lagerorte / Cases',
  'inventory.preview.sets': 'Sets',
  'inventory.preview.units': 'Einheiten',

  'inventory.scan.noMatch': 'Kein Treffer für „{code}".',
  'inventory.scan.item': 'Artikel: {model}',
  'inventory.scan.node': 'Lagerort: {name}',
  'inventory.scan.unit': 'Einheit: {label}',
};
