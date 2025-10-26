import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { MemoryWithDetails, CreateMemoryData, UpdateMemoryData, MemoryFilters, MemoryStats } from '../types/child';
import { optimizeImage } from '../lib/utils';
import { withTimeout, isTimeoutError } from '../lib/queryUtils';

interface ChildMemoryState {
  memories: MemoryWithDetails[];
  loading: boolean;
  stats: MemoryStats;
  filters: MemoryFilters;
  
  // Actions
  fetchMemories: (storyId: string) => Promise<void>;
  createMemory: (storyId: string, memoryData: CreateMemoryData) => Promise<{ success: boolean; error?: string; memoryId?: string }>;
  updateMemory: (memoryData: UpdateMemoryData) => Promise<{ success: boolean; error?: string }>;
  deleteMemory: (memoryId: string) => Promise<{ success: boolean; error?: string }>;
  deleteMemoryImage: (imageId: string) => Promise<{ success: boolean; error?: string }>;
  deleteMemoryRecording: (recordingId: string) => Promise<{ success: boolean; error?: string }>;
  setFilters: (filters: MemoryFilters) => void;
  getFilteredMemories: () => MemoryWithDetails[];
  calculateStats: () => void;
}

export const useChildMemoryStore = create<ChildMemoryState>((set, get) => ({
  memories: [],
  loading: false,
  stats: {
    totalMemories: 0,
    memoriesThisWeek: 0,
    activityStreak: 0,
    totalImages: 0,
    totalRecordings: 0
  },
  filters: {},

  fetchMemories: async (storyId: string) => {
    set({ loading: true });
    try {
      const memoriesQuery = supabase
        .from('memory_entries')
        .select(`
          *,
          memory_images (*),
          memory_tags (*),
          memory_measurements (*),
          recordings (*)
        `)
        .eq('story_id', storyId)
        .order('memory_date', { ascending: false });

      const { data: memories, error: memoriesError } = await withTimeout(
        memoriesQuery,
        15000,
        'Loading memories timed out'
      );

      if (memoriesError) {
        console.error('[ChildMemoryStore] Error fetching memories:', memoriesError);
        throw memoriesError;
      }

      const memoriesWithDetails: MemoryWithDetails[] = (memories || []).map(memory => ({
        ...memory,
        images: memory.memory_images || [],
        tags: memory.memory_tags || [],
        measurements: memory.memory_measurements || [],
        recordings: memory.recordings || []
      }));

      set({ memories: memoriesWithDetails });
      get().calculateStats();
    } catch (error: any) {
      console.error('[ChildMemoryStore] Error in fetchMemories:', error);

      if (isTimeoutError(error)) {
        set({ memories: [] });
        throw new Error('La carga de recuerdos tardó demasiado tiempo. Por favor, inténtalo de nuevo.');
      }

      set({ memories: [] });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createMemory: async (storyId: string, memoryData: CreateMemoryData) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      // Create the memory entry
      const { data: memory, error: memoryError } = await supabase
        .from('memory_entries')
        .insert([{
          story_id: storyId,
          title: memoryData.title.trim(),
          memory_date: memoryData.memory_date,
          notes: memoryData.notes?.trim() || null,
          is_quote: memoryData.is_quote || false,
          quote_text: memoryData.quote_text?.trim() || null,
          place: memoryData.place?.trim() || null,
          developmental_stage: memoryData.developmental_stage || null
        }])
        .select()
        .single();

      if (memoryError) throw memoryError;

      const memoryId = memory.id;

      // Upload images if provided
      if (memoryData.images && memoryData.images.length > 0) {
        for (const imageFile of memoryData.images) {
          try {
            const optimizedImage = await optimizeImage(imageFile);
            const fileName = `${memoryId}/${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            
            const { error: uploadError } = await supabase.storage
              .from('memory-images')
              .upload(fileName, optimizedImage, {
                contentType: 'image/webp',
                upsert: false
              });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('memory-images')
              .getPublicUrl(fileName);

            // Create image record
            await supabase
              .from('memory_images')
              .insert([{
                memory_id: memoryId,
                image_url: publicUrl
              }]);
          } catch (imageError) {
            console.error('Error uploading image:', imageError);
          }
        }
      }

      // Upload audio if provided
      if (memoryData.audioBlob) {
        try {
          const fileName = `${memoryId}/${Date.now()}_recording.webm`;
          
          const { error: uploadError } = await supabase.storage
            .from('memory-recordings')
            .upload(fileName, memoryData.audioBlob, {
              contentType: 'audio/webm',
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('memory-recordings')
            .getPublicUrl(fileName);

          // Create recording record
          const { data: recording } = await supabase
            .from('recordings')
            .insert([{
              memory_id: memoryId,
              question: 'Descripción del recuerdo',
              audio_url: publicUrl,
              audio_duration_ms: (memoryData.audioDuration || 0) * 1000
            }])
            .select()
            .single();

          // Trigger transcription
          if (recording) {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const formData = new FormData();
              formData.append('audio', memoryData.audioBlob, 'recording.webm');

              const transcribeResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session?.access_token}`,
                },
                body: formData
              });

              if (transcribeResponse.ok) {
                const result = await transcribeResponse.json();
                if (result.transcript) {
                  await supabase
                    .from('recordings')
                    .update({ transcript: result.transcript })
                    .eq('id', recording.id);
                }
              }
            } catch (transcribeError) {
              console.error('Error transcribing audio:', transcribeError);
            }
          }
        } catch (audioError) {
          console.error('Error uploading audio:', audioError);
        }
      }

      // Add tags if provided
      if (memoryData.tags && memoryData.tags.length > 0) {
        const tagInserts = memoryData.tags.map(tag => ({
          memory_id: memoryId,
          tag_name: tag.name,
          tag_type: tag.type
        }));

        await supabase
          .from('memory_tags')
          .insert(tagInserts);
      }

      // Add measurements if provided
      if (memoryData.measurements) {
        await supabase
          .from('memory_measurements')
          .insert([{
            memory_id: memoryId,
            height_cm: memoryData.measurements.height_cm || null,
            weight_kg: memoryData.measurements.weight_kg || null,
            measurement_date: memoryData.measurements.measurement_date
          }]);
      }

      // Refresh memories
      await get().fetchMemories(storyId);

      return { success: true, memoryId };
    } catch (error: any) {
      console.error('Error creating memory:', error);
      return { success: false, error: error.message || 'Error al crear el recuerdo' };
    }
  },

  updateMemory: async (memoryData: UpdateMemoryData) => {
    try {
      const { error } = await supabase
        .from('memory_entries')
        .update({
          title: memoryData.title?.trim(),
          memory_date: memoryData.memory_date,
          notes: memoryData.notes?.trim() || null,
          is_quote: memoryData.is_quote,
          quote_text: memoryData.quote_text?.trim() || null,
          place: memoryData.place?.trim() || null,
          developmental_stage: memoryData.developmental_stage || null
        })
        .eq('id', memoryData.id);

      if (error) throw error;

      // Handle new images, tags, measurements similar to createMemory
      // (Implementation would be similar but for updates)

      return { success: true };
    } catch (error: any) {
      console.error('Error updating memory:', error);
      return { success: false, error: error.message };
    }
  },

  deleteMemory: async (memoryId: string) => {
    try {
      const { error } = await supabase
        .from('memory_entries')
        .delete()
        .eq('id', memoryId);

      if (error) throw error;

      // Remove from local state
      set(state => ({
        memories: state.memories.filter(memory => memory.id !== memoryId)
      }));

      get().calculateStats();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting memory:', error);
      return { success: false, error: error.message };
    }
  },

  deleteMemoryImage: async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('memory_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      // Update local state
      set(state => ({
        memories: state.memories.map(memory => ({
          ...memory,
          images: memory.images.filter(img => img.id !== imageId)
        }))
      }));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  deleteMemoryRecording: async (recordingId: string) => {
    try {
      const { error } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId);

      if (error) throw error;

      // Update local state
      set(state => ({
        memories: state.memories.map(memory => ({
          ...memory,
          recordings: memory.recordings.filter(rec => rec.id !== recordingId)
        }))
      }));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  setFilters: (filters: MemoryFilters) => {
    set({ filters });
  },

  getFilteredMemories: () => {
    const { memories, filters } = get();
    let filtered = [...memories];

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(memory =>
        memory.title.toLowerCase().includes(searchLower) ||
        memory.notes?.toLowerCase().includes(searchLower) ||
        memory.tags.some(tag => tag.tag_name.toLowerCase().includes(searchLower))
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(memory =>
        memory.tags.some(tag => filters.tags!.includes(tag.tag_name))
      );
    }

    if (filters.dateRange) {
      filtered = filtered.filter(memory =>
        memory.memory_date >= filters.dateRange!.start &&
        memory.memory_date <= filters.dateRange!.end
      );
    }

    return filtered;
  },

  calculateStats: () => {
    const { memories } = get();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const memoriesThisWeek = memories.filter(memory =>
      new Date(memory.created_at) >= weekAgo
    ).length;

    const totalImages = memories.reduce((sum, memory) => sum + memory.images.length, 0);
    const totalRecordings = memories.reduce((sum, memory) => sum + memory.recordings.length, 0);

    // Calculate activity streak (simplified)
    let activityStreak = 0;
    const sortedDates = [...new Set(memories.map(m => m.memory_date))].sort().reverse();
    
    for (let i = 0; i < sortedDates.length; i++) {
      const date = new Date(sortedDates[i]);
      const expectedDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      if (date.toDateString() === expectedDate.toDateString()) {
        activityStreak++;
      } else {
        break;
      }
    }

    set({
      stats: {
        totalMemories: memories.length,
        memoriesThisWeek,
        activityStreak,
        totalImages,
        totalRecordings
      }
    });
  }
}));