import React from 'react';
import { Layout } from '../components/layout/Layout';
import { useAuthStore } from '../stores/auth.store';
import { 
  PlusIcon, 
  DocumentTextIcon, 
  VideoCameraIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();

  const stats = [
    { name: 'Total Guides', value: '0', icon: DocumentTextIcon },
    { name: 'Recordings', value: '0', icon: VideoCameraIcon },
    { name: 'Views This Month', value: '0', icon: ChartBarIcon },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="mt-2 text-gray-600">
            Ready to create your next step-by-step guide? Start by recording your workflow.
          </p>
          <div className="mt-4">
            <button 
              onClick={() => window.location.href = '/recording'}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Start Recording
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <stat.icon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent guides */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Guides</h2>
          </div>
          <div className="p-6">
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No guides yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first step-by-step guide.
              </p>
              <div className="mt-6">
                <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};