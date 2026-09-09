/** DE-Overrides: Rig-Steuerung (Fahrten, Tastenlegende). Keys: rig.* */
//
// Diese Datei ist mit B-61 entstanden: die Rig-Steuerung war eine der
// Stellen, an denen deutscher Text fest im JSX stand, obwohl die Quellsprache
// dieses Repos `en` ist (E-20). Wer Englisch wählte, bekam eine Oberfläche,
// in der die Kamera-Karte englisch und die Rig-Steuerung deutsch war.
//
// Der deutsche Text ist Zeichen für Zeichen der, der vorher im JSX stand —
// die Wicklung soll für den deutschen Nutzer unsichtbar sein.
export const rig: Record<string, string> = {
  'rig.noCamera': 'Keine Kamera vorhanden — links im Panel „Cameras" eine anlegen.',
  'rig.keys.title': 'Tastatur-Steuerung scharf schalten. Aus, wenn die Tasten woanders gebraucht werden.',
  'rig.panTilt.hint': 'Ziehen schwenkt und neigt — gleichzeitig mit der Fahrt möglich.',
  'rig.height': 'Höhe',
  'rig.play': 'Abspielen',
  'rig.rename': 'Fahrt benennen',
  'rig.delete': 'Fahrt löschen',
  'rig.storageFull': 'Der Speicher ist voll — die letzte Fahrt konnte nicht gesichert werden. Ältere Fahrten löschen.',
  'rig.noTakes': 'Noch keine Fahrt aufgezeichnet. „Fahrt aufzeichnen" drücken, fahren, „Stop" — die Bewegung lässt sich danach beliebig oft abspielen.',
  'rig.takesFor': '{count} Fahrt(en) für {name}',
  'rig.otherTakes': '{count} weitere Fahrt(en) gehören zu anderen Kameras.',

  // Die Tastenlegende. Ein Schlüssel je Wort und nicht einer für den ganzen
  // Satz: die fetten Tastenkürzel dazwischen sind Markup, kein Text — sie in
  // einen Schlüssel zu ziehen hiesse, HTML ins Wörterbuch zu schreiben.
  'rig.keys': 'Tasten',
  'rig.key.track': 'Fahrweg',
  'rig.key.pan': 'Pan',
  'rig.key.tilt': 'Tilt',
  'rig.key.height': 'Höhe',
  'rig.key.align': 'Rig ausrichten',
  'rig.key.zoom': 'Zoom',
  'rig.key.park': 'parken',
  'rig.key.speed': 'Tempo',
  'rig.keys.hint': 'Mehrere Tasten gleichzeitig fahren mehrere Achsen zusammen.',
};
