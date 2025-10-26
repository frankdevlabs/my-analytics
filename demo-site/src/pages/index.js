import * as React from 'react'
import { Link } from 'gatsby'
import Layout from '../components/Layout'

const IndexPage = () => {
  const handleCtaClick = (e) => {
    // Track CTA button click before navigating
    if (typeof window !== 'undefined' && window.trackEvent) {
      window.trackEvent('button_click', {
        button_id: 'hero-cta',
        page: 'home',
        target: '/demo'
      })
      console.log('Hero CTA click tracked')
    }
  }

  return (
    <Layout pageTitle="Welcome">
      <section className="hero-section">
        <h2 className="hero-title">My Analytics Demo Site</h2>
        <p className="hero-description">
          Welcome to the My Analytics demonstration website. This site showcases
          comprehensive tracking capabilities for modern web analytics.
        </p>

        <div className="features-overview">
          <h3>What This Site Demonstrates</h3>
          <ul>
            <li>Automatic pageview tracking across all pages</li>
            <li>Custom event tracking for user interactions</li>
            <li>UTM campaign parameter capture and tracking</li>
            <li>Multi-page session tracking and analytics</li>
          </ul>
        </div>

        <div className="cta-section">
          <Link
            to="/demo"
            className="btn btn-primary"
            onClick={handleCtaClick}
          >
            Try Demo
          </Link>
          <Link to="/about" className="btn btn-secondary">
            Learn More
          </Link>
        </div>
      </section>
    </Layout>
  )
}

export default IndexPage

export const Head = () => (
  <>
    <title>Home | My Analytics Demo</title>
    <meta name="description" content="Demonstration website showcasing My Analytics tracking capabilities including pageview tracking, custom events, and UTM parameters." />
  </>
)
