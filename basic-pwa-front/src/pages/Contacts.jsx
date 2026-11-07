import { FaTelegram, FaGithub, FaSteam } from 'react-icons/fa'
import { SiGmail } from 'react-icons/si'

const Contacts = () => {
    return (
        <div className="contact--section">
            <h3>Иванов Г.Е.</h3>
            <p>зЛПб-ИСиТ-22-1</p>
            <ul>
                <li style={{ '--brand': '#229ED9' }}>
                    <a href="https://t.me/glebus777" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                        <FaTelegram />
                    </a>
                </li>
                <li style={{ '--brand': '#181717' }}>
                    <a href="https://github.com/zerw1337" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                        <FaGithub />
                    </a>
                </li>
                <li style={{ '--brand': '#EA4335' }}>
                    <a href="mailto:ivanovgleb2011@gmail.com" aria-label="Gmail">
                        <SiGmail />
                    </a>
                </li>
                <li style={{ '--brand': '#1B2838' }}>
                    <a href="https://steamcommunity.com/id/zerw1337" target="_blank" rel="noopener noreferrer" aria-label="Steam">
                        <FaSteam />
                    </a>
                </li>
            </ul>
        </div>
    )
}

export default Contacts