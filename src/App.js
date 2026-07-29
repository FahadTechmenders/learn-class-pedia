import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminApp from './pages/Admin/AdminApp';
import { ToastProvider } from './components/ToastProvider';
import { registerServiceWorker } from './utils/serviceWorkerManager';
import './utils/cacheDebug';
import './utils/cacheInvestigator';

function App() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <ToastProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="*" element={<Navigate to="/admin/login" replace />} />
          </Routes>

        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
