import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GuideEditor } from '../components/editor';
import { Guide } from '../types/guide.types';

// Mock data for development - replace with actual API calls
const mockGuide: Guide = {
  id: '1',
  userId: 'user1',
  recordingId: 'rec1',
  title: 'How to Create a New Project',
  description: 'A step-by-step guide on creating a new project in our platform',
  status: 'draft',
  createdAt: new Date(),
  updatedAt: new Date(),
  settings: {
    theme: 'default',
    brandColors: ['#3B82F6', '#1E40AF'],
    showStepNumbers: true,
    autoPlay: false,
    fontFamily: 'Inter, sans-serif',
    fontSize: 14
  },
  sharing: {
    isPublic: false,
    shareUrl: '',
    embedCode: '',
    allowedDomains: [],
    passwordProtected: false,
    permissions: []
  },
  analytics: {
    views: 0,
    uniqueViews: 0,
    completionRate: 0,
    averageTimeSpent: 0
  },
  steps: [
    {
      id: 'step1',
      order: 0,
      title: 'Navigate to Projects',
      description: 'Click on the Projects tab in the main navigation menu to access the projects section.',
      screenshotUrl: 'https://via.placeholder.com/800x600/f3f4f6/6b7280?text=Step+1+Screenshot',
      annotations: [
        {
          id: 'ann1',
          type: 'highlight',
          x: 10,
          y: 15,
          width: 15,
          height: 8,
          color: '#3B82F6'
        },
        {
          id: 'ann2',
          type: 'arrow',
          x: 30,
          y: 20,
          width: 10,
          height: 10,
          color: '#EF4444',
          rotation: 45
        }
      ]
    },
    {
      id: 'step2',
      order: 1,
      title: 'Click New Project Button',
      description: 'Locate and click the "New Project" button in the top-right corner of the projects page.',
      screenshotUrl: 'https://via.placeholder.com/800x600/f3f4f6/6b7280?text=Step+2+Screenshot',
      annotations: [
        {
          id: 'ann3',
          type: 'rectangle',
          x: 70,
          y: 10,
          width: 20,
          height: 12,
          color: '#10B981',
          strokeWidth: 3
        }
      ]
    },
    {
      id: 'step3',
      order: 2,
      title: 'Fill Project Details',
      description: 'Enter the project name, description, and select the appropriate template for your new project.',
      screenshotUrl: 'https://via.placeholder.com/800x600/f3f4f6/6b7280?text=Step+3+Screenshot',
      annotations: [
        {
          id: 'ann4',
          type: 'text',
          x: 25,
          y: 30,
          width: 30,
          height: 10,
          text: 'Enter project details here',
          color: '#1F2937'
        },
        {
          id: 'ann5',
          type: 'blur',
          x: 40,
          y: 60,
          width: 25,
          height: 15
        }
      ]
    }
  ]
};

export const GuideEditorPage: React.FC = () => {
  const { guideId } = useParams<{ guideId: string }>();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call to fetch guide
    const fetchGuide = async () => {
      try {
        setLoading(true);
        // In a real app, you would fetch the guide from your API
        // const response = await fetch(`/api/guides/${guideId}`);
        // const guideData = await response.json();
        
        // For now, use mock data
        setTimeout(() => {
          setGuide(mockGuide);
          setLoading(false);
        }, 500);
      } catch (err) {
        setError('Failed to load guide');
        setLoading(false);
      }
    };

    if (guideId) {
      fetchGuide();
    } else {
      setError('Guide ID is required');
      setLoading(false);
    }
  }, [guideId]);

  const handleSave = async (updatedGuide: Guide) => {
    try {
      // In a real app, you would save to your API
      // await fetch(`/api/guides/${updatedGuide.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(updatedGuide)
      // });
      
      console.log('Saving guide:', updatedGuide);
      setGuide(updatedGuide);
      
      // Show success message
      alert('Guide saved successfully!');
    } catch (err) {
      console.error('Failed to save guide:', err);
      alert('Failed to save guide. Please try again.');
    }
  };

  const handlePublish = async (updatedGuide: Guide) => {
    try {
      const publishedGuide = { ...updatedGuide, status: 'published' as const };
      
      // In a real app, you would publish to your API
      // await fetch(`/api/guides/${publishedGuide.id}/publish`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(publishedGuide)
      // });
      
      console.log('Publishing guide:', publishedGuide);
      setGuide(publishedGuide);
      
      // Show success message and redirect
      alert('Guide published successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to publish guide:', err);
      alert('Failed to publish guide. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading guide editor...</p>
        </div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Guide not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <GuideEditor
      guide={guide}
      onSave={handleSave}
      onPublish={handlePublish}
    />
  );
};