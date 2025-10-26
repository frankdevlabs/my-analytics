import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Header from '../Header'

describe('Header Component', () => {
  test('renders site title with link to homepage', () => {
    render(<Header />)
    const logoLink = screen.getByText('My Analytics Demo')
    expect(logoLink).toBeInTheDocument()
    expect(logoLink).toHaveAttribute('href', '/')
  })

  test('renders all navigation links', () => {
    render(<Header />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Demo')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
    expect(screen.getByText('Thank You')).toBeInTheDocument()
  })

  test('mobile menu toggle button is present', () => {
    render(<Header />)
    const toggleButton = screen.getByLabelText('Toggle navigation menu')
    expect(toggleButton).toBeInTheDocument()
  })

  test('mobile menu opens when toggle button is clicked', () => {
    render(<Header />)
    const toggleButton = screen.getByLabelText('Toggle navigation menu')
    const nav = screen.getByRole('navigation')

    expect(nav).not.toHaveClass('mobile-open')

    fireEvent.click(toggleButton)
    expect(nav).toHaveClass('mobile-open')
  })
})
