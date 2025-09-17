import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  StopIcon, 
  PauseIcon,
  VideoCameraIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
}

interface RecordingControlsProps {
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<void>;
  onPauseRecording: () => Promise<void>;
  onResumeRecording: () => Promise<void>;
  className?: string;
}

export function RecordingControls({
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  className = ''
}: RecordingControlsProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null
  });

  const [isLoading, setIsLoading] = useState(false);

  // Update duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (recordingState.isRecording && !recordingState.isPaused) {
      interval = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [recordingState.isRecording, recordingState.isPaused]);

  const handleStartRecording = async () => {
    try {
      setIsLoading(true);
      setRecordingState(prev => ({ ...prev, error: null }));
      
      await onStartRecording();
      
      setRecordingState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        error: null
      });
    } catch (error) {
      setRecordingState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start recording'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsLoading(true);
      await onStopRecording();
      
      setRecordingState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        error: null
      });
    } catch (error) {
      setRecordingState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop recording'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseRecording = async () => {
    try {
      setIsLoading(true);
      await onPauseRecording();
      
      setRecordingState(prev => ({
        ...prev,
        isPaused: true
      }));
    } catch (error) {
      setRecordingState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to pause recording'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeRecording = async () => {
    try {
      setIsLoading(true);
      await onResumeRecording();
      
      setRecordingState(prev => ({
        ...prev,
        isPaused: false
      }));
    } catch (error) {
      setRecordingState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to resume recording'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Screen Recording</h3>
        
        {recordingState.isRecording && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className={`w-3 h-3 rounded-full ${recordingState.isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {recordingState.isPaused ? 'PAUSED' : 'RECORDING'}
              </span>
            </div>
            <span className="text-sm font-mono text-gray-600">
              {formatDuration(recordingState.duration)}
            </span>
          </div>
        )}
      </div>

      {recordingState.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{recordingState.error}</p>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-3">
        {!recordingState.isRecording ? (
          <button
            onClick={handleStartRecording}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <VideoCameraIcon className="h-4 w-4 mr-2" />
            )}
            Start Recording
          </button>
        ) : (
          <>
            {recordingState.isPaused ? (
              <button
                onClick={handleResumeRecording}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <PlayIcon className="h-4 w-4 mr-2" />
                )}
                Resume
              </button>
            ) : (
              <button
                onClick={handlePauseRecording}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <PauseIcon className="h-4 w-4 mr-2" />
                )}
                Pause
              </button>
            )}
            
            <button
              onClick={handleStopRecording}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <StopIcon className="h-4 w-4 mr-2" />
              )}
              Stop Recording
            </button>
          </>
        )}
      </div>

      {!recordingState.isRecording && (
        <div className="mt-4 text-sm text-gray-500">
          <p>Click "Start Recording" to begin capturing your workflow. Make sure you have the StepFlow browser extension installed for the best experience.</p>
        </div>
      )}
    </div>
  );
}