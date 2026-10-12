import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        {/*
          Toasts styled as part of the instrument: a squared graphite panel
          with a copper rule down its leading edge, mono type, no rounded
          pill. Errors swap the rule for the signal red that the rest of the
          system reserves for destructive outcomes.
        */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#17140F',
              color: '#F0EAE1',
              border: '1px solid #352D24',
              borderRadius: '3px',
              borderLeftWidth: '2px',
              borderLeftColor: '#D28E4E',
              fontSize: '13px',
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              maxWidth: '26rem',
            },
            success: { iconTheme: { primary: '#D28E4E', secondary: '#080706' } },
            error: {
              style: { borderLeftColor: '#C4382B' },
              iconTheme: { primary: '#C4382B', secondary: '#080706' },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
