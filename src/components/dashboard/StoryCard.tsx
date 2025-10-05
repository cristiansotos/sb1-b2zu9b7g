import React, { useState } from 'react';
import { CreditCard as Edit, Trash2, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Story } from '../../types';
import Button from '../ui/Button';
import EditStoryModal from './EditStoryModal';
import { useStoryStore } from '../../store/storyStore';
import { formatDate, calculateAge } from '../../lib/utils';

interface StoryCardProps {
  story: Story;
}

const StoryCard: React.FC<StoryCardProps> = ({ story }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const navigate = useNavigate();
  const { deleteStory } = useStoryStore();

  const handleCardClick = () => {
    if (story.mode === 'child') {
      navigate(`/child-dashboard/${story.id}`);
    } else {
      navigate(`/story-recorder/${story.id}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setDeleting(true);
    const result = await deleteStory(story.id);
    
    if (!result.success) {
      console.error('Error deleting story:', result.error);
    }
    
    setDeleting(false);
    setShowDeleteConfirm(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer border border-gray-200 hover:border-gray-300"
    >
      {/* Photo or Placeholder */}
      <div className="h-40 bg-gradient-to-br from-blue-100 to-teal-100 relative overflow-hidden">
        {story.photo_url ? (
          <img
            src={story.photo_url}
            alt={story.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <User className="h-16 w-16 text-blue-400 opacity-60" />
          </div>
        )}
        
        {/* Progress Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black bg-opacity-20">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-teal-500 transition-all duration-500 shadow-sm"
            style={{ width: `${story.progress}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-lg text-gray-900 truncate flex-1 mr-3 leading-tight">
            {story.title}
          </h3>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="sm"
              icon={Edit}
              onClick={handleEdit}
              className="h-8 w-8 p-0 hover:bg-blue-50 text-gray-700 hover:text-blue-600"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={handleDelete}
              loading={deleting}
              className={`h-8 w-8 p-0 hover:bg-red-50 ${showDeleteConfirm ? 'text-red-600 hover:text-red-700' : 'text-gray-700 hover:text-red-600'}`}
            />
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-600 mb-4">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 mr-1" />
            <span className="font-medium">{story.relationship}</span>
            {story.mode === 'child' && (
              <span className="ml-2 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                Niño
              </span>
            )}
          </div>
          
          {story.date_of_birth && (
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 mr-1" />
              <span className="font-medium">{calculateAge(story.date_of_birth)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"></div>
            <span className="font-medium">{story.progress}% completado</span>
          </div>
          <span className="text-gray-400">{formatDate(story.updated_at)}</span>
        </div>

        {showDeleteConfirm && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
            ¿Estás seguro? Haz clic de nuevo para confirmar.
          </div>
        )}
      </div>
      
      <EditStoryModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        story={story}
      />
    </div>
  );
};

export default StoryCard;