import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register Progressive Web App (PWA) Service Worker
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('ServiceWorker registered with scope: ', reg.scope))
      .catch(err => console.log('ServiceWorker registration failed: ', err));
  });
} else if ('serviceWorker' in navigator) {
  // Register in dev for testing too
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('ServiceWorker registered (Dev): ', reg.scope))
    .catch(err => console.log('ServiceWorker registration failed (Dev): ', err));
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
