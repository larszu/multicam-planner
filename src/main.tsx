import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { themaAnwenden } from './lib/thema';

// Das Thema VOR dem ersten Rendern setzen: sonst zeigt die App fuer einen
// Wimpernschlag das Vorgabe-Thema und springt dann um.
themaAnwenden();
import { loadZoom, applyZoom } from './utils/uiZoom';

// Gespeicherten UI-Zoom vor dem ersten Render anwenden (kein Flash).
applyZoom(loadZoom());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
