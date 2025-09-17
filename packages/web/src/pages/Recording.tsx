import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecordingControls } from '../components/recording/RecordingControls';
import { recordingService, Recording } from '../services/recording.service';
import { 
  DocumentTextIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

export function RecordingPage() {
  const navigate = useNavigate();
  const [isExtensionAvailable, setIsExtensionAvailable] = useState<boolean | null>(null);
  const [completedRecording, setCompletedRecording] = useState<Recording | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkExtensionAvailability();
  }, []);

  const checkExtensionAvailability = async () => {
    try {
      const available = await recordingService.isExtensionAvailable();
      setIsExtensionAvailable(available);
    } catch (error) {
      setIsExtensionAvailable(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      setError(null);
      
      if (!recordingService.isScreenRecordingSupported()) {
        throw new Error('Screen recording is not supported in this browser. Please use Chrome, Firefox, or Edge.');
      }

      const session = await recordingService.startRecording({
        title: `Recording ${new Date().toLocaleString()}`,
        description: 'Workflow recording created from web app',
        metadata: {
          source: 'web-app',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });

      console.log('Recording started:', session);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      setError(null);
      const recording = await recordingService.stopRecording();
      setCompletedRecording(recording);
      console.log('Recording completed:', recording);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to stop recording');
    }
  };

  const handlePauseRecording = async () => {
    try {
      setError(null);
      await recordingService.pauseRecording();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to pause recording');
    }
  };

  const handleResumeRecording = async () => {
    try {
      setError(null);
      await recordingService.resumeRecording();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to resume recording');
    }
  };

  const handleViewRecording = () => {
    if (completedRecording) {
      navigate(`/recordings/${completedRecording.id}`);
    }
  };

  const handleCreateGuide = () => {
    if (completedRecording) {
      navigate(`/guides/create?recordingId=${completedRecording.id}`);
    }
  };

  if (completedRecording) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Recording Complete!</h1>
          <p className="text-gray-600 mb-6">
            Your workflow has been successfully recorded and is now being processed.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">{completedRecording.title}</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Duration: {Math.round(completedRecording.duration)} seconds</p>
              <p>Status: {completedRecording.status}</p>
              <p>Created: {new Date(completedRecording.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleCreateGuide}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Create Guide
            </button>
            
            <button
              onClick={handleViewRecording}
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Recording
            </button>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Recording</h1>
        <p className="mt-2 text-gray-600">
          Record your workflow to create step-by-step documentation automatically.
        </p>
      </div>

      {/* Browser compatibility check */}
      {!recordingService.isScreenRecordingSupported() && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Browser Not Supported</h3>
              <p className="text-sm text-red-700 mt-1">
                Screen recording requires Chrome, Firefox, or Edge browser with screen capture support.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Extension availability check */}
      {isExtensionAvailable === false && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Extension Recommended</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Install the StepFlow browser extension for enhanced step detection and interaction capture.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Recording controls */}
      <RecordingControls
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onPauseRecording={handlePauseRecording}
        onResumeRecording={handleResumeRecording}
        className="mb-8"
      />

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">How to Record</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">1</span>
            <p>Click "Start Recording" and select the screen or window you want to capture.</p>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">2</span>
            <p>Perform your workflow naturally. StepFlow will automatically detect your actions and capture screenshots.</p>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">3</span>
            <p>Click "Stop Recording" when finished. Your recording will be processed and ready to convert into a guide.</p>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Pro Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Move slowly and deliberately for better step detection</li>
            <li>• Use clear, descriptive actions (click buttons, fill forms, etc.)</li>
            <li>• Avoid rapid mouse movements or excessive scrolling</li>
            <li>• Install the browser extension for enhanced capture capabilities</li>
          </ul>
        </div>
      </div>
    </div>
  );
}