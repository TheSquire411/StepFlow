import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { AdminStats } from '../../components/admin/AdminStats';
import { UserManagement } from '../../components/admin/UserManagement';
import { ContentModeration } from '../../components/admin/ContentModeration';
import { SystemHealth } from '../../components/admin/SystemHealth';
import { SupportTickets } from '../../components/admin/SupportTickets';
import { SystemConfig } from '../../components/admin/SystemConfig';

interface AdminTab {
  id: string;
  label: string;
  component: React.ComponentType;
}

const adminTabs: AdminTab[] = [
  { id: 'overview', label: 'Overview', component: AdminStats },
  { id: 'users', label: 'User Management', component: UserManagement },
  { id: 'content', label: 'Content Moderation', component: ContentModeration },
  { id: 'health', label: 'System Health', component: SystemHealth },
  { id: 'support', label: 'Support Tickets', component: SupportTickets },
  { id: 'config', label: 'System Config', component: SystemConfig },
];

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has admin privileges
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  const ActiveComponent = adminTabs.find(tab => tab.id === activeTab)?.component || AdminStats;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage users, content, and system configuration
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {adminTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
};