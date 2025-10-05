import React, { useEffect, useState } from 'react';
import { Plus, Settings } from 'lucide-react';
import Layout from '../layout/Layout';
import Button from '../ui/Button';
import StoryCard from './StoryCard';
import CreateStoryModal from './CreateStoryModal';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { useStoryStore } from '../../store/storyStore';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuthStore();
  const { stories, loading, fetchStories } = useStoryStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStories();
      }
    };

    const handleFocus = () => {
      fetchStories();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchStories]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Hola, {user?.email?.split('@')[0]}!
            </h1>
            <p className="text-gray-600">
              Gestiona y crea las historias de tu familia
            </p>
          </div>

          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            {isAdmin && (
              <Button
                variant="outline"
                icon={Settings}
                onClick={() => navigate('/admin')}
              >
                Admin
              </Button>
            )}
            
            <Button
              variant="ghost"
              onClick={signOut}
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Stories Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner message="Cargando historias..." />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Create Story Card */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="group relative bg-gradient-to-br from-blue-50 to-teal-50 border-2 border-dashed border-blue-300 rounded-xl p-6 hover:border-blue-400 hover:shadow-md transition-all duration-200 h-64 flex flex-col items-center justify-center"
            >
              <div className="bg-blue-100 rounded-full p-4 mb-4 group-hover:bg-blue-200 transition-colors">
                <Plus className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Crear nueva historia
              </h3>
              <p className="text-sm text-gray-600 text-center">
                Comienza a documentar los recuerdos de un ser querido
              </p>
            </button>

            {/* Story Cards */}
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && stories.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <Plus className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ¡Comienza tu primera historia!
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Crea una historia familiar y comienza a preservar esos momentos especiales que tanto valoras.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Crear Historia
            </Button>
          </div>
        )}
      </div>

      <CreateStoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </Layout>
  );
};

export default Dashboard;