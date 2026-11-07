import HeaderButton from './HeaderButton'
import HeaderTitle from './HeaderTitle'
import InstallButton from "./InstallButton.jsx";

const Header = ({toggleOpenHeaderMenu}) => {

    return (
        <div className="header">
            <HeaderButton toggleOpenHeaderMenu={toggleOpenHeaderMenu} />
            <HeaderTitle/>
            <InstallButton/>
        </div>
    )
}


export default Header