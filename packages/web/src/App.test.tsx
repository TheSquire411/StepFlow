import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders home page by default', () => {
    render(<App />);
    
    // Check if the main heading is present
    expect(screen.getByText(/Create step-by-step guides/i)).toBeInTheDocument();
    expect(screen.getByText(/with AI in minutes/i)).toBeInTheDocument();
  });

  it('renders navigation elements', () => {
    render(<App />);
    
    // Check if StepFlow logo/brand is present
    expect(screen.getByText('StepFlow')).toBeInTheDocument();
    
    // Check if sign in button is present
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    
    // Check if at least one get started button is present
    expect(screen.getAllByRole('link', { name: /get started/i }).length).toBeGreaterThan(0);
  });
});