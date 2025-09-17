import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ToolPanel } from '../ToolPanel';

describe('ToolPanel', () => {
  const mockOnToolChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all tool buttons', () => {
    render(
      <ToolPanel
        selectedTool="select"
        onToolChange={mockOnToolChange}
      />
    );

    expect(screen.getByText('Select')).toBeInTheDocument();
    expect(screen.getByText('Highlight')).toBeInTheDocument();
    expect(screen.getByText('Arrow')).toBeInTheDocument();
    expect(screen.getByText('Blur')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Rectangle')).toBeInTheDocument();
  });

  it('highlights the selected tool', () => {
    render(
      <ToolPanel
        selectedTool="highlight"
        onToolChange={mockOnToolChange}
      />
    );

    const highlightButton = screen.getByText('Highlight').closest('button');
    expect(highlightButton).toHaveClass('bg-blue-100', 'text-blue-700');
  });

  it('calls onToolChange when a tool is clicked', () => {
    render(
      <ToolPanel
        selectedTool="select"
        onToolChange={mockOnToolChange}
      />
    );

    const arrowButton = screen.getByText('Arrow');
    fireEvent.click(arrowButton);

    expect(mockOnToolChange).toHaveBeenCalledWith('arrow');
  });

  it('renders undo and redo buttons', () => {
    render(
      <ToolPanel
        selectedTool="select"
        onToolChange={mockOnToolChange}
      />
    );

    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
  });

  it('shows correct tool descriptions in titles', () => {
    render(
      <ToolPanel
        selectedTool="select"
        onToolChange={mockOnToolChange}
      />
    );

    const selectButton = screen.getByText('Select').closest('button');
    expect(selectButton).toHaveAttribute('title', 'Select and move annotations');

    const highlightButton = screen.getByText('Highlight').closest('button');
    expect(highlightButton).toHaveAttribute('title', 'Highlight areas of interest');
  });
});