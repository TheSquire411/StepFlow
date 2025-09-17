import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalGuides: number;
  totalRecordings: number;
  storageUsed: number;
  systemUptime: number;
  pendingTickets: number;
  flaggedContent: number;
}

export const AdminStats: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminService.getSystemStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load system statistics</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: '👥',
      color: 'bg-blue-500',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers.toLocaleString(),
      icon: '🟢',
      color: 'bg-green-500',
    },
    {
      title: 'Total Guides',
      value: stats.totalGuides.toLocaleString(),
      icon: '📚',
      color: 'bg-purple-500',
    },
    {
      title: 'Total Recordings',
      value: stats.totalRecordings.toLocaleString(),
      icon: '🎥',
      color: 'bg-red-500',
    },
    {
      title: 'Storage Used',
      value: `${(stats.storageUsed / 1024 / 1024 / 1024).toFixed(1)} GB`,
      icon: '💾',
      color: 'bg-yellow-500',
    },
    {
      title: 'System Uptime',
      value: `${Math.floor(stats.systemUptime / 3600)}h`,
      icon: '⏱️',
      color: 'bg-indigo-500',
    },
    {
      title: 'Pending Tickets',
      value: stats.pendingTickets.toString(),
      icon: '🎫',
      color: 'bg-orange-500',
    },
    {
      title: 'Flagged Content',
      value: stats.flaggedContent.toString(),
      icon: '🚩',
      color: 'bg-pink-500',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">System Overview</h2>
        <p className="text-gray-600">Real-time statistics and system health metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className={`${card.color} rounded-lg p-3 text-white text-xl mr-4`}>
                {card.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              <span className="text-gray-600">New user registration: john@example.com</span>
              <span className="ml-auto text-gray-400">2 min ago</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              <span className="text-gray-600">Guide published: "How to Setup API"</span>
              <span className="ml-auto text-gray-400">5 min ago</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
              <span className="text-gray-600">Support ticket created: #1234</span>
              <span className="ml-auto text-gray-400">12 min ago</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="text-yellow-600 mr-3">⚠️</span>
              <div>
                <p className="text-sm font-medium text-yellow-800">High Storage Usage</p>
                <p className="text-xs text-yellow-600">Storage is at 85% capacity</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-green-600 mr-3">✅</span>
              <div>
                <p className="text-sm font-medium text-green-800">All Systems Operational</p>
                <p className="text-xs text-green-600">No critical issues detected</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};