import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { GuideViewer } from '../GuideViewer';
import { Guide } from '../../../types/guide.types';

// Mock the hooks
vi.mock('../../../hooks/useKeyboardNavigation');
vi.mock('../../../hooks/useViewerAnalytics', () => ({
  useViewerAnalytics: () => ({
    trackView: vi.fn(),
    trackStepView: vi.fn(),
    trackCompletion: vi.fn(),
    trackEngagement: vi.fn()
  })
}));

const mockGuide: Guide = {
  id: 'guide-1',
  userId: 'user-1',
  recordingId: 'recording-1',
  title: 'Test Guide',
  description: 'A test guide for unit testing',
  steps: [
    {
      id: 'step-1',
      order: 0,
      title: 'First Step',
      description: 'This is the first step',
      screenshotUrl: '/test-screenshot-1.jpg',
      annotations: [],
      audioUrl: '/test-audio-1.mp3'
    },
    {
      id: 'step-2',
      order: 1,
      title: 'Second Step',
      description: 'This is the second step',
      screenshotUrl: '/test-screenshot-2.jpg',
      annotations: [
        {
          id: 'annotation-1',
          type: 'highlight',
          x: 100,
          y: 100,
          width: 50,
          height: 30,
          color: '#FFD700'
        }
      ]
    }
  ],
  settings: {
    theme: 'default',
    brandColors: ['#3B82F6', '#1E40AF'],
    showStepNumbers: true,
    autoPlay: false,
    fontFamily: 'Inter',
    fontSize: 16
  },
  sharing: {
    isPublic: true,
    shareUrl: 'https://example.com/guides/guide-1',
    embedCode: '<iframe src="..."></iframe>',
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
  status: 'published',
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('GuideViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders guide viewer with first step', () => {
    render(<GuideViewer guide={mockGuide} />);
    
    expect(screen.getByText('First Step')).toBeInTheDocument();
    expect(screen.getByText('This is the first step')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('navigates to next step when next button is clicked', async () => {
    render(<GuideViewer guide={mockGuide} />);
    
    const nextButton = screen.getByLabelText('Next step');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Second Step')).toBeInTheDocument();
      expect(screen.getByText('This is the second step')).toBeInTheDocument();
      expect(screen.getByText('2 / 2')).toBeInTheDocument();
    });
  });

  it('navigates to previous step when previous button is clicked', async () => {
    render(<GuideViewer guide={mockGuide} />);
    
    // Go to second step first
    const nextButton = screen.getByLabelText('Next step');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Second Step')).toBeInTheDocument();
    });
    
    // Go back to first step
    const previousButton = screen.getByLabelText('Previous step');
    fireEvent.click(previousButton);
    
    await waitFor(() => {
      expect(screen.getByText('First Step')).toBeInTheDocument();
    });
  });

  it('toggles playback when play button is clicked', () => {
    render(<GuideViewer guide={mockGuide} />);
    
    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);
    
    expect(screen.getByLabelText('Pause')).toBeInTheDocument();
  });

  it('disables previous button on first step', () => {
    render(<GuideViewer guide={mockGuide} />);
    
    const previousButton = screen.getByLabelText('Previous step');
    expect(previousButton).toBeDisabled();
  });

  it('disables next button on last step', async () => {
    render(<GuideViewer guide={mockGuide} />);
    
    // Navigate to last step
    const nextButton = screen.getByLabelText('Next step');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(nextButton).toBeDisabled();
    });
  });

  it('calls onComplete when reaching the last step', async () => {
    const onComplete = vi.fn();
    render(<GuideViewer guide={mockGuide} onComplete={onComplete} />);
    
    // Navigate to last step
    const nextButton = screen.getByLabelText('Next step');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('shows step numbers when enabled in settings', () => {
    render(<GuideViewer guide={mockGuide} />);
    
    expect(screen.getByLabelText('Step 1 of 2')).toBeInTheDocument();
  });

  it('hides step numbers when disabled in settings', () => {
    const guideWithoutStepNumbers = {
      ...mockGuide,
      settings: {
        ...mockGuide.settings,
        showStepNumbers: false
      }
    };
    
    render(<GuideViewer guide={guideWithoutStepNumbers} />);
    
    expect(screen.queryByLabelText('Step 1 of 2')).not.toBeInTheDocument();
  });

  it('applies brand colors from settings', () => {
    render(<GuideViewer guide={mockGuide} />);
    
    const stepTitle = screen.getByText('First Step');
    expect(stepTitle).toHaveStyle({ color: '#3B82F6' });
  });

  it('shows social sharing in non-embedded mode', () => {
    render(<GuideViewer guide={mockGuide} embedded={false} />);
    
    expect(screen.getByLabelText('Share this guide')).toBeInTheDocument();
  });

  it('hides social sharing in embedded mode', () => {
    render(<GuideViewer guide={mockGuide} embedded={true} />);
    
    expect(screen.queryByLabelText('Share this guide')).not.toBeInTheDocument();
  });

  it('shows fullscreen button in non-embedded mode', () => {
    render(<GuideViewer guide={mockGuide} embedded={false} />);
    
    expect(screen.getByLabelText('Enter fullscreen')).toBeInTheDocument();
  });

  it('hides fullscreen button in embedded mode', () => {
    render(<GuideViewer guide={mockGuide} embedded={true} />);
    
    expect(screen.queryByLabelText('Enter fullscreen')).not.toBeInTheDocument();
  });

  it('updates progress indicator correctly', async () => {
    render(<GuideViewer guide={mockGuide} />);
    
    // Should show 0% progress on first step
    expect(screen.getByText('0% complete')).toBeInTheDocument();
    
    // Navigate to second step
    const nextButton = screen.getByLabelText('Next step');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('100% complete')).toBeInTheDocument();
    });
  });

  it('handles audio playback when available', () => {
    render(<GuideViewer guide={mockGuide} />);
    
    const audioElement = screen.getByLabelText('Audio narration for step: First Step');
    expect(audioElement).toBeInTheDocument();
    expect(audioElement).toHaveAttribute('src', '/test-audio-1.mp3');
  });
});