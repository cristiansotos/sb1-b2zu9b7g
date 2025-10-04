import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Story } from '../types';
import { optimizeImage } from '../lib/utils';

interface StoryState {
  stories: Story[];
  loading: boolean;
  fetchStories: () => Promise<void>;
  createStory: (data: {
    title: string;
    relationship: string;
    dateOfBirth: string;
    mode: 'adult' | 'child';
    photo?: File;
  }) => Promise<{ success: boolean; error?: string; storyId?: string }>;
  updateStoryPhoto: (storyId: string, photo: File) => Promise<{ success: boolean; error?: string }>;
  deleteStory: (storyId: string) => Promise<{ success: boolean; error?: string }>;
  getStoryById: (id: string) => Story | null;
  generateShareToken: (storyId: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  revokeShareToken: (storyId: string) => Promise<{ success: boolean; error?: string }>;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  stories: [],
  loading: false,

  fetchStories: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ stories: data || [] });
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      set({ loading: false });
    }
  },

  createStory: async (data) => {
    try {
      // Get current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      let photo_url = null;

      if (data.photo) {
        try {
          const optimizedImage = await optimizeImage(data.photo);
          const fileName = `${user.id}/${Date.now()}_${data.photo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          
          const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(fileName, optimizedImage, {
              contentType: 'image/webp',
              upsert: false
            });

          if (uploadError) {
            console.error('Photo upload error:', uploadError);
            throw new Error('Error al subir la foto');
          }

          const { data: { publicUrl } } = supabase.storage
            .from('photos')
            .getPublicUrl(fileName);
          
          photo_url = publicUrl;
        } catch (photoError) {
          console.error('Photo processing error:', photoError);
          return { success: false, error: 'Error al procesar la foto' };
        }
      }

      // Create the story record
      const { data: story, error } = await supabase
        .from('stories')
        .insert([{
          user_id: user.id,
          title: data.title.trim(),
          relationship: data.relationship,
          date_of_birth: data.dateOfBirth,
          mode: data.mode,
          photo_url,
          progress: 0,
          is_complete: false
        }])
        .select()
        .single();

      if (error) {
        console.error('Story creation error:', error);
        throw new Error('Error al crear la historia');
      }

      // Update local state
      set(state => ({
        stories: [story, ...state.stories]
      }));

      return { success: true, storyId: story.id };
    } catch (error: any) {
      console.error('Create story error:', error);
      return { 
        success: false, 
        error: error.message || 'Error desconocido al crear la historia' 
      };
    }
  },

  updateStoryPhoto: async (storyId, photo) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      const optimizedImage = await optimizeImage(photo);
      const fileName = `${user.id}/${Date.now()}_${photo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, optimizedImage, {
          contentType: 'image/webp',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from('stories')
        .update({ photo_url: publicUrl })
        .eq('id', storyId);

      if (error) throw error;

      set(state => ({
        stories: state.stories.map(story =>
          story.id === storyId ? { ...story, photo_url: publicUrl } : story
        )
      }));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  deleteStory: async (storyId) => {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;

      set(state => ({
        stories: state.stories.filter(story => story.id !== storyId)
      }));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  getStoryById: (id) => {
    const { stories } = get();
    return stories.find(story => story.id === id) || null;
  },

  generateShareToken: async (storyId) => {
    try {
      const { data, error } = await supabase.rpc('generate_share_token', {
        p_story_id: storyId
      });

      if (error) throw error;

      return { success: true, token: data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  revokeShareToken: async (storyId) => {
    try {
      const { error } = await supabase.rpc('revoke_share_token', {
        p_story_id: storyId
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}));