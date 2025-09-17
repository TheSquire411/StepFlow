import React, { useState } from 'react';
import { Guide } from '../../types/guide.types';
import {
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  PlayIcon,
  ClockIcon,
  TagIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { LazyImage } from '../common/LazyImage';
import { LazyContent } from '../common/LazyContent';

interface GuideCardProps {
  guide: Guide;
  onEdit: (guide: Guide) => void;
  onShare: (guide: Guide) => void;
  onDelete: (guide: Guide) => void;
  onDuplicate: (guide: Guide) => void;
  onArchive: (guide: Guide) => void;
  onView: (guide: Guide) => void;
  isSelected?: boolean;
  onSelect?: (guide: Guide, selected: boolean) => void;
}

export const GuideCard: React.FC<GuideCardProps> = ({
  guide,
  onEdit,
  onShare,
  onDelete,
  onDuplicate,
  onArchive,
  onView,
  isSelected = false,
  onSelect
}) => {
  const [imageError, setImageError] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getThumbnail = () => {
    if (guide.steps && guide.steps.length > 0 && guide.steps[0].screenshotUrl && !imageError) {
      return guide.steps[0].screenshotUrl;
    }
    return null;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 hover:shadow-md ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
    }`}>
      {/* Thumbnail */}
      <div className="relative">
        {onSelect && (
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(guide, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        )}
        
        <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden relative group">
          {getThumbnail() ? (
            <LazyImage
              src={getThumbnail()!}
              alt={guide.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              threshold={0.1}
              rootMargin="50px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <PlayIcon className="h-12 w-12 text-gray-400" />
            </div>
          )}
          
          {/* Overlay with play button */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
            <button
              onClick={() => onView(guide)}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-3"
            >
              <PlayIcon className="h-6 w-6 text-gray-700" />
            </button>
          </div>

          {/* Status badge */}
          <div className="absolute top-3 right-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(guide.status)}`}>
              {guide.status}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title and Actions */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1 mr-2">
            {guide.title}
          </h3>
          
          <Menu as="div" className="relative">
            <Menu.Button className="p-1 rounded-full hover:bg-gray-100 transition-colors">
              <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
            </Menu.Button>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => onView(guide)}
                      className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                    >
                      <EyeIcon className="h-4 w-4 mr-3" />
                      View
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => onEdit(guide)}
                      className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                    >
                      <PencilIcon className="h-4 w-4 mr-3" />
                      Edit
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => onShare(guide)}
                      className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                    >
                      <ShareIcon className="h-4 w-4 mr-3" />
                      Share
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => onDuplicate(guide)}
                      className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                    >
                      <DocumentDuplicateIcon className="h-4 w-4 mr-3" />
                      Duplicate
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => onArchive(guide)}
                      className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                    >
                      <ArchiveBoxIcon className="h-4 w-4 mr-3" />
                      Archive
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => onDelete(guide)}
                      className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-600`}
                    >
                      <TrashIcon className="h-4 w-4 mr-3" />
                      Delete
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>

        {/* Description */}
        {guide.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {guide.description}
          </p>
        )}

        {/* Metadata */}
        <div className="space-y-2">
          {/* Category and Difficulty */}
          <div className="flex items-center gap-2 flex-wrap">
            {guide.category && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                {guide.category}
              </span>
            )}
            {guide.difficulty && (
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getDifficultyColor(guide.difficulty)}`}>
                {guide.difficulty}
              </span>
            )}
          </div>

          {/* Tags */}
          {guide.tags && guide.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <TagIcon className="h-3 w-3 text-gray-400" />
              {guide.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
              {guide.tags.length > 3 && (
                <span className="text-xs text-gray-500">+{guide.tags.length - 3} more</span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <ClockIcon className="h-3 w-3" />
                <span>{formatDuration(guide.estimatedDuration)}</span>
              </div>
              <div className="flex items-center gap-1">
                <EyeIcon className="h-3 w-3" />
                <span>{guide.analytics?.totalViews || 0} views</span>
              </div>
              <div className="flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                <span>{guide.steps?.length || 0} steps</span>
              </div>
            </div>
            <span>{formatDate(guide.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};