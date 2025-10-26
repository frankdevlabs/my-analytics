import * as React from 'react'
import { Link } from 'gatsby'

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  return (
    <header className="site-header">
      <div className="header-container">
        <div className="header-logo">
          <Link to="/">My Analytics Demo</Link>
        </div>

        <button
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <span className="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <nav className={`site-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link to="/" activeClassName="active">Home</Link>
          <Link to="/about" activeClassName="active">About</Link>
          <Link to="/demo" activeClassName="active">Demo</Link>
          <Link to="/contact" activeClassName="active">Contact</Link>
          <Link to="/thank-you" activeClassName="active">Thank You</Link>
        </nav>
      </div>
    </header>
  )
}

export default Header
