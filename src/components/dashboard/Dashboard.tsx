import React, { useEffect, useState } from 'react';
import { Plus, Settings, UserCircle, AlertCircle, RefreshCw } from 'lucide-react';
import Layout from '../layout/Layout';
import Button from '../ui/Button';
import StoryCard from './StoryCard';
import CreateStoryModal from './CreateStoryModal';
import LoadingSpinner from '../ui/LoadingSpinner';
import FamilySelector from '../family/FamilySelector';
import CreateFamilyModal from '../family/CreateFamilyModal';
import FamilyManagementModal from '../family/FamilyManagementModal';
import ProfileSettings from './ProfileSettings';
import { useAuthStore } from '../../store/authStore';
import { useStoryStore } from '../../store/storyStore';
import { useFamilyGroupStore } from '../../store/familyGroupStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getUserFriendlyError, isTimeoutError } from '../../lib/queryUtils';
import { requestDeduplicator } from '../../lib/requestCache';

const Dashboard: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateFamilyModalOpen, setIsCreateFamilyModalOpen] = useState(false);
  const [managingFamilyId, setManagingFamilyId] = useState<string | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const { user, isAdmin, signOut } = useAuthStore();
  const { stories, loading, fetchStoriesForFamily, reset: resetStoryStore } = useStoryStore();
  const { familyGroups, activeFamilyId, fetchFamilyGroups, getActiveFamily } = useFamilyGroupStore();
  const navigate = useNavigate();

  const activeFamily = getActiveFamily();

  useEffect(() => {
    fetchFamilyGroups();
    loadUserProfile();
  }, [fetchFamilyGroups]);

  const loadUserProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_profiles')
      .select('first_name')
      .eq('id', user.id)
      .maybeSingle();

    if (data?.first_name) {
      setUserFirstName(data.first_name);
    }
  };

  useEffect(() => {
    if (activeFamilyId) {
      console.log('[Dashboard] Active family changed to:', activeFamilyId);
      resetStoryStore();
      setStoriesError(null);

      // Clear any pending requests for previous family
      requestDeduplicator.invalidateCachePattern('fetchStoriesForFamily');

      fetchStoriesForFamily(activeFamilyId)
        .catch((error) => {
          console.error('[Dashboard] Error fetching stories:', error);
          setStoriesError(getUserFriendlyError(error));
        });
    }

    return () => {
      console.log('[Dashboard] Cleaning up on unmount or family change');
    };
  }, [activeFamilyId, fetchStoriesForFamily, resetStoryStore]);

  const retryFetchStories = () => {
    if (activeFamilyId) {
      console.log('[Dashboard] Retrying story fetch for family:', activeFamilyId);
      setStoriesError(null);
      resetStoryStore();

      // Small delay to ensure UI updates
      setTimeout(() => {
        fetchStoriesForFamily(activeFamilyId)
          .catch((error) => {
            console.error('[Dashboard] Error fetching stories:', error);
            setStoriesError(getUserFriendlyError(error));
          });
      }, 100);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="mb-3 sm:mb-0">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                ¡Hola, {userFirstName || user?.email}!
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Gestiona y crea las historias de tu familia
              </p>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
            <Button
              variant="outline"
              icon={UserCircle}
              onClick={() => setShowProfileSettings(!showProfileSettings)}
              size="sm"
              className="flex-1 sm:flex-initial"
            >
              <span className="hidden sm:inline">Perfil</span>
            </Button>

            {isAdmin && (
              <Button
                variant="outline"
                icon={Settings}
                onClick={() => navigate('/admin')}
                size="sm"
                className="flex-1 sm:flex-initial"
              >
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={signOut}
              size="sm"
              className="flex-1 sm:flex-initial"
            >
              <span className="text-xs sm:text-sm">Cerrar Sesión</span>
            </Button>
          </div>
          </div>

          {/* Family Selector */}
          <div>
            <FamilySelector
              onManageFamily={(familyId) => setManagingFamilyId(familyId)}
              onCreateFamily={() => setIsCreateFamilyModalOpen(true)}
            />
          </div>
        </div>

        {/* Stories Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner message="Cargando historias..." />
          </div>
        ) : storiesError ? (
          <div className="flex justify-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md">
              <div className="flex items-start space-x-4 mb-6">
                <AlertCircle className="h-8 w-8 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Error al cargar historias</h3>
                  <p className="text-sm text-red-800">{storiesError}</p>
                </div>
              </div>
              <Button
                onClick={retryFetchStories}
                icon={RefreshCw}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Reintentar
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {/* Create Story Card */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="group relative bg-gradient-to-br from-blue-50 to-teal-50 border-2 border-dashed border-blue-300 rounded-lg sm:rounded-xl p-4 sm:p-6 hover:border-blue-400 hover:shadow-md transition-all duration-200 h-56 sm:h-64 flex flex-col items-center justify-center touch-manipulation"
            >
              <div className="bg-blue-100 rounded-full p-3 sm:p-4 mb-3 sm:mb-4 group-hover:bg-blue-200 transition-colors">
                <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">
                Crear nueva historia
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 text-center">
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

      <CreateFamilyModal
        isOpen={isCreateFamilyModalOpen}
        onClose={() => setIsCreateFamilyModalOpen(false)}
      />

      {managingFamilyId && (
        <FamilyManagementModal
          isOpen={true}
          onClose={() => setManagingFamilyId(null)}
          familyGroupId={managingFamilyId}
        />
      )}

      <ProfileSettings
        isOpen={showProfileSettings}
        onClose={() => {
          setShowProfileSettings(false);
          loadUserProfile();
        }}
      />
    </Layout>
  );
};

export default Dashboard;