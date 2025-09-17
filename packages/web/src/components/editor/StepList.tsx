import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ProcessedStep } from '../../types/guide.types';
import { 
  PhotoIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';

interface StepListProps {
  steps: ProcessedStep[];
  selectedStep: number;
  onStepSelect: (index: number) => void;
  onStepReorder: (dragIndex: number, hoverIndex: number) => void;
  onStepUpdate: (stepId: string, updates: Partial<ProcessedStep>) => void;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}

const StepItem: React.FC<{
  step: ProcessedStep;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onUpdate: (updates: Partial<ProcessedStep>) => void;
}> = ({ step, index, isSelected, onSelect, onReorder, onUpdate }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: 'step',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      onReorder(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'step',
    item: () => {
      return { id: step.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.4 : 1;
  preview(drop(ref));

  return (
    <div
      ref={ref}
      className={`
        relative p-4 border-b border-gray-200 cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}
        ${isDragging ? 'opacity-40' : ''}
      `}
      style={{ opacity }}
      onClick={onSelect}
      data-handler-id={handlerId}
    >
      {/* Drag Handle */}
      <div
        ref={drag}
        className="absolute left-2 top-4 cursor-move text-gray-400 hover:text-gray-600"
      >
        <Bars3Icon className="h-4 w-4" />
      </div>

      <div className="ml-6">
        {/* Step Number and Title */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-blue-600 rounded-full">
              {step.order + 1}
            </span>
            <input
              type="text"
              value={step.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="text-sm font-medium text-gray-900 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1"
              placeholder="Step title..."
            />
          </div>
          
          <div className="flex items-center space-x-1">
            <button className="p-1 text-gray-400 hover:text-gray-600">
              <EyeIcon className="h-4 w-4" />
            </button>
            <button className="p-1 text-gray-400 hover:text-gray-600">
              <PencilIcon className="h-4 w-4" />
            </button>
            <button className="p-1 text-gray-400 hover:text-red-600">
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Screenshot Thumbnail */}
        <div className="mb-2">
          <div className="relative w-full h-20 bg-gray-100 rounded border overflow-hidden">
            {step.screenshotUrl ? (
              <img
                src={step.screenshotUrl}
                alt={`Step ${step.order + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <PhotoIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
            
            {/* Annotation Count */}
            {step.annotations.length > 0 && (
              <div className="absolute top-1 right-1 px-1.5 py-0.5 text-xs font-medium text-white bg-blue-600 rounded">
                {step.annotations.length}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <textarea
          value={step.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="w-full text-xs text-gray-600 bg-transparent border-none outline-none resize-none focus:bg-white focus:border focus:border-blue-300 focus:rounded p-1"
          placeholder="Step description..."
          rows={2}
        />
      </div>
    </div>
  );
};

export const StepList: React.FC<StepListProps> = ({
  steps,
  selectedStep,
  onStepSelect,
  onStepReorder,
  onStepUpdate
}) => {
  return (
    <div className="h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Steps</h2>
        <p className="text-sm text-gray-500">{steps.length} steps</p>
      </div>
      
      <div className="overflow-y-auto">
        {steps.map((step, index) => (
          <StepItem
            key={step.id}
            step={step}
            index={index}
            isSelected={selectedStep === index}
            onSelect={() => onStepSelect(index)}
            onReorder={onStepReorder}
            onUpdate={(updates) => onStepUpdate(step.id, updates)}
          />
        ))}
      </div>
    </div>
  );
};