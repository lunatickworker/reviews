import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Chrome 확장 오류 필터링
window.addEventListener('error', (e) => {
  if (e && (e.filename?.includes('chrome-extension') || e.message?.includes('Origin not allowed'))) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  if (e && (e.reason?.message?.includes('chrome-extension') || String(e.reason).includes('Origin not allowed'))) {
    e.preventDefault();
    return false;
  }
}, true);

// console 오류 필터링
const originalError = console.error;
console.error = function(...args) {
  if (args[0] && (String(args[0]).includes('chrome-extension') || String(args[0]).includes('Origin not allowed'))) {
    return;
  }
  originalError.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
