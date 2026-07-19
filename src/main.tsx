import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { loadZoom, applyZoom } from './utils/uiZoom';

// Gespeicherten UI-Zoom vor dem ersten Render anwenden (kein Flash).
applyZoom(loadZoom());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
