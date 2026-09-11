/** DE-Overrides: Menueleiste und Einstellungen-Dialog (die Kopfzeile im
 *  Schnitt der Suite, ADR-007 Abschnitt 6).
 *  Keys: app.menu.*, settings.*, plus die Datei-Eintraege unter header.* */
export const chrome: Record<string, string> = {
  // ── Die fuenf Menues. Dieselben Woerter wie im Cable Planner, damit
  //    jemand, der zwischen zwei Werkzeugen wechselt, dasselbe liest.
  'app.menu.file': 'Datei',
  'app.menu.edit': 'Bearbeiten',
  'app.menu.tools': 'Werkzeuge',
  'app.menu.view': 'Ansicht',
  'app.menu.help': 'Hilfe',

  // ── Datei ──
  'header.new': 'Neues Projekt',
  'header.new.note': 'Leerer Raum, keine Kameras',
  'header.new.confirm': 'Neues Projekt — das aktuelle wird ersetzt. Fortfahren?',
  'header.open': 'Öffnen…',
  'header.save': 'Speichern',
  'header.saveAs': 'Speichern unter…',
  'header.saveAs.note': 'Fragt nach dem Dateinamen',
  'header.saveAs.prompt': 'Dateiname',
  'header.avplanImport': 'Gesamtprojekt einlesen…',
  'header.avplanExport': 'Gesamtprojekt ausgeben',
  'header.venueImport': 'Raum einlesen…',
  'header.venueExport': 'Raum ausgeben',
  'header.camerasExport': 'Kameras → Cable Planner',

  // ── Werkzeuge ──
  'header.inventory': 'Lager / Bestand…',
  'header.inventory.note': 'Projektübergreifender Bestand: QR/Barcode, Cases, appübergreifend',

  // ── Ansicht ──
  'header.layout': 'Anordnung',

  // ── Hilfe ──
  'header.about': 'Über MultiCam Planner…',

  // ── Einstellungen ──
  'settings.title': 'Einstellungen',
  'settings.close': 'Einstellungen schliessen',
  'settings.language': 'Sprache',
  'settings.language.desc':
    'Englisch ist die Quellsprache, Deutsch eine Übersetzung. Ein fehlender Eintrag fällt auf Englisch zurück.',
  'settings.about': 'Über',
  'settings.about.suite':
    'Teil der AV-Planner-Suite — Kamerapositionen, Objektive, Deckung und Schichtübergabe.',
};
