import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'


import './index.css'
import App from './App.jsx'


window.deferredInstallPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    window.deferredInstallPrompt = e
    window.dispatchEvent(new Event('install-available'))
})


createRoot(document.getElementById('root')).render(
  <StrictMode>
          <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
            .then((registration) => {
                console.log('Service Worker зарегистрирован:', registration.scope);
            })
            .catch((error) => {
                console.error('Ошибка регистрации Service Worker:', error);
            });
    });
}