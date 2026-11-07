import SideMenuList from "./SideMenuList.jsx";

const SideMenu = ({isOpenMenu, toggleOpenHeaderMenu}) => {
    return (
        <div className={`side--menu--block${isOpenMenu ? ' open' : ''}`}>
            <SideMenuList toggleOpenHeaderMenu={toggleOpenHeaderMenu}/>
        </div>
    )
}

export default SideMenu