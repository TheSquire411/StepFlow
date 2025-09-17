import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';

interface SystemHealthData {
  services: ServiceHealth[];
  metrics: SystemMetrics;
  alerts: SystemAlert[];
  uptime: number;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastCheck: string;
  endpoint: string;
  details?: string;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    inbound: number;
    outbound: number;
  };
  database: {
    connections: number;
    queryTime: number;
  };
  redis: {
    memory: number;
    connections: number;
  };
}

interface SystemAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export const SystemHealth: React.FC = () => {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchHealthData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchHealthData, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchHealthData = async () => {
    try {
      const data = await adminService.getSystemHealth();
      setHealthData(data);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'warning': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-100 border-red-200';
      case 'critical': return 'text-red-800 bg-red-200 border-red-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-48 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load system health data</p>
        <button
          onClick={fetchHealthData}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">System Health</h2>
          <p className="text-gray-600">Monitor system performance and service status</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
          </label>
          <button
            onClick={fetchHealthData}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">⏱️</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Uptime</p>
              <p className="text-lg font-bold text-gray-900">
                {Math.floor(healthData.uptime / 3600)}h {Math.floor((healthData.uptime % 3600) / 60)}m
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🖥️</div>
            <div>
              <p className="text-sm font-medium text-gray-600">CPU Usage</p>
              <p className="text-lg font-bold text-gray-900">{healthData.metrics.cpu.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">💾</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Memory Usage</p>
              <p className="text-lg font-bold text-gray-900">{healthData.metrics.memory.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">💿</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Disk Usage</p>
              <p className="text-lg font-bold text-gray-900">{healthData.metrics.disk.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Status</h3>
          <div className="space-y-3">
            {healthData.services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(service.status)}`}>
                    {service.status}
                  </span>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <p className="text-xs text-gray-500">{service.endpoint}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-900">{service.responseTime}ms</p>
                  <p className="text-xs text-gray-500">
                    {new Date(service.lastCheck).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Metrics */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>CPU Usage</span>
                <span>{healthData.metrics.cpu.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    healthData.metrics.cpu > 80 ? 'bg-red-500' :
                    healthData.metrics.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${healthData.metrics.cpu}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Memory Usage</span>
                <span>{healthData.metrics.memory.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    healthData.metrics.memory > 80 ? 'bg-red-500' :
                    healthData.metrics.memory > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${healthData.metrics.memory}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Disk Usage</span>
                <span>{healthData.metrics.disk.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    healthData.metrics.disk > 80 ? 'bg-red-500' :
                    healthData.metrics.disk > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${healthData.metrics.disk}%` }}
                ></div>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Database</p>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Connections: {healthData.metrics.database.connections}</span>
                <span>Avg Query: {healthData.metrics.database.queryTime}ms</span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Redis</p>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Memory: {healthData.metrics.redis.memory.toFixed(1)}%</span>
                <span>Connections: {healthData.metrics.redis.connections}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
        {healthData.alerts.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No active alerts</p>
        ) : (
          <div className="space-y-3">
            {healthData.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 border rounded-lg ${getAlertColor(alert.level)} ${
                  alert.resolved ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">
                      {alert.level === 'critical' ? '🚨' :
                       alert.level === 'error' ? '❌' :
                       alert.level === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm opacity-75">
                        {new Date(alert.timestamp).toLocaleString()}
                        {alert.resolved && ' (Resolved)'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    alert.level === 'critical' ? 'bg-red-200 text-red-800' :
                    alert.level === 'error' ? 'bg-red-100 text-red-700' :
                    alert.level === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {alert.level.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};