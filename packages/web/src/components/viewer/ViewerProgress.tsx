import React from 'react';

interface ViewerProgressProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
  className?: string;
}

export const ViewerProgress: React.FC<ViewerProgressProps> = ({
  currentStep,
  totalSteps,
  progress,
  className = ''
}) => {
  return (
    <div className={`viewer-progress ${className}`}>
      {/* Progress bar */}
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div
            className="bg-blue-500 h-1 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Guide progress: ${Math.round(progress)}% complete`}
          />
        </div>

        {/* Step indicators */}
        <div className="absolute top-0 left-0 w-full h-1 flex justify-between">
          {Array.from({ length: totalSteps }, (_, index) => {
            const stepProgress = (index / (totalSteps - 1)) * 100;
            const isCompleted = index < currentStep - 1;
            const isCurrent = index === currentStep - 1;
            
            return (
              <div
                key={index}
                className={`w-3 h-3 rounded-full border-2 transform -translate-y-1 transition-colors duration-200 ${
                  isCompleted
                    ? 'bg-blue-500 border-blue-500'
                    : isCurrent
                    ? 'bg-white border-blue-500'
                    : 'bg-white border-gray-300'
                }`}
                style={{ left: `${stepProgress}%`, marginLeft: '-6px' }}
                title={`Step ${index + 1}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
                aria-label={`Step ${index + 1}${isCompleted ? ' completed' : isCurrent ? ' current' : ' upcoming'}`}
              />
            );
          })}
        </div>
      </div>

      {/* Progress text */}
      <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{Math.round(progress)}% complete</span>
      </div>
    </div>
  );
};