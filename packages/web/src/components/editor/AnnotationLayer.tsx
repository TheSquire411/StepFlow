import React, { useCallback } from 'react';
import { Annotation } from '../../types/guide.types';
import { TrashIcon } from '@heroicons/react/24/outline';

interface AnnotationLayerProps {
  annotations: Annotation[];
  selectedAnnotation?: string;
  imageDimensions: { width: number; height: number };
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
  onAnnotationSelect: (id: string) => void;
}

const AnnotationComponent: React.FC<{
  annotation: Annotation;
  isSelected: boolean;
  imageDimensions: { width: number; height: number };
  onUpdate: (updates: Partial<Annotation>) => void;
  onDelete: () => void;
  onSelect: () => void;
}> = ({ annotation, isSelected, imageDimensions, onUpdate, onDelete, onSelect }) => {
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ text: e.target.value });
  }, [onUpdate]);

  const handleTextBlur = useCallback(() => {
    if (!annotation.text || annotation.text.trim() === '') {
      onUpdate({ text: 'Click to edit text' });
    }
  }, [annotation.text, onUpdate]);

  const getAnnotationStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${annotation.x}%`,
      top: `${annotation.y}%`,
      width: annotation.width ? `${annotation.width}%` : 'auto',
      height: annotation.height ? `${annotation.height}%` : 'auto',
      pointerEvents: 'auto',
      cursor: 'pointer'
    };

    switch (annotation.type) {
      case 'highlight':
        return {
          ...baseStyle,
          backgroundColor: annotation.color || '#3B82F6',
          opacity: 0.3,
          border: isSelected ? '2px solid #1D4ED8' : 'none'
        };

      case 'rectangle':
        return {
          ...baseStyle,
          border: `${annotation.strokeWidth || 2}px solid ${annotation.color || '#3B82F6'}`,
          backgroundColor: 'transparent',
          boxShadow: isSelected ? '0 0 0 2px #1D4ED8' : 'none'
        };

      case 'blur':
        return {
          ...baseStyle,
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          border: isSelected ? '2px solid #1D4ED8' : '2px dashed #6B7280'
        };

      case 'arrow':
        return {
          ...baseStyle,
          width: '40px',
          height: '40px',
          transform: `rotate(${annotation.rotation || 0}deg)`
        };

      case 'text':
        return {
          ...baseStyle,
          minWidth: '100px',
          padding: '4px 8px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: isSelected ? '2px solid #1D4ED8' : '1px solid #D1D5DB',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: '500'
        };

      default:
        return baseStyle;
    }
  };

  const renderAnnotationContent = () => {
    switch (annotation.type) {
      case 'arrow':
        return (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 20 L30 20 M25 15 L30 20 L25 25"
              stroke={annotation.color || '#3B82F6'}
              strokeWidth={annotation.strokeWidth || 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case 'text':
        return (
          <input
            type="text"
            value={annotation.text || ''}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            className="w-full bg-transparent border-none outline-none text-gray-900"
            placeholder="Enter text..."
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={getAnnotationStyle()}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="group"
    >
      {renderAnnotationContent()}
      
      {/* Delete Button */}
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <TrashIcon className="h-3 w-3" />
        </button>
      )}
      
      {/* Resize Handles */}
      {isSelected && (annotation.type === 'highlight' || annotation.type === 'rectangle' || annotation.type === 'blur') && (
        <>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize" />
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize" />
        </>
      )}
    </div>
  );
};

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  annotations,
  selectedAnnotation,
  imageDimensions,
  onAnnotationUpdate,
  onAnnotationDelete,
  onAnnotationSelect
}) => {
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{ 
        width: imageDimensions.width, 
        height: imageDimensions.height 
      }}
    >
      {annotations.map((annotation) => (
        <AnnotationComponent
          key={annotation.id}
          annotation={annotation}
          isSelected={selectedAnnotation === annotation.id}
          imageDimensions={imageDimensions}
          onUpdate={(updates) => onAnnotationUpdate(annotation.id, updates)}
          onDelete={() => onAnnotationDelete(annotation.id)}
          onSelect={() => onAnnotationSelect(annotation.id)}
        />
      ))}
    </div>
  );
};