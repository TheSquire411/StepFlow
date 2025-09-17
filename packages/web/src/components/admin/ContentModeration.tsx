import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';

interface FlaggedContent {
  id: string;
  type: 'guide' | 'recording';
  title: string;
  userId: string;
  userEmail: string;
  reason: string;
  flaggedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'removed';
  reviewedBy?: string;
  reviewedAt?: string;
  content: {
    description?: string;
    thumbnailUrl?: string;
    guideUrl?: string;
  };
}

export const ContentModeration: React.FC = () => {
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedContent, setSelectedContent] = useState<string[]>([]);

  useEffect(() => {
    fetchFlaggedContent();
  }, [filterStatus, filterType]);

  const fetchFlaggedContent = async () => {
    try {
      setLoading(true);
      const data = await adminService.getFlaggedContent({
        status: filterStatus === 'all' ? undefined : filterStatus,
        type: filterType === 'all' ? undefined : filterType,
      });
      setFlaggedContent(data);
    } catch (error) {
      console.error('Failed to fetch flagged content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContentAction = async (contentId: string, action: 'approve' | 'reject' | 'remove') => {
    try {
      await adminService.moderateContent(contentId, action);
      await fetchFlaggedContent();
    } catch (error) {
      console.error(`Failed to ${action} content:`, error);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'remove') => {
    try {
      await adminService.bulkModerateContent(selectedContent, action);
      setSelectedContent([]);
      await fetchFlaggedContent();
    } catch (error) {
      console.error(`Failed to ${action} content:`, error);
    }
  };

  const toggleContentSelection = (contentId: string) => {
    setSelectedContent(prev =>
      prev.includes(contentId)
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId]
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Content Moderation</h2>
        <p className="text-gray-600">Review and moderate flagged content and user reports</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="removed">Removed</option>
          <option value="all">All Status</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="guide">Guides</option>
          <option value="recording">Recordings</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedContent.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedContent.length} item(s) selected
            </span>
            <div className="space-x-2">
              <button
                onClick={() => handleBulkAction('approve')}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => handleBulkAction('reject')}
                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
              >
                Reject
              </button>
              <button
                onClick={() => handleBulkAction('remove')}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-pulse">Loading flagged content...</div>
          </div>
        ) : flaggedContent.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No flagged content found
          </div>
        ) : (
          flaggedContent.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  checked={selectedContent.includes(item.id)}
                  onChange={() => toggleContentSelection(item.id)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                
                {item.content.thumbnailUrl && (
                  <img
                    src={item.content.thumbnailUrl}
                    alt="Content thumbnail"
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                )}
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-600">
                        {item.type} by {item.userEmail}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        item.status === 'approved' ? 'bg-green-100 text-green-800' :
                        item.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.type === 'guide' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Reason:</strong> {item.reason}
                    </p>
                    {item.content.description && (
                      <p className="text-sm text-gray-700">
                        <strong>Description:</strong> {item.content.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Flagged on {new Date(item.flaggedAt).toLocaleDateString()}</span>
                    {item.reviewedBy && item.reviewedAt && (
                      <span>
                        Reviewed by {item.reviewedBy} on {new Date(item.reviewedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  
                  {item.status === 'pending' && (
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => handleContentAction(item.id, 'approve')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleContentAction(item.id, 'reject')}
                        className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleContentAction(item.id, 'remove')}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                      {item.content.guideUrl && (
                        <a
                          href={item.content.guideUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          View Content
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};