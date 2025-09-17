import { useCallback, useRef } from 'react';
import { apiClient } from '../services/api.service';

interface ViewerAnalytics {
  trackView: () => void;
  trackStepView: (stepIndex: number) => void;
  trackCompletion: () => void;
  trackEngagement: (action: string, data?: any) => void;
}

export const useViewerAnalytics = (guideId: string): ViewerAnalytics => {
  const sessionStartTime = useRef<number>(Date.now());
  const stepStartTimes = useRef<Map<number, number>>(new Map());
  const viewTracked = useRef<boolean>(false);
  const completionTracked = useRef<boolean>(false);

  const trackView = useCallback(() => {
    if (viewTracked.current) return;
    
    viewTracked.current = true;
    sessionStartTime.current = Date.now();

    // Track guide view
    apiClient.post(`/guides/${guideId}/analytics/view`, {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }).catch(error => {
      console.warn('Failed to track guide view:', error);
    });
  }, [guideId]);

  const trackStepView = useCallback((stepIndex: number) => {
    const now = Date.now();
    
    // Track time spent on previous step
    const previousStepTimes = Array.from(stepStartTimes.current.entries());
    const lastStepEntry = previousStepTimes[previousStepTimes.length - 1];
    
    if (lastStepEntry) {
      const [lastStepIndex, startTime] = lastStepEntry;
      const timeSpent = now - startTime;
      
      apiClient.post(`/guides/${guideId}/analytics/step-time`, {
        stepIndex: lastStepIndex,
        timeSpent,
        timestamp: new Date().toISOString()
      }).catch(error => {
        console.warn('Failed to track step time:', error);
      });
    }

    // Set start time for current step
    stepStartTimes.current.set(stepIndex, now);

    // Track step view
    apiClient.post(`/guides/${guideId}/analytics/step-view`, {
      stepIndex,
      timestamp: new Date().toISOString()
    }).catch(error => {
      console.warn('Failed to track step view:', error);
    });
  }, [guideId]);

  const trackCompletion = useCallback(() => {
    if (completionTracked.current) return;
    
    completionTracked.current = true;
    const totalTime = Date.now() - sessionStartTime.current;

    apiClient.post(`/guides/${guideId}/analytics/completion`, {
      totalTime,
      timestamp: new Date().toISOString(),
      completedSteps: Array.from(stepStartTimes.current.keys()).length
    }).catch(error => {
      console.warn('Failed to track completion:', error);
    });
  }, [guideId]);

  const trackEngagement = useCallback((action: string, data?: any) => {
    apiClient.post(`/guides/${guideId}/analytics/engagement`, {
      action,
      data,
      timestamp: new Date().toISOString()
    }).catch(error => {
      console.warn('Failed to track engagement:', error);
    });
  }, [guideId]);

  return {
    trackView,
    trackStepView,
    trackCompletion,
    trackEngagement
  };
};