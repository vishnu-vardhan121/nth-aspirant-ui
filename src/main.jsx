import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import './index.css';
import App from './App.jsx';

/** Shown while Redux rehydrates from storage — avoids dark blank screen on refresh */
function RehydrateFallback() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      <div className="text-slate-500 text-sm font-medium">Loading…</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={<RehydrateFallback />} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>,
);
