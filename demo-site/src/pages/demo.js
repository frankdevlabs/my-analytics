import * as React from 'react'
import { Link } from 'gatsby'
import Layout from '../components/Layout'

const DemoPage = () => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleButtonClick = (e) => {
    // Track button click event
    if (typeof window !== 'undefined' && window.trackEvent) {
      window.trackEvent('button_click', {
        button_id: 'demo-track-button',
        page: 'demo'
      })
      console.log('Button click tracked: demo-track-button')
    } else {
      console.warn('trackEvent not available yet. Ensure the tracking script has loaded.')
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()

    // Track form submission event
    if (typeof window !== 'undefined' && window.trackEvent) {
      window.trackEvent('form_submit', {
        form_type: 'demo',
        has_name: !!formData.name,
        has_email: !!formData.email
      })
      console.log('Form submission tracked: demo form', formData)
    } else {
      console.warn('trackEvent not available yet. Ensure the tracking script has loaded.')
    }

    // Reset form
    setFormData({ name: '', email: '' })

    // Show confirmation message
    alert('Demo form submitted! Check the analytics dashboard to see the tracked event.')
  }

  return (
    <Layout pageTitle="Interactive Demo">
      <section className="demo-section">
        <h2>Try the Tracking Features</h2>
        <p>
          This page contains interactive elements that demonstrate custom event tracking.
          Each interaction you make will be tracked and sent to the analytics backend.
        </p>

        <div className="demo-instructions">
          <h3>What to Test</h3>
          <ul>
            <li>Click the trackable button below to fire a custom event</li>
            <li>Submit the demo form to track form submissions</li>
            <li>Navigate between pages to see session tracking in action</li>
            <li>
              Try adding UTM parameters to the URL:{' '}
              <code>?utm_source=demo&utm_medium=test&utm_campaign=tracking</code>
            </li>
          </ul>
        </div>

        <div className="demo-interactions">
          <div className="demo-card">
            <h3>Button Click Tracking</h3>
            <p>Click this button to generate a custom tracking event:</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleButtonClick}
              id="demo-track-button"
            >
              Track This Click
            </button>
            <p className="demo-note">
              <small>Check your browser console and analytics dashboard to see the event.</small>
            </p>
          </div>

          <div className="demo-card">
            <h3>Form Submission Tracking</h3>
            <p>Submit this form to track a form submission event:</p>
            <form onSubmit={handleFormSubmit} className="demo-form">
              <div className="form-group">
                <label htmlFor="demo-name">Your Name:</label>
                <input
                  type="text"
                  id="demo-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="Enter your name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="demo-email">Email Address:</label>
                <input
                  type="email"
                  id="demo-email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="you@example.com"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Submit Form
              </button>
            </form>
            <p className="demo-note">
              <small>Form data is not stored - this is for tracking demonstration only.</small>
            </p>
          </div>

          <div className="demo-card">
            <h3>Session Tracking</h3>
            <p>
              Navigate between pages to see how session tracking maintains a consistent
              session ID across your journey.
            </p>
            <div className="demo-links">
              <Link to="/" className="btn btn-secondary">Homepage</Link>
              <Link to="/about" className="btn btn-secondary">About</Link>
              <Link to="/contact" className="btn btn-secondary">Contact</Link>
            </div>
            <p className="demo-note">
              <small>Check browser sessionStorage to see the session ID.</small>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export default DemoPage

export const Head = () => (
  <>
    <title>Demo | My Analytics Demo</title>
    <meta name="description" content="Interactive demo page with trackable buttons, forms, and navigation to test My Analytics tracking capabilities." />
  </>
)
