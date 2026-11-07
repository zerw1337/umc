import { useEffect, useState } from 'react'


const Logs = () => {
    const [logs, setLogs] = useState([])

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        // 1. слушаем сообщения от SW
        function onMessage(event) {
            const data = event.data
            if (data?.type === 'LOGS_ALL') {
                setLogs(data.entries)
            }
            if (data?.type === 'LOG_ENTRY') {
                setLogs((prev) => [...prev, data.entry])
            }
        }
        navigator.serviceWorker.addEventListener('message', onMessage)

        // 2. просим SW прислать весь накопленный журнал
        navigator.serviceWorker.ready.then((registration) => {
            registration.active?.postMessage({ type: 'GET_LOGS' })
        })

        return () => navigator.serviceWorker.removeEventListener('message', onMessage)
    }, [])

    function clearLogs() {
        navigator.serviceWorker.ready.then((registration) => {
            registration.active?.postMessage({ type: 'CLEAR_LOGS' })
        })
    }

    return (
        <div className="logs--section">
            <div className="logs--toolbar">
                <h3>Журнал Service Worker ({logs.length})</h3>
                <button onClick={clearLogs}>Очистить</button>
            </div>

            {logs.length === 0 && <p>Журнал пуст.</p>}

            <ul className="logs--list">
                {[...logs].reverse().map((log) => (
                    <li key={log.id} className={`logs--item logs--${log.type}`}>
                        <span className="logs--time">
                            {new Date(log.time).toLocaleTimeString()}
                        </span>
                        <span className="logs--type">{log.type}</span>
                        <span className="logs--source">{log.source}</span>
                        <span className="logs--message">{log.message}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default Logs
