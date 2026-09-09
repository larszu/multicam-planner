/** DE-Overrides: geteilte Dialog-Labels (confirm/prompt/alert) und der
 *  Hinweis nach einer Id-Reparatur beim Laden. Keys: common.*, load.* */
export const common: Record<string, string> = {
  // Der Quelltext trug hier Deutsch als englische Quellsprache — ein
  // englischer Nutzer bekam den Hinweis auf Deutsch. Jetzt steht die
  // englische Fassung an der Aufrufstelle und die deutsche hier.
  // {count} wird vom Aufrufer ersetzt und muss stehen bleiben.
  'load.idRepair.title': '{count} doppelte Id(s) in der Projektdatei repariert.',
  'load.idRepair.hint':
    'Betroffene Objekte haben eine neue Id bekommen. Verweise darauf — Shots, Takes, Presets und Fokus-Sperren — zeigen jetzt auf das jeweils erste Objekt mit der alten Id und sind zu prüfen.',

  'common.ok': 'OK',
  'common.cancel': 'Abbrechen',
  'common.delete': 'Löschen',
  'common.reset': 'Zurücksetzen',
  'common.load': 'Laden',
  'common.restore': 'Wiederherstellen',
  'common.clearAll': 'Alles löschen',
  'store.unsupportedFormat': 'Nicht unterstütztes Projektdateiformat.',
};
