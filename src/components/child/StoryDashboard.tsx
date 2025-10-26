import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Plus, Calendar, Baby, Download, Trash2, X, Clock, CreditCard as Edit, Heart, Star, AlertCircle, RefreshCw } from 'lucide-react';
import { requestDeduplicator } from '../../lib/requestCache';
import Layout from '../layout/Layout';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useStoryStore } from '../../store/storyStore';
import { useChildMemoryStore } from '../../store/childMemoryStore';
import { formatDate, calculateAge } from '../../lib/utils';
import { MemoryWithDetails } from '../../types/child';

interface MemoryCardProps {
  memory: MemoryWithDetails;
  onEdit: (memory: MemoryWithDetails) => void;
  onDelete: (memoryId: string) => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onEdit, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    onDelete(memory.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">{memory.title}</h3>
          <p className="text-xs sm:text-sm text-gray-500">{formatDate(memory.memory_date)}</p>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(memory)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={handleDelete}
            className={`opacity-0 group-hover:opacity-100 transition-opacity ${
              showDeleteConfirm ? 'text-red-600' : ''
            }`}
          />
        </div>
      </div>

      {memory.notes && (
        <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3 line-clamp-2">{memory.notes}</p>
      )}

      {memory.is_quote && memory.quote_text && (
        <blockquote className="text-xs sm:text-sm italic text-blue-700 border-l-2 border-blue-200 pl-2 sm:pl-3 mb-2 sm:mb-3">
          "{memory.quote_text}"
        </blockquote>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          {memory.images.length > 0 && (
            <span className="flex items-center">
              <Star className="h-3 w-3 mr-1" />
              {memory.images.length} foto{memory.images.length !== 1 ? 's' : ''}
            </span>
          )}
          {memory.recordings.length > 0 && (
            <span className="flex items-center">
              <Heart className="h-3 w-3 mr-1" />
              {memory.recordings.length} audio{memory.recordings.length !== 1 ? 's' : ''}
            </span>
          )}
          {memory.place && (
            <span>{memory.place}</span>
          )}
        </div>

        {memory.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {memory.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                {tag.tag_name}
              </span>
            ))}
            {memory.tags.length > 2 && (
              <span className="text-xs text-gray-500">+{memory.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          ¿Estás seguro? Haz clic de nuevo para confirmar.
        </div>
      )}
    </div>
  );
};

const StoryDashboard: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const { stories, loading: storiesLoading, fetchStories, deleteStory } = useStoryStore();
  const { 
    memories, 
    loading: memoriesLoading, 
    fetchMemories, 
    deleteMemory,
    getFilteredMemories,
    stats
  } = useChildMemoryStore();

  const [story, setStory] = useState(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [memoriesError, setMemoriesError] = useState<string | null>(null);

  useEffect(() => {
    if (stories.length === 0) {
      fetchStories();
    }
  }, [fetchStories, stories.length]);

  useEffect(() => {
    if (storyId && stories.length > 0) {
      console.log('[StoryDashboard] Story changed to:', storyId);
      const foundStory = stories.find(s => s.id === storyId);
      setStory(foundStory || null);

      if (foundStory) {
        setMemoriesError(null);
        // Clear any pending requests for previous stories
        requestDeduplicator.invalidateCachePattern('fetchMemories');

        fetchMemories(storyId).catch((error) => {
          console.error('[StoryDashboard] Error fetching memories:', error);
          setMemoriesError(error?.message || 'Error al cargar los recuerdos');
        });
      }
    }

    return () => {
      console.log('[StoryDashboard] Cleaning up for story:', storyId);
      // Cancel any pending memory fetches when component unmounts or story changes
      if (storyId) {
        requestDeduplicator.invalidateCachePattern(storyId);
      }
    };
  }, [storyId, stories, fetchMemories]);

  const retryFetchMemories = () => {
    if (storyId) {
      setMemoriesError(null);
      fetchMemories(storyId).catch((error) => {
        console.error('[StoryDashboard] Error fetching memories:', error);
        setMemoriesError(error?.message || 'Error al cargar los recuerdos');
      });
    }
  };

  const handleDeleteStory = async () => {
    if (!story) return;
    
    const result = await deleteStory(story.id);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    const result = await deleteMemory(memoryId);
    if (!result.success) {
      console.error('Error deleting memory:', result.error);
    }
  };

  const handleEditMemory = (memory: MemoryWithDetails) => {
    navigate(`/add-memory/${storyId}`, { state: { editMemory: memory } });
  };

  const filteredMemories = memories;

  if (storiesLoading || memoriesLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="lg" message="Cargando dashboard..." />
        </div>
      </Layout>
    );
  }

  if (!story) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Historia no encontrada
            </h1>
            <p className="text-gray-600 mb-6">
              La historia que buscas no existe o no tienes permisos para verla.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => navigate('/dashboard')}
            size="sm"
          >
            <span className="hidden sm:inline">Volver</span>
          </Button>
        </div>

        {/* Child Info Header with Edit Button */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3 sm:mb-4 relative">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 relative">
              {story.photo_url ? (
                <img
                  src={story.photo_url}
                  alt={story.title}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center">
                  <Baby className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                {story.title}
              </h1>
              <div className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm text-gray-500">
                {story.date_of_birth && (
                  <span>{calculateAge(story.date_of_birth)}</span>
                )}
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                  <Baby className="h-3 w-3 mr-0.5 sm:mr-1" />
                  <span className="hidden xs:inline">Niño</span>
                </span>
                <span>{stats.totalMemories} recuerdos</span>
              </div>
            </div>
          </div>
          
          {/* Edit Button inside story card */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
            <Button
              variant="ghost"
              icon={Edit}
              size="sm"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="h-9 w-9 sm:h-8 sm:w-8 p-0 hover:bg-gray-100"
            />
            
            {showSettingsMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Editar historia
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </button>
                  <button 
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar historia
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Memory CTA */}
        <div className="mb-3 sm:mb-4">
          <Button
            size="md"
            icon={Plus}
            onClick={() => navigate(`/add-memory/${storyId}`)}
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-lg w-full sm:w-auto"
            fullWidth
          >
            <span className="text-sm sm:text-base">Añadir Nuevo Recuerdo</span>
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex space-x-1.5 sm:space-x-2">
            <Button
              variant={viewMode === 'timeline' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('timeline')}
            >
              Timeline
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              Calendario
            </Button>
          </div>
          
          <p className="text-xs sm:text-sm text-gray-500">
            {filteredMemories.length} recuerdo{filteredMemories.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Memories List */}
        {viewMode === 'timeline' && (
          <div className="space-y-3 sm:space-y-4">
            {memoriesError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start space-x-3 mb-4">
                  <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-2">Error al cargar recuerdos</h3>
                    <p className="text-sm text-red-800">{memoriesError}</p>
                  </div>
                </div>
                <Button
                  onClick={retryFetchMemories}
                  icon={RefreshCw}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Reintentar
                </Button>
              </div>
            ) : filteredMemories.length > 0 ? (
              filteredMemories.map((memory) => (
                <div key={memory.id} className="group">
                  <MemoryCard
                    memory={memory}
                    onEdit={handleEditMemory}
                    onDelete={handleDeleteMemory}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aún no hay recuerdos
                </h3>
                <p className="text-gray-600 mb-6">
                  Comienza a documentar los momentos especiales
                </p>
                <Button
                  onClick={() => navigate(`/add-memory/${storyId}`)}
                  icon={Plus}
                >
                  Crear Primer Recuerdo
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Calendar View Placeholder */}
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Vista de Calendario
            </h3>
            <p className="text-gray-600">
              La vista de calendario estará disponible próximamente
            </p>
          </div>
        )}

        {/* Delete Story Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirmar Eliminación
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => setShowDeleteModal(false)}
                />
              </div>
              <p className="text-gray-600 mb-6">
                ¿Estás seguro de que quieres eliminar la historia de {story.title}? 
                Esta acción eliminará todos los recuerdos, fotos y audios asociados y no se puede deshacer.
              </p>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  fullWidth
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteStory}
                  fullWidth
                >
                  Eliminar Historia
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StoryDashboard;