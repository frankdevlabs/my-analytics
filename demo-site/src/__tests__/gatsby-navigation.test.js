/**
 * Gatsby Navigation and Route Change Tracking Tests
 *
 * Tests the integration between Gatsby's navigation system
 * and the analytics tracking functionality.
 */

import * as gatsbyBrowser from '../../gatsby-browser'

describe('Gatsby Navigation and Route Tracking', () => {
  beforeEach(() => {
    // Reset window tracking functions
    delete window.trackPageview
    delete window.trackEvent

    // Clear all timers
    jest.clearAllTimers()
    jest.clearAllMocks()

    // Mock console
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    console.log.mockRestore()
    console.warn.mockRestore()
    jest.useRealTimers()
  })

  describe('onRouteUpdate - SPA Navigation Tracking', () => {
    test('tracks pageview on route change when prevLocation exists', () => {
      jest.useFakeTimers()
      window.trackPageview = jest.fn()

      const location = { pathname: '/demo', search: '', hash: '' }
      const prevLocation = { pathname: '/', search: '', hash: '' }

      gatsbyBrowser.onRouteUpdate({ location, prevLocation })

      // Should not call immediately
      expect(window.trackPageview).not.toHaveBeenCalled()

      // Fast-forward time to trigger delayed call
      jest.advanceTimersByTime(50)

      expect(window.trackPageview).toHaveBeenCalledTimes(1)

      jest.useRealTimers()
    })

    test('does not track pageview on initial page load (no prevLocation)', () => {
      jest.useFakeTimers()
      window.trackPageview = jest.fn()

      const location = { pathname: '/', search: '', hash: '' }
      const prevLocation = null

      gatsbyBrowser.onRouteUpdate({ location, prevLocation })

      jest.advanceTimersByTime(100)

      expect(window.trackPageview).not.toHaveBeenCalled()

      jest.useRealTimers()
    })

    test('handles missing trackPageview function gracefully', () => {
      jest.useFakeTimers()
      delete window.trackPageview

      const location = { pathname: '/about', search: '', hash: '' }
      const prevLocation = { pathname: '/demo', search: '', hash: '' }

      // Should not throw error
      expect(() => {
        gatsbyBrowser.onRouteUpdate({ location, prevLocation })
        jest.advanceTimersByTime(50)
      }).not.toThrow()

      jest.useRealTimers()
    })

    test('tracks multiple route changes correctly', () => {
      jest.useFakeTimers()
      window.trackPageview = jest.fn()

      // First navigation: / -> /demo
      gatsbyBrowser.onRouteUpdate({
        location: { pathname: '/demo' },
        prevLocation: { pathname: '/' }
      })
      jest.advanceTimersByTime(50)

      expect(window.trackPageview).toHaveBeenCalledTimes(1)

      // Second navigation: /demo -> /about
      gatsbyBrowser.onRouteUpdate({
        location: { pathname: '/about' },
        prevLocation: { pathname: '/demo' }
      })
      jest.advanceTimersByTime(50)

      expect(window.trackPageview).toHaveBeenCalledTimes(2)

      // Third navigation: /about -> /contact
      gatsbyBrowser.onRouteUpdate({
        location: { pathname: '/contact' },
        prevLocation: { pathname: '/about' }
      })
      jest.advanceTimersByTime(50)

      expect(window.trackPageview).toHaveBeenCalledTimes(3)

      jest.useRealTimers()
    })

    test('uses correct delay timing for pageview tracking', () => {
      jest.useFakeTimers()
      window.trackPageview = jest.fn()

      const location = { pathname: '/demo' }
      const prevLocation = { pathname: '/' }

      gatsbyBrowser.onRouteUpdate({ location, prevLocation })

      // Should not be called before 50ms
      jest.advanceTimersByTime(49)
      expect(window.trackPageview).not.toHaveBeenCalled()

      // Should be called at 50ms
      jest.advanceTimersByTime(1)
      expect(window.trackPageview).toHaveBeenCalledTimes(1)

      jest.useRealTimers()
    })
  })

  describe('Route Update Timing and Edge Cases', () => {
    test('prevLocation undefined is treated same as null', () => {
      jest.useFakeTimers()
      window.trackPageview = jest.fn()

      const location = { pathname: '/' }
      const prevLocation = undefined

      gatsbyBrowser.onRouteUpdate({ location, prevLocation })
      jest.advanceTimersByTime(100)

      // Should not track on initial load
      expect(window.trackPageview).not.toHaveBeenCalled()

      jest.useRealTimers()
    })

    test('navigation to same page with different prevLocation triggers tracking', () => {
      jest.useFakeTimers()
      window.trackPageview = jest.fn()

      const location = { pathname: '/demo' }
      const prevLocation = { pathname: '/demo' }

      gatsbyBrowser.onRouteUpdate({ location, prevLocation })
      jest.advanceTimersByTime(50)

      // Should still track even though it's the same page
      expect(window.trackPageview).toHaveBeenCalledTimes(1)

      jest.useRealTimers()
    })
  })
})
