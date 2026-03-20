import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { UnsubscribePage } from './pages/UnsubscribePage';
import { DataDeletionRequestPage } from './pages/DataDeletionRequestPage';
import { DataExportRequestPage } from './pages/DataExportRequestPage';
import { PWAService } from './lib/services/pwaService';
import { OfflineSyncService } from './lib/services/offlineSyncService';
import { AccessibilityService } from './lib/services/accessibilityService';
import './index.css';

// Initialiser la PWA
if ('serviceWorker' in navigator) {
  PWAService.registerServiceWorker();
  PWAService.initialize();
  OfflineSyncService.initialize();
}

// Initialiser l'accessibilité
AccessibilityService.initialize();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Pages publiques (sans authentification) */}
        <Route path="/unsubscribe" element={<UnsubscribePage />} />
        <Route path="/preferences" element={<UnsubscribePage />} />
        <Route path="/gdpr/deletion" element={<DataDeletionRequestPage />} />
        <Route path="/gdpr/export" element={<DataExportRequestPage />} />
        {/* Application principale */}
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);