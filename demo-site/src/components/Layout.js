import * as React from 'react'
import Header from './Header'
import Footer from './Footer'

const Layout = ({ children, pageTitle }) => {
  return (
    <div className="layout-wrapper">
      <Header />
      <main className="main-content">
        {pageTitle && <h1 className="page-title">{pageTitle}</h1>}
        {children}
      </main>
      <Footer />
    </div>
  )
}

export default Layout
