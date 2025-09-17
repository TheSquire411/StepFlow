import React, { useState, useCallback } from 'react';
import { ProcessedStep } from '../../types/guide.types';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  NumberedListIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

interface TextEditorProps {
  step: ProcessedStep;
  onStepUpdate: (updates: Partial<ProcessedStep>) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  step,
  onStepUpdate
}) => {
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onStepUpdate({ title: e.target.value });
  }, [onStepUpdate]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onStepUpdate({ description: e.target.value });
  }, [onStepUpdate]);

  const formatButtons = [
    { id: 'bold', icon: BoldIcon, title: 'Bold' },
    { id: 'italic', icon: ItalicIcon, title: 'Italic' },
    { id: 'underline', icon: UnderlineIcon, title: 'Underline' },
    { id: 'bulletList', icon: ListBulletIcon, title: 'Bullet List' },
    { id: 'numberedList', icon: NumberedListIcon, title: 'Numbered List' },
    { id: 'link', icon: LinkIcon, title: 'Add Link' }
  ];

  const handleFormatClick = useCallback((format: string) => {
    if (format === 'link') {
      setShowLinkDialog(true);
      return;
    }

    // Toggle format
    const newFormats = new Set(activeFormats);
    if (newFormats.has(format)) {
      newFormats.delete(format);
    } else {
      newFormats.add(format);
    }
    setActiveFormats(newFormats);

    // Apply formatting to selected text
    document.execCommand(format, false);
  }, [activeFormats]);

  const handleAddLink = useCallback(() => {
    if (linkUrl) {
      document.execCommand('createLink', false, linkUrl);
      setLinkUrl('');
      setShowLinkDialog(false);
    }
  }, [linkUrl]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Step Content</h3>
      </div>

      {/* Step Title */}
      <div className="p-4 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Step Title
        </label>
        <input
          type="text"
          value={step.title}
          onChange={handleTitleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter step title..."
        />
      </div>

      {/* Rich Text Toolbar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-1 mb-3">
          {formatButtons.map((button) => {
            const Icon = button.icon;
            const isActive = activeFormats.has(button.id);
            
            return (
              <button
                key={button.id}
                onClick={() => handleFormatClick(button.id)}
                className={`
                  p-2 rounded border transition-colors
                  ${isActive 
                    ? 'bg-blue-100 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }
                `}
                title={button.title}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        {/* Link Dialog */}
        {showLinkDialog && (
          <div className="mb-3 p-3 bg-gray-50 rounded border">
            <div className="flex items-center space-x-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Enter URL..."
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              />
              <button
                onClick={handleAddLink}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => setShowLinkDialog(false)}
                className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step Description */}
      <div className="flex-1 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Step Description
        </label>
        <textarea
          value={step.description}
          onChange={handleDescriptionChange}
          className="w-full h-full min-h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Describe what happens in this step..."
        />
      </div>

      {/* Step Properties */}
      <div className="p-4 border-t border-gray-200 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Audio Narration
          </label>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
              Generate Audio
            </button>
            {step.audioUrl && (
              <audio controls className="flex-1">
                <source src={step.audioUrl} type="audio/mpeg" />
              </audio>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Annotations
          </label>
          <div className="text-sm text-gray-600">
            {step.annotations.length} annotation(s) on this step
          </div>
          {step.annotations.length > 0 && (
            <div className="mt-2 space-y-1">
              {step.annotations.map((annotation, index) => (
                <div key={annotation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm capitalize">
                    {annotation.type} {annotation.text && `- "${annotation.text}"`}
                  </span>
                  <button className="text-xs text-red-600 hover:text-red-800">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};