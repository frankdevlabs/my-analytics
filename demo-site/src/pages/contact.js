import * as React from 'react'
import { navigate } from 'gatsby'
import Layout from '../components/Layout'

const ContactPage = () => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    message: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Track contact form submission event
    if (typeof window !== 'undefined' && window.trackEvent) {
      window.trackEvent('form_submit', {
        form_type: 'contact',
        has_name: !!formData.name,
        has_email: !!formData.email,
        has_message: !!formData.message
      })
      console.log('Contact form submission tracked', formData)
    } else {
      console.warn('trackEvent not available yet. Ensure the tracking script has loaded.')
    }

    // Small delay to ensure tracking event is sent before navigation
    setTimeout(() => {
      // Navigate to thank you page
      navigate('/thank-you')
    }, 100)
  }

  return (
    <Layout pageTitle="Contact">
      <section className="contact-section">
        <h2>Get in Touch</h2>
        <p>
          Have questions or feedback about My Analytics? We'd love to hear from you.
          Fill out the form below and we'll get back to you soon.
        </p>

        <form onSubmit={handleSubmit} className="contact-form">
          <div className="form-group">
            <label htmlFor="contact-name">
              Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="contact-name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="form-input"
              placeholder="Your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="contact-email">
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              id="contact-email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="form-input"
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="contact-message">
              Message <span className="required">*</span>
            </label>
            <textarea
              id="contact-message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              required
              className="form-textarea"
              rows="6"
              placeholder="Tell us what you think..."
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Send Message
          </button>
        </form>

        <div className="contact-note">
          <p>
            <small>
              Note: This is a demonstration site. Form submissions trigger tracking events
              but do not send actual messages.
            </small>
          </p>
        </div>
      </section>
    </Layout>
  )
}

export default ContactPage

export const Head = () => (
  <>
    <title>Contact | My Analytics Demo</title>
    <meta name="description" content="Contact us with questions or feedback about My Analytics. This form demonstrates custom event tracking for form submissions." />
  </>
)
