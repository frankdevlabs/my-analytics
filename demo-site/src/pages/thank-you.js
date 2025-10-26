import * as React from 'react'
import { Link } from 'gatsby'
import Layout from '../components/Layout'

const ThankYouPage = () => {
  return (
    <Layout pageTitle="Thank You">
      <section className="thank-you-section">
        <div className="thank-you-message">
          <h2>Thank You!</h2>
          <p>
            Your message has been received. We appreciate you taking the time to
            contact us about My Analytics.
          </p>
          <p>
            This confirmation page is part of the tracking demonstration. The form
            submission event has been tracked and recorded in the analytics system.
          </p>
        </div>

        <div className="next-steps">
          <h3>What's Next?</h3>
          <p>Continue exploring the demo site to see more tracking features in action:</p>

          <div className="navigation-cards">
            <div className="nav-card">
              <h4>Try the Demo</h4>
              <p>Interact with trackable buttons and forms</p>
              <Link to="/demo" className="btn btn-primary">
                Go to Demo
              </Link>
            </div>

            <div className="nav-card">
              <h4>Learn More</h4>
              <p>Discover all the tracking features</p>
              <Link to="/about" className="btn btn-secondary">
                View Features
              </Link>
            </div>

            <div className="nav-card">
              <h4>Start Over</h4>
              <p>Return to the homepage</p>
              <Link to="/" className="btn btn-secondary">
                Back to Home
              </Link>
            </div>
          </div>
        </div>

        <div className="tracking-info">
          <h3>Tracking Information</h3>
          <p>
            <small>
              This page navigation was tracked as a pageview. If you open your browser's
              developer tools and check the Network tab or Console, you can see the tracking
              requests being sent to the analytics backend.
            </small>
          </p>
        </div>
      </section>
    </Layout>
  )
}

export default ThankYouPage

export const Head = () => (
  <>
    <title>Thank You | My Analytics Demo</title>
    <meta name="description" content="Thank you for your submission. This confirmation page demonstrates pageview tracking in the My Analytics demo site." />
  </>
)
