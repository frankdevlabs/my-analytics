import * as React from 'react'
import { Link } from 'gatsby'
import Layout from '../components/Layout'

const AboutPage = () => {
  return (
    <Layout pageTitle="About">
      <section className="about-section">
        <h2>Tracking Features</h2>
        <p>
          This demonstration website showcases the core capabilities of My Analytics,
          a modern web analytics platform designed for tracking user behavior and interactions.
        </p>

        <div className="features-list">
          <h3>What We're Demonstrating</h3>

          <div className="feature-item">
            <h4>Pageview Tracking</h4>
            <p>
              Automatic tracking of initial page loads and single-page application (SPA)
              route changes. Every navigation event is captured and sent to the analytics backend.
            </p>
          </div>

          <div className="feature-item">
            <h4>Custom Event Tracking</h4>
            <p>
              Track specific user interactions like button clicks and form submissions.
              Custom events provide detailed insights into how users interact with your site.
            </p>
          </div>

          <div className="feature-item">
            <h4>UTM Parameter Tracking</h4>
            <p>
              Automatically extract and track campaign parameters (utm_source, utm_medium, utm_campaign)
              from URLs to measure marketing campaign effectiveness.
            </p>
          </div>

          <div className="feature-item">
            <h4>Session Tracking</h4>
            <p>
              Maintain consistent session identifiers across multiple pages to understand
              user journeys and behavior patterns throughout their visit.
            </p>
          </div>
        </div>

        <div className="cta-section">
          <p>Ready to see it in action?</p>
          <Link to="/demo" className="btn btn-primary">
            Try Interactive Demo
          </Link>
        </div>
      </section>
    </Layout>
  )
}

export default AboutPage

export const Head = () => (
  <>
    <title>About | My Analytics Demo</title>
    <meta name="description" content="Learn about the tracking features demonstrated on this site including pageview tracking, custom events, UTM parameters, and session tracking." />
  </>
)
