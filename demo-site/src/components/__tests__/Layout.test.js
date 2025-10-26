import React from 'react'
import { render, screen } from '@testing-library/react'
import Layout from '../Layout'

describe('Layout Component', () => {
  test('renders children correctly', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  test('renders page title when provided', () => {
    render(
      <Layout pageTitle="Test Page">
        <div>Content</div>
      </Layout>
    )
    expect(screen.getByText('Test Page')).toBeInTheDocument()
    expect(screen.getByText('Test Page')).toHaveClass('page-title')
  })

  test('wraps content with Header and Footer', () => {
    const { container } = render(
      <Layout>
        <div>Content</div>
      </Layout>
    )

    // Check for header and footer presence via class names
    expect(container.querySelector('.site-header')).toBeInTheDocument()
    expect(container.querySelector('.site-footer')).toBeInTheDocument()
    expect(container.querySelector('.main-content')).toBeInTheDocument()
  })
})
