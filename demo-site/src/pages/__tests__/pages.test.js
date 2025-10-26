import React from 'react'
import { render, screen } from '@testing-library/react'
import IndexPage from '../index'
import AboutPage from '../about'
import DemoPage from '../demo'
import ContactPage from '../contact'
import ThankYouPage from '../thank-you'

// Mock Gatsby Link component
jest.mock('gatsby', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  navigate: jest.fn(),
}))

describe('Page Components', () => {
  describe('Homepage', () => {
    test('renders main heading and CTA button', () => {
      render(<IndexPage />)
      expect(screen.getByText('My Analytics Demo Site')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /try demo/i })).toBeInTheDocument()
    })
  })

  describe('About Page', () => {
    test('renders tracking features list', () => {
      render(<AboutPage />)
      expect(screen.getByText(/tracking features/i)).toBeInTheDocument()
      expect(screen.getByText(/pageview tracking/i)).toBeInTheDocument()
    })
  })

  describe('Demo Page', () => {
    test('renders trackable button', () => {
      render(<DemoPage />)
      expect(screen.getByRole('button', { name: /track this click/i })).toBeInTheDocument()
    })

    test('renders demo form with submit button', () => {
      render(<DemoPage />)
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /submit form/i })).toBeInTheDocument()
    })
  })

  describe('Contact Page', () => {
    test('renders contact form with required fields', () => {
      render(<ContactPage />)
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    })
  })

  describe('Thank You Page', () => {
    test('renders confirmation message', () => {
      render(<ThankYouPage />)
      expect(screen.getByRole('heading', { level: 2, name: /thank you!/i })).toBeInTheDocument()
    })

    test('renders link back to homepage', () => {
      render(<ThankYouPage />)
      expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument()
    })
  })
})
