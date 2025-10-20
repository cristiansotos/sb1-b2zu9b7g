import React, { useEffect, useState } from 'react';
import { ArrowLeft, Users, BookOpen, MessageSquare, BarChart3, Settings, Download, Search, Eye, UserX, UserCheck, Key, Trash2, ChevronUp, ChevronDown, Image, Upload, EyeOff, Save, Brain, RefreshCw, FileText, List, Camera, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../layout/Layout';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { ChaptersManager } from './ChaptersManager';
import { AIModelSettings } from './AIModelSettings';
import { AudioQualitySettings } from './AudioQualitySettings';
import RolePermissionsManager from './RolePermissionsManager';

interface AdminStats {
  totalUsers: number;
  totalStories: number;
  totalRecordings: number;
  totalFeedback: number;
}

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  stories_count: number;
  recordings_count: number;
  images_count: number;
  completion_ratio: number;
  tokens_used: number;
  book_interest: boolean;
  last_activity: string;
  is_active: boolean;
}

interface Feedback {
  id: string;
  user_email: string;
  message: string;
  created_at: string;
}

interface ConfirmationModal {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

type AdminTab =
  | 'users'
  | 'chapters-questions'
  | 'hero-carousel'
  | 'ai-config'
  | 'analytics'
  | 'feedback'
  | 'internal-notes'
  | 'role-permissions';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalStories: 0,
    totalRecordings: 0,
    totalFeedback: 0
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof AdminUser>('email');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [heroImages, setHeroImages] = useState([]);
  const [aiConfigTab, setAiConfigTab] = useState<'audio_transcripts' | 'audio_quality' | 'memory_writing'>('audio_transcripts');
  const [aiModels, setAiModels] = useState([]);
  const [audioQualitySettings, setAudioQualitySettings] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [featureFlags, setFeatureFlags] = useState([]);
  const [showAddApiKeyModal, setShowAddApiKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState({ service_name: '', key_value: '' });
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalStories: 0,
    totalRecordings: 0,
    totalImages: 0,
    averageProgress: 0,
    newUsersWeek: 0,
    newStoriesWeek: 0,
    newRecordingsWeek: 0,
    storageUsage: { total: 0, audio: 0, images: 0 },
    topStorageUsers: [],
    monthlyGrowth: [] as { month: string; users: number; stories: number; recordings: number }[]
  });
  const [carouselSettings, setCarouselSettings] = useState({
    transition_duration: 5000,
    auto_play: true,
    transition_effect: 'fade'
  });
  const [heroLoading, setHeroLoading] = useState(false);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmationModal>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchAdminData();
    fetchSystemConfiguration();
    fetchAnalytics();
  }, [isAdmin, navigate]);

  useEffect(() => {
    // Filter users based on search term
    const filtered = users.filter(user =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sort filtered users
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
    
    setFilteredUsers(sorted);
  }, [users, searchTerm, sortField, sortDirection]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch basic stats
      const [usersCount, storiesResult, recordingsResult, feedbackResult] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('stories').select('*', { count: 'exact' }),
        supabase.from('recordings').select('*', { count: 'exact' }),
        supabase.from('feedback').select('*', { count: 'exact' })
      ]);

      setStats({
        totalUsers: usersCount.count || 0,
        totalStories: storiesResult.count || 0,
        totalRecordings: recordingsResult.count || 0,
        totalFeedback: feedbackResult.count || 0
      });

      // Fetch detailed user data with metrics
      await fetchDetailedUsers();

      if (feedbackResult.data) setFeedback(feedbackResult.data);

      await fetchHeroImages();
      await fetchCarouselSettings();

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemConfiguration = async () => {
    try {
      // Fetch AI Models
      const { data: aiModelsData, error: aiError } = await supabase
        .from('ai_model_settings')
        .select('*')
        .order('service_name');

      if (aiError) throw aiError;
      setAiModels(aiModelsData || []);

      // Fetch Audio Quality Settings
      const { data: audioQualityData, error: audioQualityError } = await supabase
        .from('audio_quality_settings')
        .select('*')
        .limit(1)
        .single();

      if (audioQualityError && audioQualityError.code !== 'PGRST116') throw audioQualityError;
      setAudioQualitySettings(audioQualityData);

      // Fetch API Keys
      const { data: apiKeysData, error: apiError } = await supabase
        .from('api_keys')
        .select('*')
        .order('service_name');
      
      if (apiError) throw apiError;
      setApiKeys(apiKeysData || []);

      // Fetch Feature Flags
      const { data: flagsData, error: flagsError } = await supabase
        .from('feature_flags')
        .select('*')
        .order('flag_name');
      
      if (flagsError) throw flagsError;
      setFeatureFlags(flagsData || []);
    } catch (error) {
      console.error('Error fetching system configuration:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Get auth users for accurate count
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
      const totalUsersCount = authUsers?.length || 0;

      // Get basic counts
      const [storiesCount, recordingsCount, imagesCount] = await Promise.all([
        supabase.from('stories').select('*', { count: 'exact', head: true }),
        supabase.from('recordings').select('*', { count: 'exact', head: true }),
        supabase.from('images').select('*', { count: 'exact', head: true })
      ]);

      // Get average progress
      const { data: progressData } = await supabase
        .from('stories')
        .select('progress');

      const avgProgress = progressData?.length > 0
        ? progressData.reduce((sum, story) => sum + (story.progress || 0), 0) / progressData.length
        : 0;

      // Get weekly trends (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Count new users in last week
      const newUsersWeek = authUsers?.filter(u => new Date(u.created_at) >= weekAgo).length || 0;

      const [newStories, newRecordings] = await Promise.all([
        supabase.from('stories').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
        supabase.from('recordings').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString())
      ]);

      // Calculate monthly growth for last 6 months
      const monthlyGrowth = [];
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthName = monthDate.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });

        // Count users created in this month
        const monthUsers = authUsers?.filter(u => {
          const created = new Date(u.created_at);
          return created >= monthDate && created < nextMonthDate;
        }).length || 0;

        // Count stories in this month
        const { count: monthStories } = await supabase
          .from('stories')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthDate.toISOString())
          .lt('created_at', nextMonthDate.toISOString());

        // Count recordings in this month
        const { count: monthRecordings } = await supabase
          .from('recordings')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthDate.toISOString())
          .lt('created_at', nextMonthDate.toISOString());

        monthlyGrowth.push({
          month: monthName,
          users: monthUsers,
          stories: monthStories || 0,
          recordings: monthRecordings || 0
        });
      }

      // Get storage usage (estimated)
      const { data: recordingsWithDuration } = await supabase
        .from('recordings')
        .select('audio_duration_ms');

      const audioStorage = recordingsWithDuration?.reduce((sum, r) => sum + ((r.audio_duration_ms || 0) / 1000 * 0.1), 0) || 0;
      const imageStorage = (imagesCount.count || 0) * 0.5;

      setAnalytics({
        totalUsers: totalUsersCount,
        totalStories: storiesCount.count || 0,
        totalRecordings: recordingsCount.count || 0,
        totalImages: imagesCount.count || 0,
        averageProgress: Math.round(avgProgress),
        newUsersWeek,
        newStoriesWeek: newStories.count || 0,
        newRecordingsWeek: newRecordings.count || 0,
        storageUsage: {
          total: audioStorage + imageStorage,
          audio: audioStorage,
          images: imageStorage
        },
        topStorageUsers: [],
        monthlyGrowth
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };


  const fetchDetailedUsers = async () => {
    try {
      // Get all authenticated users from auth.users
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        console.error('Error fetching auth users:', authError);
        // Fallback to public users table if admin access fails
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, email, created_at');

        if (usersError) throw usersError;

        if (!usersData || usersData.length === 0) {
          setUsers([]);
          return;
        }

        const authUsersFromTable = usersData.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at
        }));

        await processUsersData(authUsersFromTable);
        return;
      }

      if (!authUsers || authUsers.length === 0) {
        setUsers([]);
        return;
      }

      const usersData = authUsers.map(u => ({
        id: u.id,
        email: u.email || '',
        created_at: u.created_at
      }));

      await processUsersData(usersData);
    } catch (error) {
      console.error('Error fetching detailed users:', error);
      setUsers([]);
    }
  };

  const processUsersData = async (usersData: { id: string; email: string; created_at: string }[]) => {
    try {

      // Get all stories for all users
      const { data: allStories } = await supabase
        .from('stories')
        .select('id, user_id, progress, updated_at');

      // Get all chapters for all stories
      const storyIds = allStories?.map(story => story.id) || [];
      const { data: allChapters } = await supabase
        .from('chapters')
        .select('id, story_id')
        .in('story_id', storyIds);

      // Get all recordings and images for all chapters
      const chapterIds = allChapters?.map(chapter => chapter.id) || [];
      const [recordingsResult, imagesResult] = await Promise.all([
        supabase.from('recordings').select('id, chapter_id').in('chapter_id', chapterIds),
        supabase.from('images').select('id, chapter_id').in('chapter_id', chapterIds)
      ]);

      // Process users with aggregated data
      const processedUsers: AdminUser[] = await Promise.all(
        usersData.map(async (user) => {
          try {
            // Filter stories for this user
            const userStories = allStories?.filter(story => story.user_id === user.id) || [];
            
            // Get chapters for user's stories
            const userStoryIds = userStories.map(story => story.id);
            const userChapters = allChapters?.filter(chapter => 
              userStoryIds.includes(chapter.story_id)
            ) || [];
            
            // Get recordings and images for user's chapters
            const userChapterIds = userChapters.map(chapter => chapter.id);
            const userRecordings = recordingsResult.data?.filter(recording => 
              userChapterIds.includes(recording.chapter_id)
            ) || [];
            const userImages = imagesResult.data?.filter(image => 
              userChapterIds.includes(image.chapter_id)
            ) || [];

            const stories = userStories;
            const totalStories = stories.length;
            const totalRecordings = userRecordings.length;
            const totalImages = userImages.length;
            const avgCompletion = totalStories > 0 
              ? stories.reduce((sum, story) => sum + (story.progress || 0), 0) / totalStories 
              : 0;
            const lastActivity = stories.length > 0 
              ? Math.max(...stories.map(s => new Date(s.updated_at).getTime()))
              : new Date(user.created_at).getTime();

            return {
              id: user.id,
              email: user.email,
              created_at: user.created_at,
              stories_count: totalStories,
              recordings_count: totalRecordings,
              images_count: totalImages,
              completion_ratio: Math.round(avgCompletion),
              tokens_used: 0, // TODO: Implement token tracking
              book_interest: false, // TODO: Implement book interest tracking
              last_activity: new Date(lastActivity).toISOString(),
              is_active: true // TODO: Implement user status tracking
            };
          } catch (error) {
            console.error(`Error fetching data for user ${user.id}:`, error);
            // Return basic user data if detailed fetch fails
            return {
              id: user.id,
              email: user.email,
              created_at: user.created_at,
              stories_count: 0,
              recordings_count: 0,
              images_count: 0,
              completion_ratio: 0,
              tokens_used: 0,
              book_interest: false,
              last_activity: user.created_at,
              is_active: true
            };
          }
        })
      );

      setUsers(processedUsers);
    } catch (error) {
      console.error('Error processing users data:', error);
      setUsers([]);
    }
  };

  const fetchHeroImages = async () => {
    try {
      const { data, error } = await supabase
        .from('hero_images')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setHeroImages(data || []);
    } catch (error) {
      console.error('Error fetching hero images:', error);
    }
  };

  const fetchCarouselSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('carousel_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setCarouselSettings(data);
      }
    } catch (error) {
      console.error('Error fetching carousel settings:', error);
    }
  };

  const updateAiModel = async (serviceId: string, newModelName: string) => {
    try {
      const { error } = await supabase
        .from('ai_model_settings')
        .update({ model_name: newModelName })
        .eq('id', serviceId);
      
      if (error) throw error;
      
      await fetchSystemConfiguration();
      alert('Modelo actualizado exitosamente');
    } catch (error) {
      console.error('Error updating AI model:', error);
      alert('Error al actualizar el modelo');
    }
  };

  const addApiKey = async () => {
    if (!newApiKey.service_name.trim() || !newApiKey.key_value.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .insert([newApiKey]);
      
      if (error) throw error;
      
      setNewApiKey({ service_name: '', key_value: '' });
      setShowAddApiKeyModal(false);
      await fetchSystemConfiguration();
      alert('Clave API añadida exitosamente');
    } catch (error) {
      console.error('Error adding API key:', error);
      alert('Error al añadir la clave API');
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta clave API?')) return;

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);
      
      if (error) throw error;
      
      await fetchSystemConfiguration();
      alert('Clave API eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('Error al eliminar la clave API');
    }
  };

  const toggleFeatureFlag = async (flagId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: !currentStatus })
        .eq('id', flagId);
      
      if (error) throw error;
      
      await fetchSystemConfiguration();
      alert('Funcionalidad actualizada exitosamente');
    } catch (error) {
      console.error('Error toggling feature flag:', error);
      alert('Error al actualizar la funcionalidad');
    }
  };

  const handleHeroImageUpload = async (file: File) => {
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Starting upload for file:', file.name, 'Size:', file.size, 'Type:', file.type);

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo debe ser menor a 5MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Solo se permiten archivos JPEG, PNG o WebP');
      return;
    }

    setHeroLoading(true);
    try {
      console.log('Step 1: Getting image dimensions...');
      // Get image dimensions using HTMLImageElement
      const dimensions = await new Promise<{width: number, height: number}>((resolve, reject) => {
        const img = document.createElement('img');
        img.onload = () => {
          console.log('Image loaded. Dimensions:', img.naturalWidth, 'x', img.naturalHeight);
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
          URL.revokeObjectURL(img.src);
        };
        img.onerror = (e) => {
          console.error('Failed to load image for dimensions', e);
          URL.revokeObjectURL(img.src);
          reject(new Error('Failed to load image'));
        };
        img.src = URL.createObjectURL(file);
      });

      // Upload to storage
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      console.log('Step 2: Uploading to storage bucket hero-images with filename:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('hero-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful, data:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('hero-images')
        .getPublicUrl(fileName);

      console.log('Step 3: Public URL generated:', publicUrl);

      // Get next display order
      const nextOrder = heroImages.length > 0 ? Math.max(...heroImages.map(img => img.display_order)) + 1 : 1;
      console.log('Step 4: Inserting into database with order:', nextOrder);

      // Create database record
      const { data: insertData, error } = await supabase
        .from('hero_images')
        .insert([{
          image_url: publicUrl,
          alt_text: '',
          display_order: nextOrder,
          is_active: true,
          width: dimensions.width,
          height: dimensions.height,
          file_size: file.size
        }])
        .select();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      console.log('Database insert successful:', insertData);
      console.log('Step 5: Refreshing hero images list...');

      await fetchHeroImages();
      alert('Imagen subida exitosamente');
      console.log('Upload complete!');
    } catch (error: any) {
      console.error('Error uploading hero image:', error);
      console.error('Error details:', {
        message: error?.message,
        statusCode: error?.statusCode,
        details: error?.details,
        hint: error?.hint
      });
      alert(`Error al subir la imagen: ${error?.message || 'Error desconocido'}`);
    } finally {
      setHeroLoading(false);
    }
  };

  const updateHeroImageAltText = async (imageId: string, altText: string) => {
    try {
      const { error } = await supabase
        .from('hero_images')
        .update({ alt_text: altText })
        .eq('id', imageId);

      if (error) throw error;

      setHeroImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, alt_text: altText } : img
      ));
    } catch (error) {
      console.error('Error updating alt text:', error);
    }
  };

  const toggleHeroImageActive = async (imageId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('hero_images')
        .update({ is_active: !isActive })
        .eq('id', imageId);

      if (error) throw error;

      setHeroImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, is_active: !isActive } : img
      ));
    } catch (error) {
      console.error('Error toggling image status:', error);
    }
  };

  const moveHeroImage = async (imageId: string, direction: 'up' | 'down') => {
    const currentIndex = heroImages.findIndex(img => img.id === imageId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= heroImages.length) return;

    const newImages = [...heroImages];
    [newImages[currentIndex], newImages[newIndex]] = [newImages[newIndex], newImages[currentIndex]];

    // Update display orders
    const updates = newImages.map((img, index) => ({
      id: img.id,
      display_order: index + 1
    }));

    try {
      for (const update of updates) {
        await supabase
          .from('hero_images')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      await fetchHeroImages();
    } catch (error) {
      console.error('Error reordering images:', error);
    }
  };

  const deleteHeroImage = async (imageId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen del carrusel?')) {
      return;
    }

    try {
      const image = heroImages.find(img => img.id === imageId);
      if (!image) return;

      // Delete from database
      const { error } = await supabase
        .from('hero_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      // Delete from storage
      const fileName = image.image_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('hero-images')
          .remove([fileName]);
      }

      await fetchHeroImages();
    } catch (error) {
      console.error('Error deleting hero image:', error);
      alert('Error al eliminar la imagen');
    }
  };

  const saveCarouselSettings = async () => {
    try {
      const { error } = await supabase
        .from('carousel_settings')
        .upsert({
          ...carouselSettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSettingsChanged(false);
      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving carousel settings:', error);
      alert('Error al guardar la configuración');
    }
  };

  const handleSort = (field: keyof AdminUser) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof AdminUser) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const exportData = async (type: 'users' | 'feedback') => {
    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'users':
        data = filteredUsers;
        filename = 'users.csv';
        break;
      case 'feedback':
        data = feedback;
        filename = 'feedback.csv';
        break;
    }

    // Convert to CSV
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(value => 
      typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
    ).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleViewUserStories = (userId: string) => {
    // TODO: Implement user impersonation view
    alert(`Ver historias del usuario: ${userId}`);
  };

  const handleToggleUserStatus = (user: AdminUser) => {
    const action = user.is_active ? 'desactivar' : 'activar';
    setConfirmModal({
      isOpen: true,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Usuario`,
      message: `¿Estás seguro de que quieres ${action} la cuenta de ${user.email}?`,
      onConfirm: async () => {
        try {
          // TODO: Implement user status toggle
          console.log(`Toggle user status: ${user.id}`);
          setConfirmModal(prev => ({ ...prev, loading: true }));
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Update local state
          setUsers(prev => prev.map(u => 
            u.id === user.id ? { ...u, is_active: !u.is_active } : u
          ));
          
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (error) {
          console.error('Error toggling user status:', error);
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      },
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleResetPassword = (user: AdminUser) => {
    setConfirmModal({
      isOpen: true,
      title: 'Resetear Contraseña',
      message: `¿Enviar email de reseteo de contraseña a ${user.email}?`,
      onConfirm: async () => {
        try {
          setConfirmModal(prev => ({ ...prev, loading: true }));
          
          const { error } = await supabase.auth.resetPasswordForEmail(user.email);
          if (error) throw error;
          
          alert('Email de reseteo enviado exitosamente');
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (error) {
          console.error('Error resetting password:', error);
          alert('Error al enviar email de reseteo');
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      },
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleDeleteUser = (user: AdminUser) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Usuario',
      message: `¿Estás seguro de que quieres eliminar permanentemente la cuenta de ${user.email}? Esta acción eliminará todas sus historias, grabaciones e imágenes y NO se puede deshacer.`,
      onConfirm: async () => {
        try {
          setConfirmModal(prev => ({ ...prev, loading: true }));
          
          // TODO: Implement user deletion with cascade
          console.log(`Delete user: ${user.id}`);
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Update local state
          setUsers(prev => prev.filter(u => u.id !== user.id));
          
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (error) {
          console.error('Error deleting user:', error);
          alert('Error al eliminar usuario');
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      },
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
    });
  };


  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  const adminTabs = [
    { id: 'users' as AdminTab, label: 'Gestión de Usuarios', icon: Users },
    { id: 'chapters-questions' as AdminTab, label: 'Capítulos y Preguntas', icon: List },
    { id: 'role-permissions' as AdminTab, label: 'Permisos de Roles', icon: Settings },
    { id: 'hero-carousel' as AdminTab, label: 'Carrusel Hero', icon: Image },
    { id: 'ai-config' as AdminTab, label: 'Configuración de IA', icon: Brain },
    { id: 'analytics' as AdminTab, label: 'Análisis y Reportes', icon: BarChart3 },
    { id: 'feedback' as AdminTab, label: 'Gestión de Feedback', icon: MessageSquare },
    { id: 'internal-notes' as AdminTab, label: 'Notas Internas', icon: FileText }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Usuarios ({filteredUsers.length} de {users.length})
              </h3>
              
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                <Button
                  onClick={() => exportData('users')}
                  icon={Download}
                  variant="outline"
                  size="sm"
                  disabled={filteredUsers.length === 0}
                >
                  Exportar CSV
                </Button>
              </div>
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm 
                    ? "No se encontraron usuarios que coincidan con la búsqueda"
                    : "No hay usuarios registrados"
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('email')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Email</span>
                          {getSortIcon('email')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('stories_count')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Historias</span>
                          {getSortIcon('stories_count')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('recordings_count')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Grabaciones</span>
                          {getSortIcon('recordings_count')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('images_count')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Imágenes</span>
                          {getSortIcon('images_count')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completado
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('tokens_used')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Tokens</span>
                          {getSortIcon('tokens_used')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Libro Físico
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('last_activity')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Última Actividad</span>
                          {getSortIcon('last_activity')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.stories_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.recordings_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.images_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${user.completion_ratio}%` }}
                              />
                            </div>
                            <span className="text-xs">{user.completion_ratio}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.tokens_used.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.book_interest 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.book_interest ? 'Interesado' : 'No solicitado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.last_activity).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => handleViewUserStories(user.id)}
                              icon={Eye}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Ver historias del usuario"
                            />
                            <Button
                              onClick={() => handleToggleUserStatus(user)}
                              icon={user.is_active ? UserX : UserCheck}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                            />
                            <Button
                              onClick={() => handleResetPassword(user)}
                              icon={Key}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Resetear contraseña"
                            />
                            <Button
                              onClick={() => handleDeleteUser(user)}
                              icon={Trash2}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar usuario"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case 'chapters-questions':
        return <ChaptersManager />;

      case 'role-permissions':
        return <RolePermissionsManager />;

      case 'hero-carousel':
        return (
          <div className="space-y-6">
            {/* Header with Upload Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Gestión del Carrusel Hero
              </h2>
              <div className="flex space-x-3">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleHeroImageUpload(file);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                  id="hero-upload"
                />
                <Button
                  onClick={() => {
                    const input = document.getElementById('hero-upload') as HTMLInputElement;
                    if (input) input.click();
                  }}
                  icon={Upload}
                  loading={heroLoading}
                  disabled={heroLoading}
                >
                  {heroImages.length === 0 ? 'Subir Primera Imagen' : 'Subir Imagen'}
                </Button>
              </div>
            </div>

            {/* Hero Images List */}
            {heroImages.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Imágenes del Carrusel ({heroImages.length})
                  </h3>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {heroImages.map((image, index) => (
                    <div key={image.id} className="p-6 flex items-center space-x-4">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        <img
                          src={image.image_url}
                          alt={image.alt_text || 'Hero image'}
                          className={`w-24 h-16 object-cover rounded-lg cursor-pointer ${
                            !image.is_active ? 'grayscale opacity-50' : ''
                          }`}
                          onClick={() => window.open(image.image_url, '_blank')}
                        />
                      </div>

                      {/* Image Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-4 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            Orden: {image.display_order}
                          </span>
                          <span className="text-sm text-gray-500">
                            {image.width} x {image.height}px
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            image.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {image.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        
                        <input
                          type="text"
                          placeholder="Texto alternativo (alt text)"
                          value={image.alt_text || ''}
                          onChange={(e) => updateHeroImageAltText(image.id, e.target.value)}
                          className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        {/* View Full Image */}
                        <Button
                          onClick={() => window.open(image.image_url, '_blank')}
                          icon={Eye}
                          variant="ghost"
                          size="sm"
                        />
                        
                        {/* Toggle Active Status */}
                        <Button
                          onClick={() => toggleHeroImageActive(image.id, image.is_active)}
                          icon={image.is_active ? EyeOff : Eye}
                          variant="ghost"
                          size="sm"
                        />
                        
                        {/* Move Up */}
                        <Button
                          onClick={() => moveHeroImage(image.id, 'up')}
                          icon={ChevronUp}
                          variant="ghost"
                          size="sm"
                          disabled={index === 0}
                        />
                        
                        {/* Move Down */}
                        <Button
                          onClick={() => moveHeroImage(image.id, 'down')}
                          icon={ChevronDown}
                          variant="ghost"
                          size="sm"
                          disabled={index === heroImages.length - 1}
                        />
                        
                        {/* Delete */}
                        <Button
                          onClick={() => deleteHeroImage(image.id)}
                          icon={Trash2}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Image className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay imágenes en el carrusel
                </h3>
                <p className="text-gray-600 mb-6">
                  Sube la primera imagen para comenzar a configurar el carrusel hero.
                </p>
                <Button
                  onClick={() => {
                    const input = document.getElementById('hero-upload') as HTMLInputElement;
                    if (input) input.click();
                  }}
                  icon={Upload}
                  loading={heroLoading}
                >
                  Subir Primera Imagen
                </Button>
              </div>
            )}

            {/* Carousel Settings */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Configuración del Carrusel
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Transition Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duración de Transición (ms)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="10000"
                    step="500"
                    value={carouselSettings.transition_duration}
                    onChange={(e) => {
                      setCarouselSettings(prev => ({
                        ...prev,
                        transition_duration: parseInt(e.target.value)
                      }));
                      setSettingsChanged(true);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Auto Play */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reproducción Automática
                  </label>
                  <button
                    onClick={() => {
                      setCarouselSettings(prev => ({
                        ...prev,
                        auto_play: !prev.auto_play
                      }));
                      setSettingsChanged(true);
                    }}
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-medium ${
                      carouselSettings.auto_play
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-gray-50 border-gray-200 text-gray-800'
                    }`}
                  >
                    {carouselSettings.auto_play ? 'Activado' : 'Desactivado'}
                  </button>
                </div>

                {/* Transition Effect */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Efecto de Transición
                  </label>
                  <select
                    value={carouselSettings.transition_effect}
                    onChange={(e) => {
                      setCarouselSettings(prev => ({
                        ...prev,
                        transition_effect: e.target.value
                      }));
                      setSettingsChanged(true);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                    <option value="zoom">Zoom</option>
                  </select>
                </div>
              </div>

              {/* Save Settings Button */}
              <div className="mt-6">
                <Button
                  onClick={saveCarouselSettings}
                  icon={Save}
                  disabled={!settingsChanged}
                  className={!settingsChanged ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  Guardar Configuración
                </Button>
              </div>
            </div>
          </div>
        );

      case 'ai-config':
        return (
          <div className="space-y-6">
            {/* AI Configuration Sub-tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'audio_transcripts', label: 'Audio Transcripts', icon: Mic },
                  { id: 'audio_quality', label: 'Audio Quality', icon: Settings },
                  { id: 'memory_writing', label: 'Memory Writing', icon: FileText }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAiConfigTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      aiConfigTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Audio Transcripts */}
            {aiConfigTab === 'audio_transcripts' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Changes to AI configuration will apply immediately to all new transcriptions. Use Temperature=0 for maximum accuracy and consistency.
                  </p>
                </div>

                {aiModels
                  .filter((model: any) => model.service_type === 'transcription')
                  .map((model: any) => (
                    <AIModelSettings
                      key={model.id}
                      model={model}
                      onUpdate={fetchSystemConfiguration}
                    />
                  ))}
              </div>
            )}

            {/* Audio Quality */}
            {aiConfigTab === 'audio_quality' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Audio quality validation settings control when users receive warnings about their recordings. These thresholds help ensure quality without blocking legitimate recordings.
                  </p>
                </div>

                {audioQualitySettings ? (
                  <AudioQualitySettings
                    settings={audioQualitySettings}
                    onUpdate={fetchSystemConfiguration}
                  />
                ) : (
                  <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Loading audio quality settings...</p>
                  </div>
                )}
              </div>
            )}

            {/* Memory Writing */}
            {aiConfigTab === 'memory_writing' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Memory Writing Configuration</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Configuration options for AI-assisted memory writing will be available here.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            {/* Header with Refresh Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Análisis y Reportes</h2>
              <Button
                onClick={fetchAnalytics}
                icon={RefreshCw}
                variant="outline"
                size="sm"
                loading={loading}
              >
                Actualizar
              </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Usuarios</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics.totalUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center">
                  <BookOpen className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Historias</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics.totalStories}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center">
                  <Mic className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Grabaciones</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics.totalRecordings}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center">
                  <Camera className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Imágenes</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics.totalImages}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress and Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Completado Promedio</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-teal-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${analytics.averageProgress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">{analytics.averageProgress}%</span>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencias (Última Semana)</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Nuevos Usuarios</span>
                    <span className="font-semibold text-gray-900">{analytics.newUsersWeek}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Nuevas Historias</span>
                    <span className="font-semibold text-gray-900">{analytics.newStoriesWeek}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Nuevas Grabaciones</span>
                    <span className="font-semibold text-gray-900">{analytics.newRecordingsWeek}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Usage */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Uso de Almacenamiento</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Estimado</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics.storageUsage.total.toFixed(1)} MB
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Audio</p>
                  <p className="text-2xl font-semibold text-purple-600">
                    {analytics.storageUsage.audio.toFixed(1)} MB
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Imágenes</p>
                  <p className="text-2xl font-semibold text-orange-600">
                    {analytics.storageUsage.images.toFixed(1)} MB
                  </p>
                </div>
              </div>
            </div>

            {/* Historical Growth Trends */}
            {analytics.monthlyGrowth.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Crecimiento Histórico (Últimos 6 Meses)</h3>

                <div className="space-y-6">
                  {/* Users Growth */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Nuevos Usuarios por Mes</span>
                      <Users className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="space-y-2">
                      {analytics.monthlyGrowth.map((month) => {
                        const maxUsers = Math.max(...analytics.monthlyGrowth.map(m => m.users), 1);
                        const percentage = (month.users / maxUsers) * 100;
                        return (
                          <div key={month.month} className="flex items-center space-x-3">
                            <span className="text-xs text-gray-500 w-16">{month.month}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                              <div
                                className="bg-blue-500 h-6 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                                {month.users}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stories Growth */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Historias Creadas por Mes</span>
                      <BookOpen className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="space-y-2">
                      {analytics.monthlyGrowth.map((month) => {
                        const maxStories = Math.max(...analytics.monthlyGrowth.map(m => m.stories), 1);
                        const percentage = (month.stories / maxStories) * 100;
                        return (
                          <div key={month.month} className="flex items-center space-x-3">
                            <span className="text-xs text-gray-500 w-16">{month.month}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                              <div
                                className="bg-green-500 h-6 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                                {month.stories}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recordings Growth */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Grabaciones por Mes</span>
                      <Mic className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="space-y-2">
                      {analytics.monthlyGrowth.map((month) => {
                        const maxRecordings = Math.max(...analytics.monthlyGrowth.map(m => m.recordings), 1);
                        const percentage = (month.recordings / maxRecordings) * 100;
                        return (
                          <div key={month.month} className="flex items-center space-x-3">
                            <span className="text-xs text-gray-500 w-16">{month.month}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                              <div
                                className="bg-purple-500 h-6 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                                {month.recordings}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'feedback':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Feedback ({feedback.length})</h3>
              <Button
                onClick={() => exportData('feedback')}
                icon={Download}
                variant="outline"
                size="sm"
              >
                Exportar
              </Button>
            </div>
            <div className="space-y-4">
              {feedback.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{item.user_email}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{item.message}</p>
                </div>
              ))}
              {feedback.length === 0 && (
                <p className="text-gray-500 text-center py-8">No hay feedback disponible</p>
              )}
            </div>
          </div>
        );

      case 'internal-notes':
        return (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-8 text-center">
            <MessageSquare className="h-16 w-16 text-purple-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Notas Internas
            </h3>
            <p className="text-gray-600 mb-6">
              Sistema de notas internas para el equipo administrativo.
            </p>
            <p className="text-sm text-gray-500">
              Esta funcionalidad estará disponible próximamente.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="lg" message="Cargando panel de administración..." />
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              icon={ArrowLeft}
              onClick={() => navigate('/dashboard')}
            >
              Volver al Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          </div>
          <div className="text-sm text-gray-500">
            Admin: {user?.email}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Usuarios</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BookOpen className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Historias</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalStories}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Grabaciones</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalRecordings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageSquare className="h-8 w-8 text-orange-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Feedback</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalFeedback}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-1 px-6 overflow-x-auto">
              {adminTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
      </Layout>
      
      {/* Add API Key Modal */}
      <Modal
        isOpen={showAddApiKeyModal}
        onClose={() => setShowAddApiKeyModal(false)}
        title="Añadir Clave API"
      >
        <div className="space-y-4">
          <Input
            label="Nombre del Servicio"
            value={newApiKey.service_name}
            onChange={(e) => setNewApiKey({ ...newApiKey, service_name: e.target.value })}
            placeholder="ej: openai, elevenlabs"
          />
          
          <Input
            label="Valor de la Clave"
            type="password"
            value={newApiKey.key_value}
            onChange={(e) => setNewApiKey({ ...newApiKey, key_value: e.target.value })}
            placeholder="Pega aquí la clave API"
          />
          
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAddApiKeyModal(false)}
              fullWidth
            >
              Cancelar
            </Button>
            
            <Button
              onClick={addApiKey}
              fullWidth
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.onCancel}
        title={confirmModal.title}
        showCloseButton={!confirmModal.loading}
      >
        <div className="space-y-4">
          <p className="text-gray-700">{confirmModal.message}</p>
          
          <div className="flex space-x-3">
            <Button
              onClick={confirmModal.onCancel}
              variant="outline"
              fullWidth
              disabled={confirmModal.loading}
            >
              Cancelar
            </Button>
            
            <Button
              onClick={confirmModal.onConfirm}
              variant="danger"
              fullWidth
              loading={confirmModal.loading}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AdminPanel;