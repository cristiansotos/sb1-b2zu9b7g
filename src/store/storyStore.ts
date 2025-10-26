import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Story, StoryFamilyGroup } from '../types';
import { optimizeImage, validateDateOfBirth } from '../lib/utils';
import { requestDeduplicator } from '../lib/requestCache';
import { withTimeout, getUserFriendlyError, isTimeoutError } from '../lib/queryUtils';
import { performanceMonitor } from '../lib/performanceMonitor';

interface StoryState {
  stories: Story[];
  loading: boolean;
  reset: () => void;
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

let backgroundRefreshInProgress = false;
let lastRefreshTime = 0;
let backgroundRefreshTimeoutId: NodeJS.Timeout | null = null;
let currentActiveFamilyId: string | null = null;
const MIN_REFRESH_INTERVAL = 5000;

export const useStoryStore = create<StoryState>((set, get) => ({
  stories: [],
  loading: false,

  reset: () => {
    console.log('[StoryStore] Resetting store');
    backgroundRefreshInProgress = false;
    // Cancel any pending background refresh
    if (backgroundRefreshTimeoutId) {
      clearTimeout(backgroundRefreshTimeoutId);
      backgroundRefreshTimeoutId = null;
    }
    currentActiveFamilyId = null;
    set({ stories: [], loading: false });
  },

  fetchStoriesForFamily: async (familyGroupId: string) => {
    const cacheKey = `fetchStoriesForFamily:${familyGroupId}`;
    const perfMark = `fetchStoriesForFamily_${familyGroupId}_${Date.now()}`;

    performanceMonitor.mark(perfMark);
    console.log('[StoryStore] fetchStoriesForFamily called for:', familyGroupId);

    // Cancel any pending background refresh from previous family
    if (backgroundRefreshTimeoutId) {
      console.log('[StoryStore] Cancelling previous background refresh');
      clearTimeout(backgroundRefreshTimeoutId);
      backgroundRefreshTimeoutId = null;
      backgroundRefreshInProgress = false;
    }

    // Update active family ID
    currentActiveFamilyId = familyGroupId;

    // Clear any stale cached data for this family AND related patterns
    requestDeduplicator.invalidateCachePattern(familyGroupId);

    set({ loading: true });
    try {
      console.log('[StoryStore] Fetching stories for family:', familyGroupId);

      const storiesQuery = supabase
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

      const { data: storyFamilies, error: sfError } = await withTimeout(
        storiesQuery,
        25000,
        'Loading stories timed out'
      );

      if (sfError) {
        console.error('[StoryStore] Error fetching stories:', sfError);
        set({ loading: false, stories: [] });
        throw sfError;
      }

      console.log('[StoryStore] Successfully fetched', storyFamilies?.length || 0, 'story associations');
      const stories = (storyFamilies || []).map((sf: any) => sf.stories).filter(Boolean);
      console.log('[StoryStore] Mapped to', stories.length, 'stories');

      set({ stories, loading: false });
      performanceMonitor.measure(`fetchStoriesForFamily_${familyGroupId}`, perfMark);

      const adultStories = stories.filter((s: Story) => s.mode === 'adult');
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime;

      if (adultStories.length > 0 && !backgroundRefreshInProgress && timeSinceLastRefresh > MIN_REFRESH_INTERVAL) {
        console.log('[StoryStore] Scheduling background progress update for', adultStories.length, 'adult stories');
        backgroundRefreshInProgress = true;
        lastRefreshTime = now;

        // Use setTimeout to defer this to next tick, ensuring UI is responsive
        backgroundRefreshTimeoutId = setTimeout(() => {
          // Capture the family ID at the time of scheduling
          const capturedFamilyId = familyGroupId;

          Promise.allSettled(
            adultStories.map(async (story: Story) => {
              try {
                await withTimeout(
                  supabase.rpc('update_story_progress', { story_id_param: story.id }),
                  8000
                );
              } catch (err) {
                if (!isTimeoutError(err)) {
                  console.error(`[StoryStore] Error updating progress for story ${story.id}:`, err);
                }
              }
            })
          ).then(async () => {
            try {
              // CRITICAL: Only update if we're still on the same family
              if (currentActiveFamilyId !== capturedFamilyId) {
                console.log('[StoryStore] Skipping background refresh - family changed from', capturedFamilyId, 'to', currentActiveFamilyId);
                return;
              }

              console.log('[StoryStore] Refreshing stories after progress update');
              const refreshQuery = supabase
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
                .eq('family_group_id', capturedFamilyId);

              const { data } = await withTimeout(refreshQuery, 10000);

              // Double-check family hasn't changed during the async operation
              if (currentActiveFamilyId !== capturedFamilyId) {
                console.log('[StoryStore] Skipping state update - family changed during refresh');
                return;
              }

              if (data) {
                const updatedStories = data.map((sf: any) => sf.stories).filter(Boolean);
                console.log('[StoryStore] Background refresh complete, updated', updatedStories.length, 'stories');
                set({ stories: updatedStories });
              }
            } catch (err) {
              if (!isTimeoutError(err)) {
                console.error('[StoryStore] Error refreshing stories after progress update:', err);
              }
            } finally {
              backgroundRefreshInProgress = false;
              backgroundRefreshTimeoutId = null;
            }
          });
        }, 100);
      } else if (backgroundRefreshInProgress) {
        console.log('[StoryStore] Skipping background refresh - already in progress');
      } else if (timeSinceLastRefresh <= MIN_REFRESH_INTERVAL) {
        console.log('[StoryStore] Skipping background refresh - too soon since last refresh');
      }
    } catch (error: any) {
      console.error('[StoryStore] Error in fetchStoriesForFamily:', error);
      set({ loading: false, stories: [] });
      throw error;
    }
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