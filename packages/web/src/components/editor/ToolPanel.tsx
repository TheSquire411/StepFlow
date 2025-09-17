import React from 'react';
import { EditorState } from '../../types/guide.types';
import {
  CursorArrowRaysIcon,
  PaintBrushIcon,
  ArrowRightIcon,
  EyeSlashIcon,
  ChatBubbleLeftIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline';

interface ToolPanelProps {
  selectedTool: EditorState['tool'];
  onToolChange: (tool: EditorState['tool']) => void;
}

const tools = [
  {
    id: 'select' as const,
    name: 'Select',
    icon: CursorArrowRaysIcon,
    description: 'Select and move annotations'
  },
  {
    id: 'highlight' as const,
    name: 'Highlight',
    icon: PaintBrushIcon,
    description: 'Highlight areas of interest'
  },
  {
    id: 'arrow' as const,
    name: 'Arrow',
    icon: ArrowRightIcon,
    description: 'Add directional arrows'
  },
  {
    id: 'blur' as const,
    name: 'Blur',
    icon: EyeSlashIcon,
    description: 'Blur sensitive information'
  },
  {
    id: 'text' as const,
    name: 'Text',
    icon: ChatBubbleLeftIcon,
    description: 'Add text annotations'
  },
  {
    id: 'rectangle' as const,
    name: 'Rectangle',
    icon: RectangleStackIcon,
    description: 'Add rectangular highlights'
  }
];

export const ToolPanel: React.FC<ToolPanelProps> = ({
  selectedTool,
  onToolChange
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center space-x-1">
        <span className="text-sm font-medium text-gray-700 mr-4">Tools:</span>
        
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isSelected = selectedTool === tool.id;
          
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`
                flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
                ${isSelected 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'text-gray-700 hover:bg-gray-100 border border-transparent'
                }
              `}
              title={tool.description}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tool.name}</span>
            </button>
          );
        })}
        
        <div className="flex-1" />
        
        {/* Additional Controls */}
        <div className="flex items-center space-x-2 ml-4">
          <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            Undo
          </button>
          <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            Redo
          </button>
        </div>
      </div>
    </div>
  );
};