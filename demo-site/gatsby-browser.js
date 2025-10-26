/**
 * Gatsby Browser APIs
 *
 * This file is where we'll implement client-side functionality including:
 * - Loading the My Analytics tracking script
 * - Tracking route changes
 * - Custom event handling
 *
 * See: https://www.gatsbyjs.com/docs/reference/config-files/gatsby-browser/
 */

// Import global styles
import './src/styles/global.css'

/**
 * Load the My Analytics tracking script
 * This is called when the initial client render completes
 */
export const onClientEntry = () => {
  // Only load tracking script in the browser
  if (typeof window !== 'undefined') {
    loadTrackingScript()
  }
}

/**
 * Track route changes for SPA navigation
 * Called when the user changes routes
 */
export const onRouteUpdate = ({ location, prevLocation }) => {
  // Only track if we have a previous location (not initial page load)
  // The tracking script will automatically handle initial page load
  if (prevLocation && typeof window !== 'undefined' && window.trackPageview) {
    // Small delay to ensure the page has updated
    setTimeout(() => {
      window.trackPageview()
    }, 50)
  }
}

/**
 * Loads the tracking script from the My Analytics server
 * Implements async/defer loading to avoid blocking page render
 */
function loadTrackingScript() {
  // Check if script is already loaded
  const existingScript = document.querySelector('script[src*="tracker.min.js"]')
  if (existingScript) {
    return
  }

  // Create script element
  const script = document.createElement('script')
  script.src = 'http://localhost:3000/tracker.min.js'
  script.async = true
  script.defer = true

  // Handle successful load
  script.onload = () => {
    console.log('My Analytics tracking script loaded successfully')
  }

  // Handle load errors gracefully
  script.onerror = () => {
    console.warn('Failed to load My Analytics tracking script. Make sure the analytics server is running on http://localhost:3000')
  }

  // Append to document head
  document.head.appendChild(script)
}
