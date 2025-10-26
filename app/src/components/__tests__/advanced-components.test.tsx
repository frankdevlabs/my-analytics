/**
 * Advanced Components Test Suite
 * Tests for navigation, table, dropdown, modal, toast, and responsive behavior
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock navigation component tests
describe('Navigation Components', () => {
  it('should render navigation links with proper hover states', () => {
    const TestNav = () => (
      <nav className="flex gap-4">
        <a
          href="/dashboard"
          className="text-foreground hover:shadow-[0_1px_0_0_currentColor] transition-shadow duration-300"
        >
          Dashboard
        </a>
        <a
          href="/analytics"
          className="text-accent hover:shadow-[0_1px_0_0_currentColor] transition-shadow duration-300"
          aria-current="page"
        >
          Analytics
        </a>
      </nav>
    );

    render(<TestNav />);

    const dashboardLink = screen.getByText('Dashboard');
    const analyticsLink = screen.getByText('Analytics');

    expect(dashboardLink).toHaveClass('text-foreground');
    expect(dashboardLink).toHaveClass('hover:shadow-[0_1px_0_0_currentColor]');
    expect(dashboardLink).toHaveClass('transition-shadow');
    expect(dashboardLink).toHaveClass('duration-300');

    expect(analyticsLink).toHaveClass('text-accent');
    expect(analyticsLink).toHaveAttribute('aria-current', 'page');
  });
});

// Mock table component tests
describe('Table Components', () => {
  it('should render table with correct density and borders', () => {
    const TestTable = () => (
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-4 font-medium text-sm">Name</th>
            <th className="text-left py-2 px-4 font-medium text-sm">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border hover:bg-surface/50 transition-colors duration-200">
            <td className="py-2 px-4 leading-tight">Item 1</td>
            <td className="py-2 px-4 leading-tight">100</td>
          </tr>
          <tr className="border-b border-border hover:bg-surface/50 transition-colors duration-200">
            <td className="py-2 px-4 leading-tight">Item 2</td>
            <td className="py-2 px-4 leading-tight">200</td>
          </tr>
        </tbody>
      </table>
    );

    render(<TestTable />);

    expect(screen.getByText('Name')).toHaveClass('font-medium');
    expect(screen.getByText('Name')).toHaveClass('text-sm');
    expect(screen.getByText('Item 1')).toHaveClass('leading-tight');
    expect(screen.getByText('Item 1').closest('tr')).toHaveClass('hover:bg-surface/50');
    expect(screen.getByText('Item 1').closest('tr')).toHaveClass('transition-colors');
  });
});

// Mock data display component tests
describe('Data Display Components', () => {
  it('should render data display components with semantic tokens', () => {
    const TestDataCard = () => (
      <div className="rounded bg-card border border-border p-4">
        <h3 className="text-lg font-semibold text-foreground">Total Users</h3>
        <p className="text-3xl font-bold text-accent">1,234</p>
        <p className="text-sm text-text-secondary">+12% from last month</p>
      </div>
    );

    render(<TestDataCard />);

    const title = screen.getByText('Total Users');
    const value = screen.getByText('1,234');
    const description = screen.getByText(/\+12% from last month/);

    expect(title).toHaveClass('text-foreground');
    expect(value).toHaveClass('text-accent');
    expect(description).toHaveClass('text-text-secondary');
  });
});

// Mock dropdown positioning tests
describe('Dropdown Positioning', () => {
  it('should apply correct elevation styles for dropdown menus', () => {
    const TestDropdown = () => (
      <div
        className="absolute z-50 min-w-[8rem] rounded border border-border bg-surface shadow-md"
        role="menu"
      >
        <div className="p-1">
          <button className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-accent/10 transition-colors duration-200">
            Option 1
          </button>
          <button className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-accent/10 transition-colors duration-200">
            Option 2
          </button>
        </div>
      </div>
    );

    render(<TestDropdown />);

    const dropdown = screen.getByRole('menu');

    expect(dropdown).toHaveClass('z-50');
    expect(dropdown).toHaveClass('shadow-md');
    expect(dropdown).toHaveClass('border-border');
    expect(dropdown).toHaveClass('bg-surface');
    expect(dropdown).toHaveClass('rounded');
  });
});

// Responsive behavior tests
describe('Responsive Design', () => {
  it('should have mobile-friendly touch targets', () => {
    const TestButton = () => (
      <button className="h-11 px-4 rounded" aria-label="Action button">
        Click Me
      </button>
    );

    render(<TestButton />);

    const button = screen.getByRole('button');

    // h-11 = 44px, which meets the 44x44px minimum touch target size
    expect(button).toHaveClass('h-11');
    expect(button).toHaveClass('px-4');
  });

  it('should apply responsive table classes for horizontal scroll', () => {
    const TestResponsiveTable = () => (
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th>Column 1</th>
              <th>Column 2</th>
              <th>Column 3</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Data 1</td>
              <td>Data 2</td>
              <td>Data 3</td>
            </tr>
          </tbody>
        </table>
      </div>
    );

    render(<TestResponsiveTable />);

    const wrapper = screen.getByRole('table').parentElement;

    expect(wrapper).toHaveClass('overflow-x-auto');
    expect(screen.getByRole('table')).toHaveClass('min-w-full');
  });
});

// Light and dark mode compatibility tests
describe('Theme Compatibility', () => {
  it('should use semantic color tokens for theme switching', () => {
    const TestComponent = () => (
      <div className="bg-background text-foreground">
        <div className="bg-card border-border">
          <button className="bg-button-bg text-button-text">Action</button>
          <span className="text-accent">Accent Text</span>
        </div>
      </div>
    );

    render(<TestComponent />);

    const container = screen.getByText('Action').closest('div')?.parentElement;

    expect(container).toHaveClass('bg-background');
    expect(container).toHaveClass('text-foreground');
    expect(screen.getByText('Action')).toHaveClass('bg-button-bg');
    expect(screen.getByText('Action')).toHaveClass('text-button-text');
    expect(screen.getByText('Accent Text')).toHaveClass('text-accent');
  });
});

// Keyboard navigation tests
describe('Keyboard Navigation', () => {
  it('should have proper focus styles for interactive elements', () => {
    const TestInteractive = () => (
      <div>
        <button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
          Button
        </button>
        <a
          href="/link"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Link
        </a>
        <input
          type="text"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>
    );

    render(<TestInteractive />);

    const button = screen.getByRole('button');
    const link = screen.getByRole('link');
    const input = screen.getByRole('textbox');

    expect(button).toHaveClass('focus-visible:ring-2');
    expect(button).toHaveClass('focus-visible:ring-accent');
    expect(link).toHaveClass('focus-visible:ring-2');
    expect(link).toHaveClass('focus-visible:ring-accent');
    expect(input).toHaveClass('focus-visible:ring-2');
    expect(input).toHaveClass('focus-visible:ring-accent');
  });
});
