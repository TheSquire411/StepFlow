import React, { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { LinkIcon, EyeIcon, EyeSlashIcon, LockClosedIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface SharingSettings {
  id?: string;
  guideId: string;
  isPublic: boolean;
  shareUrl?: string;
  embedCode?: string;
  allowedDomains: string[];
  passwordProtected: boolean;
  requireAuth: boolean;
  allowComments: boolean;
  allowDownload: boolean;
  trackAnalytics: boolean;
  customBranding: boolean;
  expiresAt?: Date;
  maxViews?: number;
  currentViews?: number;
}

interface SharingSettingsProps {
  guideId: string;
  onSettingsChange?: (settings: SharingSettings) => void;
}

export const SharingSettingsComponent: React.FC<SharingSettingsProps> = ({
  guideId,
  onSettingsChange
}) => {
  const [settings, setSettings] = useState<SharingSettings>({
    guideId,
    isPublic: false,
    allowedDomains: [],
    passwordProtected: false,
    requireAuth: false,
    allowComments: true,
    allowDownload: false,
    trackAnalytics: true,
    customBranding: false,
  });

  const [password, setPassword] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmbedCode, setShowEmbedCode] = useState(false);

  useEffect(() => {
    loadSharingSettings();
  }, [guideId]);

  const loadSharingSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/sharing/guides/${guideId}/settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Failed to load sharing settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<SharingSettings>) => {
    try {
      setIsLoading(true);
      const updatedSettings = { ...settings, ...newSettings };
      
      const payload = {
        ...updatedSettings,
        password: password || undefined,
      };

      const response = await fetch(`/api/v1/sharing/guides/${guideId}/settings`, {
        method: settings.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        onSettingsChange?.(data.data);
      } else {
        throw new Error('Failed to update sharing settings');
      }
    } catch (error) {
      console.error('Failed to update sharing settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addDomain = () => {
    if (newDomain && !settings.allowedDomains.includes(newDomain)) {
      const updatedDomains = [...settings.allowedDomains, newDomain];
      updateSettings({ allowedDomains: updatedDomains });
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    const updatedDomains = settings.allowedDomains.filter(d => d !== domain);
    updateSettings({ allowedDomains: updatedDomains });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const generateEmbedCode = async () => {
    try {
      const response = await fetch(`/api/v1/sharing/guides/${guideId}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          width: 800,
          height: 600,
          showTitle: true,
          showProgress: true,
          showControls: true,
          autoPlay: false,
          theme: 'light',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, embedCode: data.data.embedCode }));
      }
    } catch (error) {
      console.error('Failed to generate embed code:', error);
    }
  };

  if (isLoading && !settings.id) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Public/Private Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {settings.isPublic ? (
            <GlobeAltIcon className="h-5 w-5 text-green-500" />
          ) : (
            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {settings.isPublic ? 'Public Guide' : 'Private Guide'}
            </h3>
            <p className="text-sm text-gray-500">
              {settings.isPublic 
                ? 'Anyone with the link can view this guide'
                : 'Only people you share with can view this guide'
              }
            </p>
          </div>
        </div>
        <Switch
          checked={settings.isPublic}
          onChange={(checked) => updateSettings({ isPublic: checked })}
          className={`${
            settings.isPublic ? 'bg-blue-600' : 'bg-gray-200'
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        >
          <span
            className={`${
              settings.isPublic ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
          />
        </Switch>
      </div>

      {/* Share URL */}
      {settings.shareUrl && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Share Link
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={settings.shareUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
            />
            <button
              onClick={() => copyToClipboard(settings.shareUrl!)}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Password Protection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <LockClosedIcon className="h-5 w-5 text-gray-400" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">Password Protection</h4>
              <p className="text-sm text-gray-500">Require a password to view this guide</p>
            </div>
          </div>
          <Switch
            checked={settings.passwordProtected}
            onChange={(checked) => updateSettings({ passwordProtected: checked })}
            className={`${
              settings.passwordProtected ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            <span
              className={`${
                settings.passwordProtected ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
        </div>

        {settings.passwordProtected && (
          <div className="ml-8">
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        )}
      </div>

      {/* Domain Restrictions */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Domain Restrictions</h4>
        <p className="text-sm text-gray-500">
          Restrict access to specific domains (optional)
        </p>
        
        <div className="flex items-center space-x-2">
          <input
            type="url"
            placeholder="https://example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button
            onClick={addDomain}
            className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
          >
            Add
          </button>
        </div>

        {settings.allowedDomains.length > 0 && (
          <div className="space-y-2">
            {settings.allowedDomains.map((domain) => (
              <div key={domain} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                <span className="text-sm text-gray-700">{domain}</span>
                <button
                  onClick={() => removeDomain(domain)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Additional Settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Additional Settings</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Require authentication</span>
            <Switch
              checked={settings.requireAuth}
              onChange={(checked) => updateSettings({ requireAuth: checked })}
              className={`${
                settings.requireAuth ? 'bg-blue-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  settings.requireAuth ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Allow comments</span>
            <Switch
              checked={settings.allowComments}
              onChange={(checked) => updateSettings({ allowComments: checked })}
              className={`${
                settings.allowComments ? 'bg-blue-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  settings.allowComments ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Allow downloads</span>
            <Switch
              checked={settings.allowDownload}
              onChange={(checked) => updateSettings({ allowDownload: checked })}
              className={`${
                settings.allowDownload ? 'bg-blue-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  settings.allowDownload ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Track analytics</span>
            <Switch
              checked={settings.trackAnalytics}
              onChange={(checked) => updateSettings({ trackAnalytics: checked })}
              className={`${
                settings.trackAnalytics ? 'bg-blue-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  settings.trackAnalytics ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>
        </div>
      </div>

      {/* Embed Code */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Embed Code</h4>
          <button
            onClick={() => setShowEmbedCode(!showEmbedCode)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showEmbedCode ? 'Hide' : 'Show'} Embed Code
          </button>
        </div>

        {showEmbedCode && (
          <div className="space-y-2">
            {!settings.embedCode && (
              <button
                onClick={generateEmbedCode}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Generate Embed Code
              </button>
            )}
            
            {settings.embedCode && (
              <div className="space-y-2">
                <textarea
                  value={settings.embedCode}
                  readOnly
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={() => copyToClipboard(settings.embedCode!)}
                  className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                >
                  Copy Embed Code
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analytics */}
      {settings.currentViews !== undefined && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Analytics</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Views:</span>
              <span className="ml-2 font-medium">{settings.currentViews}</span>
            </div>
            {settings.maxViews && (
              <div>
                <span className="text-gray-500">View Limit:</span>
                <span className="ml-2 font-medium">{settings.maxViews}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};