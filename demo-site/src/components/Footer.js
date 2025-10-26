import * as React from 'react'
import { Link } from 'gatsby'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <p className="footer-copyright">
          &copy; {currentYear} My Analytics Demo. Built with Gatsby.
        </p>
        <nav className="footer-nav">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/demo">Demo</Link>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
