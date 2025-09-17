import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { GuideViewer as GuideViewerComponent } from '../components/viewer/GuideViewer';
import { guideService } from '../services/guide.service';
import { Guide } from '../types/guide.types';

export const EmbeddedGuideViewer: React.FC = () => {
  const { guideId } = useParams<{ guideId: string }>();
  const [searchParams] = useSearchParams();
  
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stepParam = searchParams.get('step');
  const initialStep = stepParam ? parseInt(stepParam, 10) - 1 : 0;

  useEffect(() => {
    const loadGuide = async () => {
      if (!guideId) {
        setError('Guide ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const guideData = await guideService.getGuide(guideId);
        
        // Only allow public guides in embedded mode
        if (guideData.sharing.isPublic) {
          setGuide(guideData);
        } else {
          setError('This guide is not publicly accessible');
        }
      } catch (err: any) {
        console.error('Failed to load guide:', err);
        
        if (err.response?.status === 404) {
          setError('Guide not found');
        } else if (err.response?.status === 403) {
          setError('This guide is not publicly accessible');
        } else {
          setError('Failed to load guide');
        }
      } finally {
        setLoading(false);
      }
    };

    loadGuide();
  }, [guideId]);

  // Add message listener for parent window communication
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from allowed domains
      if (guide?.sharing.allowedDomains.length > 0 && 
          !guide.sharing.allowedDomains.includes(event.origin)) {
        return;
      }

      switch (event.data.type) {
        case 'GUIDE_RESIZE':
          // Handle resize requests from parent
          break;
        case 'GUIDE_NAVIGATE':
          // Handle navigation requests from parent
          if (event.data.step && guide) {
            const stepIndex = Math.max(0, Math.min(event.data.step - 1, guide.steps.length - 1));
            // Update step (would need to pass this to GuideViewerComponent)
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notify parent that embed is ready
    window.parent.postMessage({
      type: 'GUIDE_READY',
      guideId,
      totalSteps: guide?.steps.length || 0
    }, '*');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [guide, guideId]);

  const handleComplete = () => {
    // Notify parent window of completion
    window.parent.postMessage({
      type: 'GUIDE_COMPLETED',
      guideId
    }, '*');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading guide...</p>
        </div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50">
        <div className="text-center max-w-sm mx-auto p-4">
          <div className="w-12 h-12 mx-auto mb-3 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-1">Unable to load guide</h2>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="embedded-guide-viewer bg-white">
      <GuideViewerComponent
        guide={guide}
        onComplete={handleComplete}
        embedded={true}
        className="h-full"
      />
    </div>
  );
};