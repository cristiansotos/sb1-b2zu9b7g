import React, { useState } from 'react';
import { Pencil, Trash2, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Story } from '../../types';
import EditStoryModal from './EditStoryModal';
import { useStoryStore } from '../../store/storyStore';
import { formatDate, calculateAge } from '../../lib/utils';

interface StoryCardProps {
  story: Story;
}

const StoryCard: React.FC<StoryCardProps> = ({ story }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { deleteStory } = useStoryStore();

  const handleCardClick = () => {
    if (story.mode === 'child') {
      navigate(`/child-dashboard/${story.id}`);
    } else {
      navigate(`/story-recorder/${story.id}`);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
      return;
    }

    handleConfirmDelete();
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteStory(story.id);

      if (!result.success) {
        console.error('Error deleting story:', result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className="group relative bg-white rounded-lg sm:rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer border border-gray-200 hover:border-gray-300 touch-manipulation active:scale-98"
      >
        <div className="h-32 sm:h-40 bg-gradient-to-br from-blue-100 to-teal-100 relative overflow-hidden">
          {story.photo_url ? (
            <img
              src={story.photo_url}
              alt={story.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <User className="h-12 w-12 sm:h-16 sm:w-16 text-blue-400 opacity-60" />
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black bg-opacity-20">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-teal-500 transition-all duration-500 shadow-sm"
              style={{ width: `${story.progress}%` }}
            />
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <h3 className="font-semibold text-base sm:text-lg text-gray-900 truncate flex-1 mr-2 sm:mr-3 leading-tight">
              {story.title}
            </h3>

            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                onClick={handleEditClick}
                className="h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors touch-manipulation"
                aria-label="Editar historia"
              >
                <Pencil className="h-4 w-4 sm:h-4 sm:w-4" />
              </button>

              <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className={`h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg transition-colors touch-manipulation ${
                  showDeleteConfirm
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'hover:bg-red-50 text-gray-600 hover:text-red-600'
                } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={showDeleteConfirm ? 'Confirmar eliminación' : 'Eliminar historia'}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showDeleteConfirm && (
            <div className="mb-2 sm:mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs sm:text-xs text-red-700 font-medium">
                Haz clic de nuevo para confirmar
              </p>
            </div>
          )}

          <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
              <span className="font-medium">{story.relationship}</span>
              {story.mode === 'child' && (
                <span className="ml-1 sm:ml-2 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                  Niño
                </span>
              )}
            </div>

            {story.date_of_birth && (
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                <span className="font-medium">{calculateAge(story.date_of_birth)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 sm:pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"></div>
              <span className="font-medium">{story.progress}% completado</span>
            </div>
            <span className="text-gray-400">{formatDate(story.updated_at)}</span>
          </div>
        </div>
      </div>

      <EditStoryModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        story={story}
      />
    </>
  );
};

export default StoryCard;
