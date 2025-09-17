import React, { useState, useCallback } from 'react';
import { GuideSettings, BrandCustomization } from '../../types/guide.types';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface BrandCustomizerProps {
  settings: GuideSettings;
  onUpdate: (updates: Partial<BrandCustomization>) => void;
  onClose: () => void;
}

const colorPresets = [
  { name: 'Blue', primary: '#3B82F6', secondary: '#1E40AF' },
  { name: 'Green', primary: '#10B981', secondary: '#047857' },
  { name: 'Purple', primary: '#8B5CF6', secondary: '#5B21B6' },
  { name: 'Red', primary: '#EF4444', secondary: '#B91C1C' },
  { name: 'Orange', primary: '#F97316', secondary: '#C2410C' },
  { name: 'Pink', primary: '#EC4899', secondary: '#BE185D' },
  { name: 'Indigo', primary: '#6366F1', secondary: '#4338CA' },
  { name: 'Gray', primary: '#6B7280', secondary: '#374151' }
];

const fontOptions = [
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Open Sans', value: 'Open Sans, sans-serif' },
  { name: 'Lato', value: 'Lato, sans-serif' },
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Poppins', value: 'Poppins, sans-serif' },
  { name: 'Source Sans Pro', value: 'Source Sans Pro, sans-serif' }
];

export const BrandCustomizer: React.FC<BrandCustomizerProps> = ({
  settings,
  onUpdate,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'logo'>('colors');
  const [customPrimaryColor, setCustomPrimaryColor] = useState(settings.brandColors?.[0] || '#3B82F6');
  const [customSecondaryColor, setCustomSecondaryColor] = useState(settings.brandColors?.[1] || '#1E40AF');

  const handleColorPresetSelect = useCallback((preset: typeof colorPresets[0]) => {
    onUpdate({
      primaryColor: preset.primary,
      secondaryColor: preset.secondary
    });
    setCustomPrimaryColor(preset.primary);
    setCustomSecondaryColor(preset.secondary);
  }, [onUpdate]);

  const handleCustomColorChange = useCallback((type: 'primary' | 'secondary', color: string) => {
    if (type === 'primary') {
      setCustomPrimaryColor(color);
      onUpdate({ primaryColor: color });
    } else {
      setCustomSecondaryColor(color);
      onUpdate({ secondaryColor: color });
    }
  }, [onUpdate]);

  const handleFontChange = useCallback((fontFamily: string) => {
    onUpdate({ fontFamily });
  }, [onUpdate]);

  const handleFontSizeChange = useCallback((fontSize: number) => {
    onUpdate({ fontSize });
  }, [onUpdate]);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real implementation, you would upload the file to your storage service
      const reader = new FileReader();
      reader.onload = (event) => {
        const logoUrl = event.target?.result as string;
        onUpdate({ logoUrl });
      };
      reader.readAsDataURL(file);
    }
  }, [onUpdate]);

  const tabs = [
    { id: 'colors' as const, name: 'Colors' },
    { id: 'typography' as const, name: 'Typography' },
    { id: 'logo' as const, name: 'Logo' }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Brand Customization</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600"
          aria-label="Close brand customizer"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-3 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'colors' && (
          <div className="space-y-6">
            {/* Color Presets */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Color Presets</h4>
              <div className="grid grid-cols-2 gap-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleColorPresetSelect(preset)}
                    className="flex items-center space-x-2 p-2 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex space-x-1">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: preset.secondary }}
                      />
                    </div>
                    <span className="text-sm text-gray-700">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Custom Colors</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Primary Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={customPrimaryColor}
                      onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                      className="w-10 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={customPrimaryColor}
                      onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Secondary Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={customSecondaryColor}
                      onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                      className="w-10 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={customSecondaryColor}
                      onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'typography' && (
          <div className="space-y-6">
            {/* Font Family */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">Font Family</label>
              <select
                value={settings.fontFamily || 'Inter, sans-serif'}
                onChange={(e) => handleFontChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {fontOptions.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">Base Font Size</label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="12"
                  max="20"
                  value={settings.fontSize || 14}
                  onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-8">
                  {settings.fontSize || 14}px
                </span>
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">Preview</label>
              <div 
                className="p-4 border border-gray-200 rounded"
                style={{ 
                  fontFamily: settings.fontFamily || 'Inter, sans-serif',
                  fontSize: `${settings.fontSize || 14}px`
                }}
              >
                <h3 className="text-lg font-semibold mb-2">Step Title</h3>
                <p className="text-gray-700">
                  This is how your guide text will appear with the selected typography settings.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logo' && (
          <div className="space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">Company Logo</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                {settings.logoUrl ? (
                  <div className="text-center">
                    <img
                      src={settings.logoUrl}
                      alt="Company Logo"
                      className="mx-auto h-20 w-auto mb-4"
                    />
                    <button
                      onClick={() => onUpdate({ logoUrl: undefined })}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove Logo
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Upload a logo
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          PNG, JPG, SVG up to 2MB
                        </span>
                      </label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Logo Guidelines */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Logo Guidelines</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use a transparent background (PNG) for best results</li>
                <li>• Recommended size: 200x60 pixels</li>
                <li>• Maximum file size: 2MB</li>
                <li>• Logo will appear in the top-left corner of guides</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};