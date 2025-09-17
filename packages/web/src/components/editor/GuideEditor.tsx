import React, { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Guide, ProcessedStep, EditorState, BrandCustomization } from '../../types/guide.types';
import { StepList } from './StepList';
import { StepEditor } from './StepEditor';
import { ToolPanel } from './ToolPanel';
import { BrandCustomizer } from './BrandCustomizer';
import { PreviewPanel } from './PreviewPanel';

interface GuideEditorProps {
  guide: Guide;
  onSave: (guide: Guide) => void;
  onPublish: (guide: Guide) => void;
}

export const GuideEditor: React.FC<GuideEditorProps> = ({
  guide,
  onSave,
  onPublish
}) => {
  const [editorState, setEditorState] = useState<EditorState>({
    selectedStep: 0,
    isEditing: false,
    isDragging: false,
    tool: 'select'
  });

  const [localGuide, setLocalGuide] = useState<Guide>(guide);
  const [showPreview, setShowPreview] = useState(false);
  const [showBrandCustomizer, setShowBrandCustomizer] = useState(false);

  const handleStepReorder = useCallback((dragIndex: number, hoverIndex: number) => {
    const dragStep = localGuide.steps[dragIndex];
    const newSteps = [...localGuide.steps];
    newSteps.splice(dragIndex, 1);
    newSteps.splice(hoverIndex, 0, dragStep);
    
    // Update order numbers
    const updatedSteps = newSteps.map((step, index) => ({
      ...step,
      order: index
    }));

    setLocalGuide(prev => ({
      ...prev,
      steps: updatedSteps
    }));
  }, [localGuide.steps]);

  const handleStepUpdate = useCallback((stepId: string, updates: Partial<ProcessedStep>) => {
    setLocalGuide(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    }));
  }, []);

  const handleBrandUpdate = useCallback((brandSettings: Partial<BrandCustomization>) => {
    setLocalGuide(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...brandSettings
      }
    }));
  }, []);

  const handleToolChange = useCallback((tool: EditorState['tool']) => {
    setEditorState(prev => ({ ...prev, tool }));
  }, []);

  const handleStepSelect = useCallback((stepIndex: number) => {
    setEditorState(prev => ({ ...prev, selectedStep: stepIndex }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(localGuide);
  }, [localGuide, onSave]);

  const handlePublish = useCallback(() => {
    onPublish(localGuide);
  }, [localGuide, onPublish]);

  const selectedStep = localGuide.steps[editorState.selectedStep];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {localGuide.title}
              </h1>
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                {localGuide.status}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowBrandCustomizer(!showBrandCustomizer)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Brand
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Preview
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Save
              </button>
              <button
                onClick={handlePublish}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Publish
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Step List */}
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <StepList
              steps={localGuide.steps}
              selectedStep={editorState.selectedStep}
              onStepSelect={handleStepSelect}
              onStepReorder={handleStepReorder}
              onStepUpdate={handleStepUpdate}
            />
          </div>

          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col">
            {/* Tool Panel */}
            <ToolPanel
              selectedTool={editorState.tool}
              onToolChange={handleToolChange}
            />

            {/* Step Editor */}
            <div className="flex-1 overflow-hidden">
              {selectedStep && (
                <StepEditor
                  step={selectedStep}
                  editorState={editorState}
                  onStepUpdate={(updates) => handleStepUpdate(selectedStep.id, updates)}
                  onStateChange={setEditorState}
                />
              )}
            </div>
          </div>

          {/* Right Sidebar - Brand Customizer */}
          {showBrandCustomizer && (
            <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
              <BrandCustomizer
                settings={localGuide.settings}
                onUpdate={handleBrandUpdate}
                onClose={() => setShowBrandCustomizer(false)}
              />
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <PreviewPanel
            guide={localGuide}
            onClose={() => setShowPreview(false)}
          />
        )}
      </div>
    </DndProvider>
  );
};