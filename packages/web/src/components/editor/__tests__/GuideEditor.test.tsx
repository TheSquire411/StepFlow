import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { GuideEditor } from '../GuideEditor';
import { Guide } from '../../../types/guide.types';

// Mock React DnD
vi.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useDrag: () => [{ isDragging: false }, vi.fn(), vi.fn()],
  useDrop: () => [{ handlerId: null }, vi.fn()]
}));

vi.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {}
}));

const mockGuide: Guide = {
  id: '1',
  userId: 'user1',
  recordingId: 'rec1',
  title: 'Test Guide',
  description: 'Test Description',
  status: 'draft',
  createdAt: new Date(),
  updatedAt: new Date(),
  settings: {
    theme: 'default',
    brandColors: ['#3B82F6', '#1E40AF'],
    showStepNumbers: true,
    autoPlay: false,
    fontFamily: 'Inter, sans-serif',
    fontSize: 14
  },
  sharing: {
    isPublic: false,
    shareUrl: '',
    embedCode: '',
    allowedDomains: [],
    passwordProtected: false,
    permissions: []
  },
  analytics: {
    views: 0,
    uniqueViews: 0,
    completionRate: 0,
    averageTimeSpent: 0
  },
  steps: [
    {
      id: 'step1',
      order: 0,
      title: 'Step 1',
      description: 'First step',
      screenshotUrl: 'test-image.jpg',
      annotations: []
    },
    {
      id: 'step2',
      order: 1,
      title: 'Step 2',
      description: 'Second step',
      screenshotUrl: 'test-image2.jpg',
      annotations: []
    }
  ]
};

describe('GuideEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnPublish = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders guide editor with title', () => {
    render(
      <GuideEditor
        guide={mockGuide}
        onSave={mockOnSave}
        onPublish={mockOnPublish}
      />
    );

    expect(screen.getByText('Test Guide')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('displays steps in the step list', () => {
    render(
      <GuideEditor
        guide={mockGuide}
        onSave={mockOnSave}
        onPublish={mockOnPublish}
      />
    );

    expect(screen.getAllByDisplayValue('Step 1')).toHaveLength(2); // One in step list, one in editor
    expect(screen.getByDisplayValue('Step 2')).toBeInTheDocument();
    expect(screen.getByText('2 steps')).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', async () => {
    render(
      <GuideEditor
        guide={mockGuide}
        onSave={mockOnSave}
        onPublish={mockOnPublish}
      />
    );

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(mockGuide);
    });
  });

  it('calls onPublish when publish button is clicked', async () => {
    render(
      <GuideEditor
        guide={mockGuide}
        onSave={mockOnSave}
        onPublish={mockOnPublish}
      />
    );

    const publishButton = screen.getByText('Publish');
    fireEvent.click(publishButton);

    await waitFor(() => {
      expect(mockOnPublish).toHaveBeenCalledWith(mockGuide);
    });
  });

  it('opens brand customizer when brand button is clicked', () => {
    render(
      <GuideEditor
        guide={mockGuide}
        onSave={mockOnSave}
        onPublish={mockOnPublish}
      />
    );

    const brandButton = screen.getByText('Brand');
    fireEvent.click(brandButton);

    expect(screen.getByText('Brand Customization')).toBeInTheDocument();
  });

  it('opens preview when preview button is clicked', () => {
    render(
      <GuideEditor
        guide={mockGuide}
        onSave={mockOnSave}
        onPublish={mockOnPublish}
      />
    );

    const previewButton = screen.getByText('Preview');
    fireEvent.click(previewButton);

    expect(screen.getByText('Preview Mode')).toBeInTheDocument();
  });

  it('updates step when step is modified', async () => {
    render(
      <GuideEditor
        guide={mockGuide}
        onSave={mockOnSave}
        onPublish={mockOnPublish}
      />
    );

    // Find and modify step title
    const stepTitleInput = screen.getAllByDisplayValue('Step 1')[0];
    fireEvent.change(stepTitleInput, { target: { value: 'Updated Step 1' } });

    // The component should update internally
    expect(stepTitleInput).toHaveValue('Updated Step 1');
  });
});