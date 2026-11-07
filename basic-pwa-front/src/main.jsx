import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'


import './index.css'
import App from './App.jsx'
import { logToSW } from './swLog.js'


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
        const swUrl = `${import.meta.env.BASE_URL}sw.js`
        logToSW(`Вызов register("${swUrl}")`, 'register')

        navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL })
            .then((registration) => {
                logToSW(`Регистрация успешна, scope: ${registration.scope}`, 'register')

                registration.addEventListener('updatefound', () => {
                    logToSW('updatefound: найдена новая версия SW', 'register')
                    const worker = registration.installing
                    worker?.addEventListener('statechange', () => {
                        logToSW(`Состояние нового SW: ${worker.state}`, 'register')
                    })
                })
            })
            .catch((error) => {
                console.error('Ошибка регистрации Service Worker:', error)
            })

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            logToSW('controllerchange: сменился SW, управляющий страницей', 'register')
        })
    })
}