import { useEffect, useState } from 'react'

function isInstalled() {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
    )
}

function InstallButton() {
    const [promptEvent, setPromptEvent] = useState(null)
    const [installed, setInstalled] = useState(isInstalled)
    const [hint, setHint] = useState('')

    useEffect(() => {
        function onBeforeInstall(e) {
            e.preventDefault()
            setPromptEvent(e)
        }
        function onInstalled() {
            setInstalled(true)
            setPromptEvent(null)
        }

        window.addEventListener('beforeinstallprompt', onBeforeInstall)
        window.addEventListener('appinstalled', onInstalled)
        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall)
            window.removeEventListener('appinstalled', onInstalled)
        }
    }, [])

    async function handleClick() {
        if (promptEvent) {
            promptEvent.prompt()
            await promptEvent.userChoice
            setPromptEvent(null)
            return
        }

        const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
        setHint(
            isIos
                ? 'Нажмите «Поделиться» в Safari и выберите «На экран “Домой”».'
                : 'Откройте меню браузера и выберите «Установить приложение».'
        )
    }

    if (installed) return null

    return (
        <div className='install--button--container'>
            <button onClick={handleClick}>Установить приложение</button>
            <br/>
            {hint && (<p>{hint}</p>)}
        </div>
    )
}

export default InstallButton