import { useState } from 'react'
import {BrowserRouter as Router, Route, Link, Routes} from 'react-router-dom'

import Header from './components/Header.jsx'
import SideMenu from './components/SideMenu.jsx'

import AnimatedRoutes from './components/AnimatedRoutes.jsx'

import '../styles.js'

function App() {

    const [isOpenMenu, setIsOpenMenu] = useState(false)

    function toggleOpenHeaderMenu() {
        setIsOpenMenu(!isOpenMenu)
    }

  return (
      <>
          <Router>
              <div className='layout'>
                  <SideMenu isOpenMenu={isOpenMenu} toggleOpenHeaderMenu={toggleOpenHeaderMenu}/>
                  <div className='content'>
                      <Header toggleOpenHeaderMenu={toggleOpenHeaderMenu} />
                      <AnimatedRoutes />
                  </div>
              </div>
          </Router>
      </>
  )
}

export default App
