import React, { useEffect, useState, RefObject } from 'react';
import { Annotation } from '../../types/guide.types';

interface AnnotationRendererProps {
  annotations: Annotation[];
  imageRef: RefObject<HTMLImageElement>;
  className?: string;
}

export const AnnotationRenderer: React.FC<AnnotationRendererProps> = ({
  annotations,
  imageRef,
  className = ''
}) => {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSizes = () => {
      if (imageRef.current) {
        const img = imageRef.current;
        const container = img.parentElement;
        
        if (container) {
          setImageSize({
            width: img.naturalWidth,
            height: img.naturalHeight
          });
          
          setContainerSize({
            width: img.offsetWidth,
            height: img.offsetHeight
          });
        }
      }
    };

    updateSizes();
    
    const resizeObserver = new ResizeObserver(updateSizes);
    if (imageRef.current?.parentElement) {
      resizeObserver.observe(imageRef.current.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [imageRef]);

  const getScaledPosition = (annotation: Annotation) => {
    if (imageSize.width === 0 || imageSize.height === 0) return null;

    const scaleX = containerSize.width / imageSize.width;
    const scaleY = containerSize.height / imageSize.height;

    return {
      x: annotation.x * scaleX,
      y: annotation.y * scaleY,
      width: annotation.width ? annotation.width * scaleX : undefined,
      height: annotation.height ? annotation.height * scaleY : undefined
    };
  };

  const renderHighlight = (annotation: Annotation, position: any) => (
    <div
      key={annotation.id}
      className="absolute border-2 border-yellow-400 bg-yellow-400 bg-opacity-20 animate-pulse"
      style={{
        left: position.x,
        top: position.y,
        width: position.width || 20,
        height: position.height || 20,
        borderRadius: '4px'
      }}
      role="img"
      aria-label={`Highlight annotation: ${annotation.text || 'Interactive element'}`}
    />
  );

  const renderArrow = (annotation: Annotation, position: any) => {
    const rotation = annotation.rotation || 0;
    
    return (
      <div
        key={annotation.id}
        className="absolute"
        style={{
          left: position.x,
          top: position.y,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center'
        }}
        role="img"
        aria-label={`Arrow pointing to: ${annotation.text || 'Interactive element'}`}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          className="drop-shadow-lg"
        >
          <path
            d="M20 5 L35 20 L25 20 L25 35 L15 35 L15 20 L5 20 Z"
            fill={annotation.color || '#EF4444'}
            stroke="white"
            strokeWidth="2"
          />
        </svg>
      </div>
    );
  };

  const renderBlur = (annotation: Annotation, position: any) => (
    <div
      key={annotation.id}
      className="absolute bg-gray-500 bg-opacity-80"
      style={{
        left: position.x,
        top: position.y,
        width: position.width || 50,
        height: position.height || 20,
        backdropFilter: 'blur(8px)',
        borderRadius: '4px'
      }}
      role="img"
      aria-label="Blurred content for privacy"
    />
  );

  const renderText = (annotation: Annotation, position: any) => (
    <div
      key={annotation.id}
      className="absolute bg-white bg-opacity-90 px-2 py-1 rounded shadow-lg border"
      style={{
        left: position.x,
        top: position.y,
        fontSize: '14px',
        fontWeight: '500',
        color: annotation.color || '#1F2937',
        maxWidth: '200px',
        wordWrap: 'break-word'
      }}
      role="note"
      aria-label={`Text annotation: ${annotation.text}`}
    >
      {annotation.text}
    </div>
  );

  const renderRectangle = (annotation: Annotation, position: any) => (
    <div
      key={annotation.id}
      className="absolute border-2"
      style={{
        left: position.x,
        top: position.y,
        width: position.width || 100,
        height: position.height || 50,
        borderColor: annotation.color || '#3B82F6',
        backgroundColor: `${annotation.color || '#3B82F6'}20`,
        borderRadius: '4px'
      }}
      role="img"
      aria-label={`Rectangle annotation: ${annotation.text || 'Highlighted area'}`}
    />
  );

  const renderAnnotation = (annotation: Annotation) => {
    const position = getScaledPosition(annotation);
    if (!position) return null;

    switch (annotation.type) {
      case 'highlight':
        return renderHighlight(annotation, position);
      case 'arrow':
        return renderArrow(annotation, position);
      case 'blur':
        return renderBlur(annotation, position);
      case 'text':
        return renderText(annotation, position);
      case 'rectangle':
        return renderRectangle(annotation, position);
      default:
        return null;
    }
  };

  return (
    <div className={`annotation-renderer ${className}`}>
      {annotations.map(renderAnnotation)}
    </div>
  );
};