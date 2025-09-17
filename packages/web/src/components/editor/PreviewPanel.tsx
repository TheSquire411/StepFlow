import React, { useState } from 'react';
import { Guide } from '../../types/guide.types';
import { XMarkIcon, PlayIcon, PauseIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PreviewPanelProps {
  guide: Guide;
  onClose: () => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ guide, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleNextStep = () => {
    setCurrentStep(prev => Math.min(guide.steps.length - 1, prev + 1));
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const currentStepData = guide.steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{guide.title}</h2>
            <p className="text-sm text-gray-500">Preview Mode</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Step Content */}
          <div className="flex-1 flex flex-col">
            {/* Step Image */}
            <div className="flex-1 bg-gray-100 flex items-center justify-center p-4">
              {currentStepData?.screenshotUrl ? (
                <div className="relative max-w-full max-h-full">
                  <img
                    src={currentStepData.screenshotUrl}
                    alt={`Step ${currentStep + 1}`}
                    className="max-w-full max-h-full object-contain rounded shadow-lg"
                  />
                  
                  {/* Render Annotations */}
                  <div className="absolute inset-0">
                    {currentStepData.annotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${annotation.x}%`,
                          top: `${annotation.y}%`,
                          width: annotation.width ? `${annotation.width}%` : 'auto',
                          height: annotation.height ? `${annotation.height}%` : 'auto',
                        }}
                      >
                        {annotation.type === 'highlight' && (
                          <div
                            className="w-full h-full"
                            style={{
                              backgroundColor: annotation.color || '#3B82F6',
                              opacity: 0.3
                            }}
                          />
                        )}
                        
                        {annotation.type === 'rectangle' && (
                          <div
                            className="w-full h-full border-2"
                            style={{
                              borderColor: annotation.color || '#3B82F6',
                              backgroundColor: 'transparent'
                            }}
                          />
                        )}
                        
                        {annotation.type === 'blur' && (
                          <div
                            className="w-full h-full"
                            style={{
                              backdropFilter: 'blur(8px)',
                              backgroundColor: 'rgba(0, 0, 0, 0.1)'
                            }}
                          />
                        )}
                        
                        {annotation.type === 'arrow' && (
                          <svg
                            width="40"
                            height="40"
                            viewBox="0 0 40 40"
                            style={{ transform: `rotate(${annotation.rotation || 0}deg)` }}
                          >
                            <path
                              d="M5 20 L30 20 M25 15 L30 20 L25 25"
                              stroke={annotation.color || '#3B82F6'}
                              strokeWidth={annotation.strokeWidth || 2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </svg>
                        )}
                        
                        {annotation.type === 'text' && annotation.text && (
                          <div
                            className="px-2 py-1 bg-white border rounded shadow-sm text-sm font-medium"
                            style={{ color: annotation.color || '#1F2937' }}
                          >
                            {annotation.text}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">No screenshot available</div>
              )}
            </div>

            {/* Step Controls */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handlePrevStep}
                    disabled={currentStep === 0}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  
                  <button
                    onClick={handlePlayPause}
                    className="p-2 text-blue-600 hover:text-blue-700"
                  >
                    {isPlaying ? (
                      <PauseIcon className="h-5 w-5" />
                    ) : (
                      <PlayIcon className="h-5 w-5" />
                    )}
                  </button>
                  
                  <button
                    onClick={handleNextStep}
                    disabled={currentStep === guide.steps.length - 1}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Step {currentStep + 1} of {guide.steps.length}
                  </span>
                  
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / guide.steps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step Details Sidebar */}
          <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {currentStepData?.title || `Step ${currentStep + 1}`}
              </h3>
              
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700">
                  {currentStepData?.description || 'No description available.'}
                </p>
              </div>

              {/* Audio Playback */}
              {currentStepData?.audioUrl && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Audio Narration</h4>
                  <audio controls className="w-full">
                    <source src={currentStepData.audioUrl} type="audio/mpeg" />
                  </audio>
                </div>
              )}

              {/* Annotations List */}
              {currentStepData?.annotations && currentStepData.annotations.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Annotations</h4>
                  <div className="space-y-2">
                    {currentStepData.annotations.map((annotation, index) => (
                      <div key={annotation.id} className="p-2 bg-white rounded border text-sm">
                        <div className="flex items-center justify-between">
                          <span className="capitalize font-medium">{annotation.type}</span>
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: annotation.color || '#3B82F6' }}
                          />
                        </div>
                        {annotation.text && (
                          <p className="text-gray-600 mt-1">{annotation.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};