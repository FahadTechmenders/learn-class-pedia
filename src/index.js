import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { clearExpiredCache, getCacheStats } from './utils/fileCache';

// Preload document rendering libraries to speed up first load
// This initializes the libraries in the background before user interaction
Promise.all([
  import('epubjs'),
  import('pdfjs-dist'),
  import('docx-preview')
]).then(() => {
  console.log('[Preload] Document rendering libraries loaded and ready');
}).catch((err) => {
  console.warn('[Preload] Failed to preload libraries:', err);
});

// Clean up expired cache entries on startup
clearExpiredCache().then(() => {
  getCacheStats().then(stats => {
    console.log('[FileCache] Cache stats:', stats);
  });
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
  <App />
 </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
