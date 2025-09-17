import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { GuideViewer as GuideViewerComponent } from '../components/viewer/GuideViewer';
import { guideService } from '../services/guide.service';
import { Guide } from '../types/guide.types';
import { useAuthStore } from '../stores/auth.store';

export const GuideViewer: React.FC = () => {
  const { guideId } = useParams<{ guideId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

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
        
        // Check if user has access to this guide
        if (guideData.sharing.isPublic || 
            (user && guideData.userId === user.id) ||
            (user && guideData.sharing.permissions.some(p => p.email === user.email || p.userId === user.id))) {
          setGuide(guideData);
        } else {
          setAccessDenied(true);
        }
      } catch (err: any) {
        console.error('Failed to load guide:', err);
        
        if (err.response?.status === 404) {
          setError('Guide not found');
        } else if (err.response?.status === 403) {
          setAccessDenied(true);
        } else {
          setError('Failed to load guide. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadGuide();
  }, [guideId, user]);

  const handleComplete = () => {
    // Could redirect to a completion page or show a completion modal
    console.log('Guide completed!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading guide...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to view this guide. Please contact the guide owner for access.
          </p>
          {!user && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                If you have an account, try signing in to access this guide.
              </p>
              <div className="space-x-3">
                <a
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Sign In
                </a>
                <a
                  href="/register"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Sign Up
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 mx-auto mb-4 text-red-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!guide) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="guide-viewer-page min-h-screen bg-gray-50">
      <GuideViewerComponent
        guide={guide}
        onComplete={handleComplete}
        className="h-screen flex flex-col"
      />
    </div>
  );
};