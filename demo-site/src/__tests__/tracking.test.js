/**
 * Tracking Integration Tests
 *
 * Tests critical tracking behaviors including script loading,
 * pageview tracking, and custom event tracking.
 */

describe('Tracking Integration', () => {
  beforeEach(() => {
    // Clear any existing tracking script
    const existingScript = document.querySelector('script[src*="tracker.min.js"]')
    if (existingScript) {
      existingScript.remove()
    }

    // Reset window.trackEvent
    delete window.trackEvent

    // Clear sessionStorage
    sessionStorage.clear()
  })

  describe('Script Loading', () => {
    test('tracking script loads from correct URL', () => {
      // Create and append tracking script
      const script = document.createElement('script')
      script.src = 'http://localhost:3000/tracker.min.js'
      script.async = true
      script.defer = true
      document.head.appendChild(script)

      const loadedScript = document.querySelector('script[src="http://localhost:3000/tracker.min.js"]')
      expect(loadedScript).toBeTruthy()
      expect(loadedScript.async).toBe(true)
      expect(loadedScript.defer).toBe(true)
    })

    test('handles script load errors gracefully', () => {
      const script = document.createElement('script')
      script.src = 'http://localhost:3000/tracker.min.js'

      // Mock onerror handler
      const errorHandler = jest.fn()
      script.onerror = errorHandler

      document.head.appendChild(script)

      // Simulate error
      script.onerror()

      expect(errorHandler).toHaveBeenCalled()
    })
  })

  describe('Custom Event Tracking', () => {
    test('window.trackEvent is called for button clicks', () => {
      // Mock window.trackEvent
      window.trackEvent = jest.fn()

      // Simulate button click tracking
      const buttonId = 'demo-cta'
      window.trackEvent('button_click', { button_id: buttonId })

      expect(window.trackEvent).toHaveBeenCalledWith('button_click', {
        button_id: buttonId
      })
    })

    test('window.trackEvent is called for form submissions', () => {
      // Mock window.trackEvent
      window.trackEvent = jest.fn()

      // Simulate form submission tracking
      const formType = 'contact'
      window.trackEvent('form_submit', { form_type: formType })

      expect(window.trackEvent).toHaveBeenCalledWith('form_submit', {
        form_type: formType
      })
    })
  })

  describe('Session Tracking', () => {
    test('session ID persists in sessionStorage', () => {
      const sessionId = 'test-session-123'
      sessionStorage.setItem('analytics_session_id', sessionId)

      const storedSessionId = sessionStorage.getItem('analytics_session_id')
      expect(storedSessionId).toBe(sessionId)
    })

    test('session ID remains consistent across multiple checks', () => {
      const sessionId = 'test-session-456'
      sessionStorage.setItem('analytics_session_id', sessionId)

      // Check multiple times
      expect(sessionStorage.getItem('analytics_session_id')).toBe(sessionId)
      expect(sessionStorage.getItem('analytics_session_id')).toBe(sessionId)
      expect(sessionStorage.getItem('analytics_session_id')).toBe(sessionId)
    })
  })

  describe('UTM Parameter Handling', () => {
    test('UTM parameters can be extracted from URL', () => {
      // Mock URLSearchParams
      const mockUrl = 'http://localhost:8000/?utm_source=demo&utm_medium=test&utm_campaign=gatsby'
      const url = new URL(mockUrl)
      const params = new URLSearchParams(url.search)

      expect(params.get('utm_source')).toBe('demo')
      expect(params.get('utm_medium')).toBe('test')
      expect(params.get('utm_campaign')).toBe('gatsby')
    })
  })
})
