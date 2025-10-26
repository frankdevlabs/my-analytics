import React from 'react'
import { render, screen } from '@testing-library/react'
import Footer from '../Footer'

describe('Footer Component', () => {
  test('renders copyright notice with current year', () => {
    render(<Footer />)
    const currentYear = new Date().getFullYear()
    expect(screen.getByText(new RegExp(`© ${currentYear}`))).toBeInTheDocument()
  })

  test('renders footer navigation links', () => {
    render(<Footer />)
    const footerLinks = screen.getAllByRole('link')
    expect(footerLinks.length).toBeGreaterThan(0)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Demo')).toBeInTheDocument()
  })
})
