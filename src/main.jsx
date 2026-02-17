import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import ErrorBoundary from './components/ErrorBoundary';
import { PageLoader } from './components/ui/Loader';
import './index.css';
import App from './App.jsx';

/** Shown while Redux rehydrates from storage — avoids dark blank screen on refresh */
function RehydrateFallback() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      <PageLoader size="lg" label="Loading…" />
    </div>
  );
}

function renderApp() {
  const el = document.getElementById('root');
  if (!el) return;
  const root = createRoot(el);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <Provider store={store}>
          <PersistGate loading={<RehydrateFallback />} persistor={persistor}>
            <App />
          </PersistGate>
        </Provider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

try {
  renderApp();
} catch (err) {
  const el = document.getElementById('root');
  if (el) {
    el.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff;font-family:system-ui;padding:1rem;text-align:center">' +
      '<div><p style="color:#dc2626;font-weight:600;margin-bottom:0.5rem">Something went wrong</p>' +
      '<p style="color:#64748b;font-size:0.875rem">Open the browser console (F12) for details.</p></div></div>';
  }
  console.error('App failed to mount:', err);
}
