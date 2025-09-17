import React, { useState, useEffect } from 'react';
import { UserPlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

interface SharePermission {
  id: string;
  guideId: string;
  userId?: string;
  email?: string;
  role: 'viewer' | 'editor' | 'admin';
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

interface PermissionsManagerProps {
  guideId: string;
}

export const PermissionsManager: React.FC<PermissionsManagerProps> = ({ guideId }) => {
  const [permissions, setPermissions] = useState<SharePermission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState<string | null>(null);

  // Form state
  const [newPermission, setNewPermission] = useState({
    email: '',
    role: 'viewer' as 'viewer' | 'editor' | 'admin',
    expiresAt: '',
  });

  useEffect(() => {
    loadPermissions();
  }, [guideId]);

  const loadPermissions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/sharing/guides/${guideId}/permissions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPermissions(data.data);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addPermission = async () => {
    try {
      setIsLoading(true);
      const payload = {
        email: newPermission.email,
        role: newPermission.role,
        expiresAt: newPermission.expiresAt ? new Date(newPermission.expiresAt) : undefined,
      };

      const response = await fetch(`/api/v1/sharing/guides/${guideId}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setPermissions(prev => [...prev, data.data]);
        setNewPermission({ email: '', role: 'viewer', expiresAt: '' });
        setShowAddForm(false);
      } else {
        throw new Error('Failed to add permission');
      }
    } catch (error) {
      console.error('Failed to add permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePermission = async (permissionId: string, updates: Partial<SharePermission>) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/sharing/permissions/${permissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setPermissions(prev => 
          prev.map(p => p.id === permissionId ? data.data : p)
        );
        setEditingPermission(null);
      } else {
        throw new Error('Failed to update permission');
      }
    } catch (error) {
      console.error('Failed to update permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deletePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to remove this permission?')) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/sharing/permissions/${permissionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        setPermissions(prev => prev.filter(p => p.id !== permissionId));
      } else {
        throw new Error('Failed to delete permission');
      }
    } catch (error) {
      console.error('Failed to delete permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'editor':
        return 'bg-yellow-100 text-yellow-800';
      case 'viewer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  const isExpired = (expiresAt?: Date | string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Permissions</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserPlusIcon className="h-4 w-4 mr-2" />
          Add Person
        </button>
      </div>

      {/* Add Permission Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-md space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Add New Permission</h4>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={newPermission.email}
                onChange={(e) => setNewPermission(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                value={newPermission.role}
                onChange={(e) => setNewPermission(prev => ({ ...prev, role: e.target.value as any }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Expires (Optional)</label>
              <input
                type="date"
                value={newPermission.expiresAt}
                onChange={(e) => setNewPermission(prev => ({ ...prev, expiresAt: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={addPermission}
              disabled={!newPermission.email || isLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Add Permission
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewPermission({ email: '', role: 'viewer', expiresAt: '' });
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Permissions List */}
      {isLoading && permissions.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : permissions.length === 0 ? (
        <div className="text-center py-8">
          <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No permissions</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding people to share this guide with.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {permissions.map((permission) => (
              <li key={permission.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {(permission.email || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {permission.email || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Added {formatDate(permission.grantedAt)}
                        {permission.expiresAt && (
                          <span className={isExpired(permission.expiresAt) ? 'text-red-600' : ''}>
                            {' • Expires '}{formatDate(permission.expiresAt)}
                            {isExpired(permission.expiresAt) && ' (Expired)'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {editingPermission === permission.id ? (
                      <div className="flex items-center space-x-2">
                        <select
                          defaultValue={permission.role}
                          onChange={(e) => updatePermission(permission.id, { role: e.target.value as any })}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => setEditingPermission(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(permission.role)}`}>
                          {permission.role}
                        </span>
                        <button
                          onClick={() => setEditingPermission(permission.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deletePermission(permission.id)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Role Descriptions */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Permission Levels</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Viewer
            </span>
            <span>Can view the guide</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Editor
            </span>
            <span>Can view and edit the guide</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Admin
            </span>
            <span>Can view, edit, and manage permissions</span>
          </div>
        </div>
      </div>
    </div>
  );
};