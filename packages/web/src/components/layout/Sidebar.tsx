import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  ShareIcon,
  ChartBarIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/auth.store';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'My Guides', href: '/guides', icon: DocumentTextIcon },
  { name: 'Record', href: '/record', icon: VideoCameraIcon },
  { name: 'Shared', href: '/shared', icon: ShareIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col w-64 bg-gray-50 border-r border-gray-200">
      {/* User info */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-900">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-gray-500 capitalize">
            {user?.planType} Plan
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                group flex items-center px-2 py-2 text-sm font-medium rounded-md
                ${
                  isActive
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <item.icon
                className={`
                  mr-3 h-5 w-5 flex-shrink-0
                  ${
                    isActive
                      ? 'text-blue-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }
                `}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade prompt for free users */}
      {user?.planType === 'free' && (
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900">
              Upgrade to Pro
            </h3>
            <p className="text-xs text-blue-700 mt-1">
              Unlock unlimited guides and advanced features
            </p>
            <Link
              to="/upgrade"
              className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};