// Отправка записи в журнал SW (SW сохранит её в IndexedDB и разошлёт страницам)
export function logToSW(message, logType = 'client') {
    if (!('serviceWorker' in navigator)) return

    const worker = navigator.serviceWorker.controller
    if (worker) {
        worker.postMessage({ type: 'CLIENT_LOG', logType, message })
        return
    }

    // страница ещё не под контролем SW (первая загрузка) - ждём активный SW
    navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({ type: 'CLIENT_LOG', logType, message })
    })
}