import React, { useState } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface ViewerControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onGoToStep: (stepIndex: number) => void;
  currentStep: number;
  totalSteps: number;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
  canGoNext: boolean;
  canGoPrevious: boolean;
  className?: string;
  embedded?: boolean;
}

export const ViewerControls: React.FC<ViewerControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onNext,
  onPrevious,
  onGoToStep,
  currentStep,
  totalSteps,
  playbackSpeed,
  onSpeedChange,
  onFullscreen,
  isFullscreen,
  canGoNext,
  canGoPrevious,
  className = '',
  embedded = false
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showStepList, setShowStepList] = useState(false);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  return (
    <div className={`viewer-controls bg-white border-t border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Left controls */}
        <div className="flex items-center space-x-2">
          {/* Previous button */}
          <button
            onClick={onPrevious}
            onKeyDown={(e) => handleKeyDown(e, onPrevious)}
            disabled={!canGoPrevious}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous step"
            title="Previous step (Left arrow)"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          {/* Play/Pause button */}
          <button
            onClick={onTogglePlay}
            onKeyDown={(e) => handleKeyDown(e, onTogglePlay)}
            className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <PauseIcon className="w-5 h-5" />
            ) : (
              <PlayIcon className="w-5 h-5" />
            )}
          </button>

          {/* Next button */}
          <button
            onClick={onNext}
            onKeyDown={(e) => handleKeyDown(e, onNext)}
            disabled={!canGoNext}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next step"
            title="Next step (Right arrow)"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Center - Step indicator and progress */}
        <div className="flex items-center space-x-4">
          {/* Step counter */}
          <button
            onClick={() => setShowStepList(!showStepList)}
            onKeyDown={(e) => handleKeyDown(e, () => setShowStepList(!showStepList))}
            className="text-sm font-medium text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            aria-label={`Step ${currentStep + 1} of ${totalSteps}. Click to see all steps`}
          >
            {currentStep + 1} / {totalSteps}
          </button>

          {/* Step list dropdown */}
          {showStepList && (
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
              <div className="p-2">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Go to step:</h3>
                {Array.from({ length: totalSteps }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onGoToStep(i);
                      setShowStepList(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors ${
                      i === currentStep ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                    aria-label={`Go to step ${i + 1}`}
                  >
                    Step {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center space-x-2">
          {/* Settings button */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              onKeyDown={(e) => handleKeyDown(e, () => setShowSettings(!showSettings))}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Playback settings"
              title="Settings"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>

            {/* Settings dropdown */}
            {showSettings && (
              <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 min-w-48">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Playback Speed</h3>
                <div className="space-y-1">
                  {speedOptions.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        onSpeedChange(speed);
                        setShowSettings(false);
                      }}
                      className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 transition-colors ${
                        speed === playbackSpeed ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                      aria-label={`Set playback speed to ${speed}x`}
                    >
                      {speed}x {speed === 1 ? '(Normal)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen button (only in non-embedded mode) */}
          {!embedded && (
            <button
              onClick={onFullscreen}
              onKeyDown={(e) => handleKeyDown(e, onFullscreen)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen (Escape)' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="w-5 h-5" />
              ) : (
                <ArrowsPointingOutIcon className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showSettings || showStepList) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowSettings(false);
            setShowStepList(false);
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};