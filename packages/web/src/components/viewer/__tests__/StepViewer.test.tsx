import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { StepViewer } from '../StepViewer';
import { ProcessedStep, GuideSettings } from '../../../types/guide.types';

const mockStep: ProcessedStep = {
  id: 'step-1',
  order: 0,
  title: 'Test Step',
  description: 'This is a test step with a longer description to test text rendering',
  screenshotUrl: '/test-screenshot.jpg',
  annotations: [
    {
      id: 'annotation-1',
      type: 'highlight',
      x: 100,
      y: 100,
      width: 50,
      height: 30,
      color: '#FFD700'
    },
    {
      id: 'annotation-2',
      type: 'arrow',
      x: 200,
      y: 150,
      rotation: 45,
      color: '#FF0000'
    }
  ],
  audioUrl: '/test-audio.mp3'
};

const mockSettings: GuideSettings = {
  theme: 'default',
  brandColors: ['#3B82F6', '#1E40AF'],
  logoUrl: '/test-logo.png',
  showStepNumbers: true,
  autoPlay: false,
  fontFamily: 'Inter',
  fontSize: 16
};

describe('StepViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders step content correctly', () => {
    render(
      <StepViewer
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        settings={mockSettings}
        isPlaying={false}
      />
    );
    
    expect(screen.getByText('Test Step')).toBeInTheDocument();
    expect(screen.getByText('This is a test step with a longer description to test text rendering')).toBeInTheDocument();
    expect(screen.getByLabelText('Step 1 of 3')).toBeInTheDocument();
  });

  it('applies custom font family and size from settings', () => {
    render(
      <StepViewer
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        settings={mockSettings}
        isPlaying={false}
      />
    );
    
    const stepViewer = screen.getByText('Test Step').closest('.step-viewer');
    expect(stepViewer).toHaveStyle({
      fontFamily: 'Inter',
      fontSize: '16px'
    });
  });

  it('applies brand colors from settings', () => {
    render(
      <StepViewer
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        settings={mockSettings}
        isPlaying={false}
      />
    );
    
    const stepNumber = screen.getByLabelText('Step 1 of 3');
    expect(stepNumber).toHaveStyle({ backgroundColor: '#3B82F6' });
    
    const stepTitle = screen.getByText('Test Step');
    expect(stepTitle).toHaveStyle({ color: '#3B82F6' });
  });

  it('shows step number when enabled in settings', () => {
    render(
      <StepViewer
        step={mockStep}
        stepNumber={2}
        totalSteps={5}
        settings={mockSettings}
        isPlaying={false}
      />
    );
    
    expect(screen.getByLabelText('Step 2 of 5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('hides step number when disabled in settings', () => {
    const settingsWithoutStepNumbers = {
      ...mockSettings,
      showStepNumbers: false
    };
    
    render(
      <StepViewer
        step={mockStep}
        stepNumber={2}
        totalSteps={5}
        settings={settingsWithoutStepNumbers}
        isPlaying={false}
      />
    );
    
    expect(screen.queryByLabelText('Step 2 of 5')).not.toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('renders screenshot with proper alt text', () => {
    render(
      <StepViewer
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        settings={mockSettings}
        isPlaying={false}
      />
    );
    
    const screenshot = screen.getByAltText('Screenshot for step: Test Step');
    expect(screenshot).toBeInTheDocument();
    expect(screenshot).toHaveAttribute('src', '/test-screenshot.jpg');
  });

  it('shows loading state before image loads', () => {
    render(
      <StepViewer
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        settings={mockSettings}
        isPlaying={false}
      />
    );
    
    // Image should be initially hidden (opacity-0) while loading
    const screenshot = screen.getByAltText('Screenshot for step: Test Step');
    expect(screenshot).toHaveClass('opacity-0');
  });

  it('shows error state when image fails to load', async () => {
    render(
      <StepViewer
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        settings={mockSettings}
        isPlaying={false}
      />
    );
    
    const screenshot = screen.getByAltText('Screenshot for step: Test Step');
    fireEvent.error(screenshot);
    
    await waitFor(() => {
      expect(screen.getByText('Image failed to load')).toBeInTheDocument();
    });
  });

  it('renders audio controls when audio is available', () => {
    render(
      <StepViewer
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        settings={mockSettings}
        isPlaying={false}
      />
    );
    
    const audioElement = screen.getByLabelText('Audio narration for step: Test Step');
    expect(audioElement).toBeInTheDocument();
    expect(audioElement).toHaveAttribute('src', '/test-audio.mp3');
  });

  it('does not render audio controls when audio is not available', () => {
    const stepWithoutAudio = {
      ...mockStep,
      audioUrl: undefined
    };
    
    render(
      <StepViewer
        step={stepWithoutAudio}
        stepNumber={1}
        totalSteps={3}
        settings={mockSettings}
        isPlaying={false}
      />
    );
    
    expect(screen.queryByLabelText('Audio narration for step: Test Step')).not.toBeInTheDocument();
  });

  it('shows brand logo when provided in settings', () => {
    render(
      <StepViewer
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        settings={mockSettings}
        isPlaying={false}
      />
    );
    
    const logo = screen.getByAltText('Brand logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/test-logo.png');
  });

  it('does not show brand logo when not provided in settings', () => {
    const settingsWithoutLogo = {
      ...mockSettings,
      logoUrl: undefined
    };
    
    render(
      <StepViewer
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        settings={settingsWithoutLogo}
        isPlaying={false}
      />
    );
    
    expect(screen.queryByAltText('Brand logo')).not.toBeInTheDocument();
  });

  it('renders annotations when image is loaded', async () => {
    render(
      <StepViewer
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        settings={mockSettings}
        isPlaying={false}
      />
    );
    
    const screenshot = screen.getByAltText('Screenshot for step: Test Step');
    fireEvent.load(screenshot);
    
    await waitFor(() => {
      // AnnotationRenderer should be present (tested separately)
      expect(screenshot.parentElement?.querySelector('.annotation-renderer')).toBeInTheDocument();
    });
  });

  it('shows audio playing indicator when audio is playing', async () => {
    render(
      <StepViewer
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        settings={mockSettings}
        isPlaying={true}
      />
    );
    
    const audioElement = screen.getByLabelText('Audio narration for step: Test Step') as HTMLAudioElement;
    fireEvent.play(audioElement);
    
    await waitFor(() => {
      expect(screen.getByText('Playing audio narration')).toBeInTheDocument();
    });
  });
});