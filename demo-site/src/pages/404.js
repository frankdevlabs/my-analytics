import * as React from 'react'

const NotFoundPage = () => {
  return (
    <main>
      <h1>404: Page Not Found</h1>
      <p>Sorry, the page you're looking for doesn't exist.</p>
      <p>
        <a href="/">Return to home page</a>
      </p>
    </main>
  )
}

export default NotFoundPage

export const Head = () => <title>404: Not Found | My Analytics Demo</title>
