/**
 * Integration Tests for Critical User Workflows
 *
 * These tests cover end-to-end workflows and integration points
 * that are critical for the demo site functionality.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { navigate } from 'gatsby'
import DemoPage from '../pages/demo'
import ContactPage from '../pages/contact'
import IndexPage from '../pages/index'

// Mock Gatsby navigate and Link
jest.mock('gatsby', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  navigate: jest.fn(),
}))

describe('Integration Tests - Critical User Workflows', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    window.trackEvent = jest.fn()
    window.trackPageview = jest.fn()
    sessionStorage.clear()

    // Mock console methods to avoid noise in test output
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    // Restore console methods
    console.log.mockRestore()
    console.warn.mockRestore()
  })

  describe('Demo Page - Button Click Workflow', () => {
    test('button click triggers tracking event with correct metadata', () => {
      render(<DemoPage />)

      const button = screen.getByRole('button', { name: /track this click/i })
      fireEvent.click(button)

      expect(window.trackEvent).toHaveBeenCalledWith('button_click', {
        button_id: 'demo-track-button',
        page: 'demo'
      })
    })

    test('button click works even when trackEvent is not available', () => {
      delete window.trackEvent

      render(<DemoPage />)
      const button = screen.getByRole('button', { name: /track this click/i })

      // Should not throw error
      expect(() => fireEvent.click(button)).not.toThrow()
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('trackEvent not available')
      )
    })
  })

  describe('Demo Page - Form Submission Workflow', () => {
    test('form submission triggers tracking event and resets form', async () => {
      render(<DemoPage />)

      const nameInput = screen.getByLabelText(/your name/i)
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /submit form/i })

      // Fill out form
      fireEvent.change(nameInput, { target: { value: 'Test User' } })
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      // Mock window.alert to avoid blocking
      window.alert = jest.fn()

      // Submit form
      fireEvent.submit(submitButton.closest('form'))

      // Verify tracking event was called
      expect(window.trackEvent).toHaveBeenCalledWith('form_submit', {
        form_type: 'demo',
        has_name: true,
        has_email: true
      })

      // Verify form was reset
      await waitFor(() => {
        expect(nameInput.value).toBe('')
        expect(emailInput.value).toBe('')
      })

      // Verify alert was shown
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Demo form submitted')
      )
    })

    test('form maintains required validation', () => {
      render(<DemoPage />)

      const nameInput = screen.getByLabelText(/your name/i)
      const emailInput = screen.getByLabelText(/email address/i)

      expect(nameInput).toBeRequired()
      expect(emailInput).toBeRequired()
      expect(emailInput).toHaveAttribute('type', 'email')
    })
  })

  describe('Contact Page - Form Submission and Navigation Workflow', () => {
    test('contact form submission triggers tracking event and navigates to thank-you page', async () => {
      jest.useFakeTimers()

      render(<ContactPage />)

      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const messageInput = screen.getByLabelText(/message/i)
      const form = screen.getByRole('button', { name: /send message/i }).closest('form')

      // Fill out form
      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(messageInput, { target: { value: 'This is a test message' } })

      // Submit form
      fireEvent.submit(form)

      // Verify tracking event was called immediately
      expect(window.trackEvent).toHaveBeenCalledWith('form_submit', {
        form_type: 'contact',
        has_name: true,
        has_email: true,
        has_message: true
      })

      // Fast-forward timers to trigger navigation
      jest.advanceTimersByTime(100)

      // Verify navigation was called
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/thank-you')
      })

      jest.useRealTimers()
    })

    test('contact form maintains required validation', () => {
      render(<ContactPage />)

      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const messageInput = screen.getByLabelText(/message/i)

      expect(nameInput).toBeRequired()
      expect(emailInput).toBeRequired()
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(messageInput).toBeRequired()
    })
  })

  describe('Session Tracking Across Pages', () => {
    test('session ID persists across different page components', () => {
      const sessionId = 'test-session-' + Date.now()
      sessionStorage.setItem('analytics_session_id', sessionId)

      // Render different pages
      const { unmount: unmountIndex } = render(<IndexPage />)
      expect(sessionStorage.getItem('analytics_session_id')).toBe(sessionId)
      unmountIndex()

      const { unmount: unmountDemo } = render(<DemoPage />)
      expect(sessionStorage.getItem('analytics_session_id')).toBe(sessionId)
      unmountDemo()

      const { unmount: unmountContact } = render(<ContactPage />)
      expect(sessionStorage.getItem('analytics_session_id')).toBe(sessionId)
      unmountContact()

      // Session ID should remain consistent
      expect(sessionStorage.getItem('analytics_session_id')).toBe(sessionId)
    })
  })

  describe('Navigation Links and Gatsby Link Integration', () => {
    test('demo page provides navigation links to other pages', () => {
      const { container } = render(<DemoPage />)

      // Find all demo-card sections
      const demoCards = container.querySelectorAll('.demo-card')

      // Find the card that contains "session tracking"
      let sessionTrackingCard = null
      demoCards.forEach(card => {
        if (card.textContent.match(/Navigate between pages/i)) {
          sessionTrackingCard = card
        }
      })

      expect(sessionTrackingCard).toBeTruthy()

      // Use within to scope queries to this section
      const homeLink = within(sessionTrackingCard).getByRole('link', { name: /homepage/i })
      const aboutLink = within(sessionTrackingCard).getByRole('link', { name: /about/i })
      const contactLink = within(sessionTrackingCard).getByRole('link', { name: /contact/i })

      expect(homeLink).toHaveAttribute('href', '/')
      expect(aboutLink).toHaveAttribute('href', '/about')
      expect(contactLink).toHaveAttribute('href', '/contact')
    })

    test('homepage has call-to-action link to demo page', () => {
      render(<IndexPage />)

      const demoLink = screen.getByRole('link', { name: /try demo/i })
      expect(demoLink).toHaveAttribute('href', '/demo')
    })
  })

  describe('Form Input Handling and State Management', () => {
    test('demo form updates state correctly when user types', () => {
      render(<DemoPage />)

      const nameInput = screen.getByLabelText(/your name/i)
      const emailInput = screen.getByLabelText(/email address/i)

      // Simulate user typing
      fireEvent.change(nameInput, { target: { value: 'Jane Smith' } })
      expect(nameInput.value).toBe('Jane Smith')

      fireEvent.change(emailInput, { target: { value: 'jane@test.com' } })
      expect(emailInput.value).toBe('jane@test.com')
    })

    test('contact form updates state correctly when user types', () => {
      render(<ContactPage />)

      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const messageInput = screen.getByLabelText(/message/i)

      // Simulate user typing
      fireEvent.change(nameInput, { target: { value: 'Bob Builder' } })
      expect(nameInput.value).toBe('Bob Builder')

      fireEvent.change(emailInput, { target: { value: 'bob@builder.com' } })
      expect(emailInput.value).toBe('bob@builder.com')

      fireEvent.change(messageInput, { target: { value: 'Can we fix it?' } })
      expect(messageInput.value).toBe('Can we fix it?')
    })
  })

  describe('Tracking Event Error Handling', () => {
    test('pages handle missing trackEvent gracefully without errors', () => {
      delete window.trackEvent

      const { unmount: unmountDemo } = render(<DemoPage />)
      const demoButton = screen.getByRole('button', { name: /track this click/i })

      // Should not throw
      expect(() => fireEvent.click(demoButton)).not.toThrow()
      expect(console.warn).toHaveBeenCalled()
      unmountDemo()

      const { unmount: unmountContact } = render(<ContactPage />)
      const contactForm = screen.getByRole('button', { name: /send message/i }).closest('form')

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } })
      fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Test message' } })

      // Should not throw
      expect(() => fireEvent.submit(contactForm)).not.toThrow()
      unmountContact()
    })
  })
})
