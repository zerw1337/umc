


const apps = [
    {
        title: 'Basic PWA',
        description: 'Basic PWA lab',
        href: '/basic-pwa/',
        icon: '📱',
    },
    {
        title: 'Music List',
        description: 'Музыкальный проигрыватель',
        href: '/music-pwa/',
        icon: '🎵',
    },
    {
        title: 'Cordova Choicer Android APK',
        description: 'APK Choicer [OnsenUI]',
        href: '/downloads/choicer.apk',
        icon: '⬇️',
    },
    {
        title: 'Mobile Status Android APK',
        description: 'Инфв о устройстве, батарея, гео',
        href: '/downloads/mobile_status.apk',
        icon: '⬇️',
    },
]

const links = [
    { title: 'GitHub', href: 'https://github.com/zerw1337/umc', icon: '🐙' },
    { title: 'Музыка загрузка на локалке', href: '/downloads/music.mp4', icon: '🐙' },
    { title: 'Проект Choicer', href: '/downloads/Choicer.zip', icon: '🐙' },
    { title: 'Проект MobileStatus', href: '/downloads/MobileStatus.zip', icon: '🐙' },

]

const Main = () => {
    return (
        <main className="main">
            <header className="main__hero">
                <h1 className="main__title">Приложения</h1>
            </header>

            <ul className="main__grid">
                {apps.map((app) => (
                    <li key={app.href}>
                        <a className="card" href={app.href}>
                            <span className="card__icon">{app.icon}</span>
                            <span className="card__body">
                                <span className="card__title">{app.title}</span>
                                <span className="card__desc">{app.description}</span>
                            </span>
                            <span className="card__arrow" aria-hidden="true">→</span>
                        </a>
                    </li>
                ))}
            </ul>

            <footer className="main__links">
                <h2 className="main__subtitle">Ссылки</h2>
                <ul className="main__linklist">
                    {links.map((l) => (
                        <li key={l.href}>
                            <a href={l.href} target="_blank" rel="noopener noreferrer">
                                <span aria-hidden="true">{l.icon}</span> {l.title}
                            </a>
                        </li>
                    ))}
                </ul>
            </footer>

        </main>

    )
}

export default Main