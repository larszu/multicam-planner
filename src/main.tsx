import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { themaAnwenden } from './lib/thema';

// Das Thema VOR dem ersten Rendern setzen: sonst zeigt die App fuer einen
// Wimpernschlag das Vorgabe-Thema und springt dann um.
themaAnwenden();
import { loadZoom, applyZoom } from './utils/uiZoom';
import { restoreAutosave, startAutosave } from './store/autosave';

// Gespeicherten UI-Zoom vor dem ersten Render anwenden (kein Flash).
applyZoom(loadZoom());

// Das zuletzt bearbeitete Projekt zurueckholen, BEVOR gerendert wird — sonst
// zeigt die App kurz ein leeres Projekt. Die Sicherung laeuft erst danach
// an, damit das Wiederherstellen sich nicht selbst noch einmal schreibt.
restoreAutosave();
const autosave = startAutosave();
window.addEventListener('pagehide', autosave.flush);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
