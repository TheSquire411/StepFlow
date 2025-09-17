import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Guide, ProcessedStep } from '../../types/guide.types';
import { StepViewer } from './StepViewer';
import { ViewerControls } from './ViewerControls';
import { ViewerProgress } from './ViewerProgress';
import { SocialSharing } from './SocialSharing';
import { LazyContent } from '../common/LazyContent';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { useViewerAnalytics } from '../../hooks/useViewerAnalytics';
import { useImagePreload } from '../../hooks/useLazyLoading';

interface GuideViewerProps {
  guide: Guide;
  className?: string;
  embedded?: boolean;
  onComplete?: () => void;
}

export const GuideViewer: React.FC<GuideViewerProps> = ({
  guide,
  className = '',
  embedded = false,
  onComplete
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout>();

  // Preload images for better performance
  const stepImages = guide.steps.map(step => step.screenshotUrl).filter(Boolean);
  const { isImageLoaded, progress: imageLoadProgress } = useImagePreload({
    images: stepImages,
    priority: currentStepIndex < 3, // Prioritize first 3 steps
  });
  
  const { trackView, trackStepView, trackCompletion } = useViewerAnalytics(guide.id);
  
  const currentStep = guide.steps[currentStepIndex];
  const isLastStep = currentStepIndex === guide.steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  // Auto-play functionality
  const getStepDuration = useCallback((step: ProcessedStep): number => {
    // Base duration from audio if available, otherwise calculate from content
    if (step.audioUrl) {
      // TODO: Get actual audio duration from metadata
      return 5000; // Default 5 seconds
    }
    
    // Calculate duration based on content length
    const baseTime = 3000; // 3 seconds base
    const textTime = step.description.length * 50; // 50ms per character
    return Math.min(Math.max(baseTime + textTime, 2000), 10000); // 2-10 seconds
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < guide.steps.length - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);
      trackStepView(newIndex);
      
      if (newIndex === guide.steps.length - 1) {
        trackCompletion();
        onComplete?.();
      }
    } else {
      setIsPlaying(false);
      trackCompletion();
      onComplete?.();
    }
  }, [currentStepIndex, guide.steps.length, trackStepView, trackCompletion, onComplete]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      trackStepView(newIndex);
    }
  }, [currentStepIndex, trackStepView]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < guide.steps.length) {
      setCurrentStepIndex(stepIndex);
      trackStepView(stepIndex);
    }
  }, [guide.steps.length, trackStepView]);

  const togglePlayback = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Auto-play timer
  useEffect(() => {
    if (isPlaying && guide.settings.autoPlay) {
      const duration = getStepDuration(currentStep) / playbackSpeed;
      
      autoPlayTimerRef.current = setTimeout(() => {
        nextStep();
      }, duration);
    }

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [isPlaying, currentStep, playbackSpeed, guide.settings.autoPlay, getStepDuration, nextStep]);

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: nextStep,
    onPrevious: previousStep,
    onTogglePlay: togglePlayback,
    onEscape: () => setIsFullscreen(false),
    enabled: !embedded
  });

  // Track initial view
  useEffect(() => {
    trackView();
    trackStepView(0);
  }, [trackView, trackStepView]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && viewerRef.current) {
      viewerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Hide controls on mouse inactivity
  useEffect(() => {
    let hideTimer: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setShowControls(false), 3000);
    };

    if (isFullscreen) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        clearTimeout(hideTimer);
      };
    }
  }, [isFullscreen]);

  return (
    <div
      ref={viewerRef}
      className={`guide-viewer ${className} ${isFullscreen ? 'fullscreen' : ''}`}
      role="application"
      aria-label={`Guide viewer: ${guide.title}`}
    >
      {/* Progress indicator */}
      <ViewerProgress
        currentStep={currentStepIndex + 1}
        totalSteps={guide.steps.length}
        progress={(currentStepIndex / (guide.steps.length - 1)) * 100}
        className={`transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Main content area */}
      <div className="viewer-content flex-1 relative">
        <StepViewer
          step={currentStep}
          stepNumber={currentStepIndex + 1}
          totalSteps={guide.steps.length}
          settings={guide.settings}
          isPlaying={isPlaying}
          className="h-full"
        />
      </div>

      {/* Controls */}
      <ViewerControls
        isPlaying={isPlaying}
        onTogglePlay={togglePlayback}
        onNext={nextStep}
        onPrevious={previousStep}
        onGoToStep={goToStep}
        currentStep={currentStepIndex}
        totalSteps={guide.steps.length}
        playbackSpeed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
        onFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        canGoNext={!isLastStep}
        canGoPrevious={!isFirstStep}
        className={`transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        embedded={embedded}
      />

      {/* Social sharing (only in non-embedded mode) */}
      {!embedded && (
        <SocialSharing
          guide={guide}
          currentStep={currentStepIndex}
          className="absolute top-4 right-4"
        />
      )}

      {/* Accessibility announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Step {currentStepIndex + 1} of {guide.steps.length}: {currentStep.title}
      </div>
    </div>
  );
};