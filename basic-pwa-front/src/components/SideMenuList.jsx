import {Link} from "react-router-dom"

const SideMenuList = ({toggleOpenHeaderMenu}) => {
    return (
        <div className="side-menu">
            <ul>
                <li onClick={() => {
                    toggleOpenHeaderMenu()
                }}>
                    <Link to='/'>Главная</Link>
                </li>
                <li onClick={() => {
                    toggleOpenHeaderMenu()
                }}>
                    <Link to='/logs'>Show logs from SW</Link>
                </li>
                <li onClick={() => {
                    toggleOpenHeaderMenu()
                }}>
                    <Link to='/emojis'>Emojis</Link>
                </li>
                <li onClick={() => {
                    toggleOpenHeaderMenu()
                }}>
                    <Link to='/Contacts'>Contacts</Link>
                </li>
            </ul>
        </div>

    )
}

export default SideMenuList

