import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Story, StoryFamilyGroup } from '../types';
import { optimizeImage, validateDateOfBirth } from '../lib/utils';
import { requestDeduplicator } from '../lib/requestCache';

interface StoryState {
  stories: Story[];
  loading: boolean;
  fetchStoriesForFamily: (familyGroupId: string) => Promise<void>;
  createStory: (data: {
    title: string;
    relationship: string;
    dateOfBirth: string;
    mode: 'adult' | 'child';
    photo?: File;
    familyGroupId?: string;
    familyGroupIds?: string[];
  }) => Promise<{ success: boolean; error?: string; storyId?: string }>;
  updateStoryPhoto: (storyId: string, photo: File) => Promise<{ success: boolean; error?: string }>;
  deleteStory: (storyId: string, familyGroupId?: string) => Promise<{ success: boolean; error?: string; scope?: 'single' | 'all' }>;
  getStoryById: (id: string) => Story | null;
  getStoryFamilies: (storyId: string) => Promise<StoryFamilyGroup[]>;
  addStoryToFamily: (storyId: string, familyGroupId: string) => Promise<{ success: boolean; error?: string }>;
  removeStoryFromFamily: (storyId: string, familyGroupId: string) => Promise<{ success: boolean; error?: string }>;
  generateShareToken: (storyId: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  revokeShareToken: (storyId: string) => Promise<{ success: boolean; error?: string }>;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  stories: [],
  loading: false,

  fetchStoriesForFamily: async (familyGroupId: string) => {
    return requestDeduplicator.deduplicate(`fetchStoriesForFamily:${familyGroupId}`, async () => {
      set({ loading: true });
      try {
      const { data: storyFamilies, error: sfError } = await supabase
        .from('story_family_groups')
        .select(`
          story_id,
          stories (
            id,
            user_id,
            created_by,
            title,
            relationship,
            photo_url,
            progress,
            is_complete,
            mode,
            date_of_birth,
            created_at,
            updated_at
          )
        `)
        .eq('family_group_id', familyGroupId);

      if (sfError) throw sfError;

      const stories = (storyFamilies || []).map((sf: any) => sf.stories).filter(Boolean);

      // Set initial stories immediately
      set({ stories, loading: false });

      // Update progress for adult mode stories in parallel (non-blocking)
      const adultStories = stories.filter(s => s.mode === 'adult');
      if (adultStories.length > 0) {
        // Fire progress updates in parallel without waiting
        Promise.all(
          adultStories.map(async (story) => {
            try {
              await supabase.rpc('update_story_progress', { story_id_param: story.id });
            } catch (err) {
              console.error(`Error updating progress for story ${story.id}:`, err);
            }
          })
        ).then(async () => {
          // After progress updates complete, silently refresh stories
          try {
            const { data } = await supabase
              .from('story_family_groups')
              .select(`
                story_id,
                stories (
                  id,
                  user_id,
                  created_by,
                  title,
                  relationship,
                  photo_url,
                  progress,
                  is_complete,
                  mode,
                  date_of_birth,
                  created_at,
                  updated_at
                )
              `)
              .eq('family_group_id', familyGroupId);

            if (data) {
              const updatedStories = data.map((sf: any) => sf.stories).filter(Boolean);
              set({ stories: updatedStories });
            }
          } catch (err) {
            console.error('Error refreshing stories after progress update:', err);
          }
        }).catch(err => {
          console.error('Error in progress update batch:', err);
        });
        }
      } catch (error) {
        console.error('Error fetching stories:', error);
        set({ loading: false });
      }
    });
  },

  createStory: async (data) => {
    try {
      console.log('[StoryStore] Creating story with data:', { ...data, photo: data.photo ? 'Present' : 'None' });

      // Get current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('[StoryStore] Auth error:', authError);
        return { success: false, error: 'Usuario no autenticado' };
      }

      console.log('[StoryStore] User authenticated:', user.id);

      let photo_url = null;

      if (data.photo) {
        try {
          const optimizedImage = await optimizeImage(data.photo);
          const baseFileName = data.photo.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9.-]/g, '_');
          const fileName = `${user.id}/${Date.now()}_${baseFileName}.webp`;

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

      // Convert date to ISO format if needed
      let dateToStore = data.dateOfBirth;
      const validation = validateDateOfBirth(data.dateOfBirth);
      if (validation.isValid && validation.isoDate) {
        dateToStore = validation.isoDate;
      }

      // Create the story record
      console.log('[StoryStore] Creating story record...');
      const { data: story, error } = await supabase
        .from('stories')
        .insert([{
          user_id: user.id,
          created_by: user.id,
          title: data.title.trim(),
          relationship: data.relationship,
          date_of_birth: dateToStore,
          mode: data.mode,
          photo_url,
          progress: 0,
          is_complete: false
        }])
        .select()
        .single();

      if (error) {
        console.error('[StoryStore] Story creation error:', error);
        throw new Error('Error al crear la historia: ' + error.message);
      }

      console.log('[StoryStore] Story created:', story.id);

      // Associate story with family groups
      const familyIds = data.familyGroupIds || (data.familyGroupId ? [data.familyGroupId] : []);

      if (familyIds.length === 0) {
        await supabase.from('stories').delete().eq('id', story.id);
        throw new Error('No se especificaron familias para la historia');
      }

      if (familyIds.length > 4) {
        await supabase.from('stories').delete().eq('id', story.id);
        throw new Error('Una historia no puede estar en más de 4 familias');
      }

      console.log('[StoryStore] Associating story with families:', familyIds);

      const familyAssociations = familyIds.map(familyId => ({
        story_id: story.id,
        family_group_id: familyId,
        added_by: user.id
      }));

      const { error: familyError } = await supabase
        .from('story_family_groups')
        .insert(familyAssociations);

      if (familyError) {
        console.error('[StoryStore] Family association error:', familyError);
        // Delete the story if family association fails
        await supabase.from('stories').delete().eq('id', story.id);
        throw new Error('Error al asociar la historia con las familias: ' + familyError.message);
      }

      console.log('[StoryStore] Story associated with families successfully');

      // Update local state
      set(state => ({
        stories: [story, ...state.stories]
      }));

      console.log('[StoryStore] Story creation complete!');
      return { success: true, storyId: story.id };
    } catch (error: any) {
      console.error('[StoryStore] Create story error:', error);
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
      const baseFileName = photo.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${user.id}/${Date.now()}_${baseFileName}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, optimizedImage, {
          contentType: 'image/webp',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from('stories')
        .update({ photo_url: publicUrl })
        .eq('id', storyId);

      if (error) {
        throw error;
      }

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

  deleteStory: async (storyId, familyGroupId?) => {
    try {
      if (familyGroupId) {
        // Remove story from specific family only
        const { error } = await supabase
          .from('story_family_groups')
          .delete()
          .eq('story_id', storyId)
          .eq('family_group_id', familyGroupId);

        if (error) throw error;

        // Check if story still belongs to other families
        const { data: remaining } = await supabase
          .from('story_family_groups')
          .select('id')
          .eq('story_id', storyId);

        // If no families remain, delete the story entirely
        if (!remaining || remaining.length === 0) {
          await supabase.from('stories').delete().eq('id', storyId);
        }

        set(state => ({
          stories: state.stories.filter(story => story.id !== storyId)
        }));

        return { success: true, scope: 'single' };
      } else {
        // Delete story from all families
        const { error } = await supabase
          .from('stories')
          .delete()
          .eq('id', storyId);

        if (error) throw error;

        set(state => ({
          stories: state.stories.filter(story => story.id !== storyId)
        }));

        return { success: true, scope: 'all' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  getStoryFamilies: async (storyId: string) => {
    try {
      const { data, error } = await supabase
        .from('story_family_groups')
        .select(`
          id,
          story_id,
          family_group_id,
          added_by,
          added_at,
          family_groups (
            id,
            name,
            created_by,
            created_at,
            settings
          )
        `)
        .eq('story_id', storyId);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching story families:', error);
      return [];
    }
  },

  addStoryToFamily: async (storyId: string, familyGroupId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      const { error } = await supabase
        .from('story_family_groups')
        .insert([{
          story_id: storyId,
          family_group_id: familyGroupId,
          added_by: user.id
        }]);

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'La historia ya está en esta familia' };
        }
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error adding story to family:', error);
      return { success: false, error: error.message || 'Error al agregar historia a la familia' };
    }
  },

  removeStoryFromFamily: async (storyId: string, familyGroupId: string) => {
    try {
      const { error } = await supabase
        .from('story_family_groups')
        .delete()
        .eq('story_id', storyId)
        .eq('family_group_id', familyGroupId);

      if (error) throw error;

      // Check if story still belongs to other families
      const { data: remaining } = await supabase
        .from('story_family_groups')
        .select('id')
        .eq('story_id', storyId);

      // If no families remain, delete the story
      if (!remaining || remaining.length === 0) {
        await supabase.from('stories').delete().eq('id', storyId);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error removing story from family:', error);
      return { success: false, error: error.message || 'Error al remover historia de la familia' };
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