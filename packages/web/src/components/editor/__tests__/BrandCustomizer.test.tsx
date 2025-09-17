import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { BrandCustomizer } from '../BrandCustomizer';
import { GuideSettings } from '../../../types/guide.types';

const mockSettings: GuideSettings = {
  theme: 'default',
  brandColors: ['#3B82F6', '#1E40AF'],
  showStepNumbers: true,
  autoPlay: false,
  fontFamily: 'Inter, sans-serif',
  fontSize: 14
};

describe('BrandCustomizer', () => {
  const mockOnUpdate = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders brand customizer with tabs', () => {
    render(
      <BrandCustomizer
        settings={mockSettings}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Brand Customization')).toBeInTheDocument();
    expect(screen.getByText('Colors')).toBeInTheDocument();
    expect(screen.getByText('Typography')).toBeInTheDocument();
    expect(screen.getByText('Logo')).toBeInTheDocument();
  });

  it('displays color presets', () => {
    render(
      <BrandCustomizer
        settings={mockSettings}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Color Presets')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
    expect(screen.getByText('Purple')).toBeInTheDocument();
  });

  it('calls onUpdate when color preset is selected', () => {
    render(
      <BrandCustomizer
        settings={mockSettings}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    const greenPreset = screen.getByText('Green');
    fireEvent.click(greenPreset);

    expect(mockOnUpdate).toHaveBeenCalledWith({
      primaryColor: '#10B981',
      secondaryColor: '#047857'
    });
  });

  it('switches to typography tab and shows font options', () => {
    render(
      <BrandCustomizer
        settings={mockSettings}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    const typographyTab = screen.getByText('Typography');
    fireEvent.click(typographyTab);

    expect(screen.getByText('Font Family')).toBeInTheDocument();
    expect(screen.getByText('Base Font Size')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('calls onUpdate when font family is changed', () => {
    render(
      <BrandCustomizer
        settings={mockSettings}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    const typographyTab = screen.getByText('Typography');
    fireEvent.click(typographyTab);

    const fontSelect = screen.getByDisplayValue('Inter');
    fireEvent.change(fontSelect, { target: { value: 'Roboto, sans-serif' } });

    expect(mockOnUpdate).toHaveBeenCalledWith({
      fontFamily: 'Roboto, sans-serif'
    });
  });

  it('switches to logo tab and shows upload area', () => {
    render(
      <BrandCustomizer
        settings={mockSettings}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    const logoTab = screen.getByText('Logo');
    fireEvent.click(logoTab);

    expect(screen.getByText('Company Logo')).toBeInTheDocument();
    expect(screen.getByText('Upload a logo')).toBeInTheDocument();
    expect(screen.getByText('Logo Guidelines')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <BrandCustomizer
        settings={mockSettings}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close brand customizer/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('updates font size when slider is moved', () => {
    render(
      <BrandCustomizer
        settings={mockSettings}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    const typographyTab = screen.getByText('Typography');
    fireEvent.click(typographyTab);

    const fontSizeSlider = screen.getByRole('slider');
    fireEvent.change(fontSizeSlider, { target: { value: '16' } });

    expect(mockOnUpdate).toHaveBeenCalledWith({
      fontSize: 16
    });
  });
});