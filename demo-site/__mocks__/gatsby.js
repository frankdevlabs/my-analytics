import * as React from 'react'

// Mock Gatsby Link component
const Link = ({ to, children, activeClassName, ...rest }) => (
  <a href={to} {...rest}>{children}</a>
)

module.exports = {
  Link,
}
