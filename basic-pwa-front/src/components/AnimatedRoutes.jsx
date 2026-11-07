import { Routes, Route, useLocation } from 'react-router-dom'

import Home from '../pages/Home.jsx'
import Contacts from '../pages/Contacts.jsx'
import Emojis from '../pages/Emojis.jsx'
import Logs from '../pages/Logs.jsx'


const AnimatedRoutes = () => {
    const location = useLocation()

    return (
        <div className="page" key={location.pathname}>
            <Routes location={location}>
                <Route path='/' element={<Home />} />
                <Route path='/logs' element={<Logs />} />
                <Route path='/emojis' element={<Emojis />} />
                <Route path='/contacts' element={<Contacts />} />

            </Routes>
        </div>
    )
}

export default AnimatedRoutes