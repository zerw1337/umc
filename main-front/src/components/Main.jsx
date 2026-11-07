import BASEURL from '../../BASEURL.js'


const apps = [
    {
        title: 'Basic PWA',
        description: 'Установка на устройство, офлайн-режим и service worker',
        href: `${BASEURL}/basic-pwa/`,
        icon: '📱',
    },
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
        </main>
    )
}

export default Main