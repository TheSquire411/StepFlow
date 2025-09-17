import React, { useState, useEffect, useRef } from 'react';
import { ProcessedStep, GuideSettings, Annotation } from '../../types/guide.types';
import { AnnotationRenderer } from './AnnotationRenderer';
import { LazyImage } from '../common/LazyImage';

interface StepViewerProps {
  step: ProcessedStep;
  stepNumber: number;
  totalSteps: number;
  settings: GuideSettings;
  isPlaying: boolean;
  className?: string;
}

export const StepViewer: React.FC<StepViewerProps> = ({
  step,
  stepNumber,
  totalSteps,
  settings,
  isPlaying,
  className = ''
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Handle audio playback
  useEffect(() => {
    if (step.audioUrl && audioRef.current) {
      if (isPlaying && settings.autoPlay) {
        audioRef.current.play().catch(console.error);
        setAudioPlaying(true);
      } else {
        audioRef.current.pause();
        setAudioPlaying(false);
      }
    }
  }, [isPlaying, step.audioUrl, settings.autoPlay]);

  // Reset states when step changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setAudioPlaying(false);
  }, [step.id]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleAudioPlay = () => {
    setAudioPlaying(true);
  };

  const handleAudioPause = () => {
    setAudioPlaying(false);
  };

  const handleAudioEnded = () => {
    setAudioPlaying(false);
  };

  return (
    <div 
      className={`step-viewer ${className}`}
      style={{
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize ? `${settings.fontSize}px` : undefined,
        '--primary-color': settings.brandColors[0],
        '--secondary-color': settings.brandColors[1]
      } as React.CSSProperties}
    >
      {/* Step header */}
      <div className="step-header mb-6">
        {settings.showStepNumbers && (
          <div 
            className="step-number inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm mb-2"
            style={{ backgroundColor: settings.brandColors[0] || '#3B82F6' }}
            aria-label={`Step ${stepNumber} of ${totalSteps}`}
          >
            {stepNumber}
          </div>
        )}
        
        <h2 
          className="step-title text-2xl font-bold mb-2"
          style={{ color: settings.brandColors[0] || '#1F2937' }}
        >
          {step.title}
        </h2>
        
        <p className="step-description text-gray-600 leading-relaxed">
          {step.description}
        </p>
      </div>

      {/* Screenshot with annotations */}
      <div className="step-screenshot relative bg-gray-100 rounded-lg overflow-hidden">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>Image failed to load</p>
            </div>
          </div>
        )}
        
        <LazyImage
          src={step.screenshotUrl}
          alt={`Screenshot for step: ${step.title}`}
          className="w-full h-auto"
          onLoad={handleImageLoad}
          onError={handleImageError}
          threshold={0.1}
          rootMargin="100px"
        />
        
        {/* Annotations overlay */}
        {imageLoaded && step.annotations.length > 0 && (
          <AnnotationRenderer
            annotations={step.annotations}
            imageRef={imageRef}
            className="absolute inset-0"
          />
        )}
      </div>

      {/* Audio controls */}
      {step.audioUrl && (
        <div className="step-audio mt-4">
          <audio
            ref={audioRef}
            src={step.audioUrl}
            onPlay={handleAudioPlay}
            onPause={handleAudioPause}
            onEnded={handleAudioEnded}
            controls
            className="w-full"
            aria-label={`Audio narration for step: ${step.title}`}
          >
            Your browser does not support the audio element.
          </audio>
          
          {audioPlaying && (
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <div className="animate-pulse w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              Playing audio narration
            </div>
          )}
        </div>
      )}

      {/* Brand logo */}
      {settings.logoUrl && (
        <div className="step-branding mt-6 flex justify-center">
          <img
            src={settings.logoUrl}
            alt="Brand logo"
            className="h-8 opacity-60"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
};