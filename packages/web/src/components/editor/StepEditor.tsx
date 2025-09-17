import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ProcessedStep, Annotation, EditorState } from '../../types/guide.types';
import { AnnotationLayer } from './AnnotationLayer';
import { TextEditor } from './TextEditor';

interface StepEditorProps {
  step: ProcessedStep;
  editorState: EditorState;
  onStepUpdate: (updates: Partial<ProcessedStep>) => void;
  onStateChange: (state: Partial<EditorState>) => void;
}

export const StepEditor: React.FC<StepEditorProps> = ({
  step,
  editorState,
  onStepUpdate,
  onStateChange
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isCreatingAnnotation, setIsCreatingAnnotation] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState<Partial<Annotation> | null>(null);

  useEffect(() => {
    if (imageRef.current && imageLoaded) {
      const rect = imageRef.current.getBoundingClientRect();
      setImageDimensions({ width: rect.width, height: rect.height });
    }
  }, [imageLoaded, step.screenshotUrl]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (editorState.tool === 'select') return;

    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const annotationId = `annotation-${Date.now()}`;
    
    const baseAnnotation: Partial<Annotation> = {
      id: annotationId,
      type: editorState.tool,
      x,
      y,
      color: '#3B82F6',
      strokeWidth: 2
    };

    if (editorState.tool === 'text') {
      setNewAnnotation({
        ...baseAnnotation,
        text: 'Click to edit text',
        width: 20,
        height: 5
      });
    } else if (editorState.tool === 'highlight' || editorState.tool === 'rectangle' || editorState.tool === 'blur') {
      setNewAnnotation({
        ...baseAnnotation,
        width: 0,
        height: 0
      });
      setIsCreatingAnnotation(true);
    } else if (editorState.tool === 'arrow') {
      setNewAnnotation({
        ...baseAnnotation,
        width: 10,
        height: 10,
        rotation: 0
      });
    }

    onStateChange({ selectedAnnotation: annotationId });
  }, [editorState.tool, onStateChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isCreatingAnnotation || !newAnnotation) return;

    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    const width = Math.abs(currentX - newAnnotation.x!);
    const height = Math.abs(currentY - newAnnotation.y!);
    const x = Math.min(newAnnotation.x!, currentX);
    const y = Math.min(newAnnotation.y!, currentY);

    setNewAnnotation(prev => ({
      ...prev,
      x,
      y,
      width,
      height
    }));
  }, [isCreatingAnnotation, newAnnotation]);

  const handleMouseUp = useCallback(() => {
    if (isCreatingAnnotation && newAnnotation) {
      // Only add annotation if it has meaningful dimensions
      if (newAnnotation.width! > 1 && newAnnotation.height! > 1) {
        const updatedAnnotations = [...step.annotations, newAnnotation as Annotation];
        onStepUpdate({ annotations: updatedAnnotations });
      }
      
      setIsCreatingAnnotation(false);
      setNewAnnotation(null);
    }
  }, [isCreatingAnnotation, newAnnotation, step.annotations, onStepUpdate]);

  const handleAnnotationUpdate = useCallback((annotationId: string, updates: Partial<Annotation>) => {
    const updatedAnnotations = step.annotations.map(annotation =>
      annotation.id === annotationId ? { ...annotation, ...updates } : annotation
    );
    onStepUpdate({ annotations: updatedAnnotations });
  }, [step.annotations, onStepUpdate]);

  const handleAnnotationDelete = useCallback((annotationId: string) => {
    const updatedAnnotations = step.annotations.filter(annotation => annotation.id !== annotationId);
    onStepUpdate({ annotations: updatedAnnotations });
    onStateChange({ selectedAnnotation: undefined });
  }, [step.annotations, onStepUpdate, onStateChange]);

  const handleAnnotationSelect = useCallback((annotationId: string) => {
    onStateChange({ selectedAnnotation: annotationId });
  }, [onStateChange]);

  const allAnnotations = newAnnotation 
    ? [...step.annotations, newAnnotation as Annotation]
    : step.annotations;

  return (
    <div className="h-full flex">
      {/* Image Editor */}
      <div className="flex-1 flex flex-col bg-gray-100">
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <div 
            ref={containerRef}
            className="relative bg-white rounded-lg shadow-lg max-w-full max-h-full"
            style={{ 
              cursor: editorState.tool === 'select' ? 'default' : 'crosshair'
            }}
          >
            {step.screenshotUrl ? (
              <>
                <img
                  ref={imageRef}
                  src={step.screenshotUrl}
                  alt={`Step ${step.order + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onLoad={handleImageLoad}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  draggable={false}
                />
                
                {imageLoaded && (
                  <AnnotationLayer
                    annotations={allAnnotations}
                    selectedAnnotation={editorState.selectedAnnotation}
                    imageDimensions={imageDimensions}
                    onAnnotationUpdate={handleAnnotationUpdate}
                    onAnnotationDelete={handleAnnotationDelete}
                    onAnnotationSelect={handleAnnotationSelect}
                  />
                )}
              </>
            ) : (
              <div className="w-96 h-64 flex items-center justify-center text-gray-500">
                No screenshot available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Text Editor Panel */}
      <div className="w-80 bg-white border-l border-gray-200">
        <TextEditor
          step={step}
          onStepUpdate={onStepUpdate}
        />
      </div>
    </div>
  );
};