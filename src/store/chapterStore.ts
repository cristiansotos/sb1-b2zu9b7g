import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Chapter, Recording, TranscriptFormatted } from '../types';
import { optimizeImage, filterTranscript } from '../lib/utils';
import { formatTranscript } from '../lib/paragraphUtils';
import { calculateConfidenceScore, detectValidationIssues } from '../lib/audioValidation';
import { requestDeduplicator } from '../lib/requestCache';

interface ChapterState {
  chapters: Chapter[];
  recordings: Recording[];
  loading: boolean;
  selectedChapterId: string | null;
  fetchChapters: (storyId: string) => Promise<void>;
  fetchRecordings: (chapterId: string) => Promise<void>;
  fetchAllRecordingsForStory: (storyId: string) => Promise<void>;
  createRecording: (data: {
    chapterId: string;
    question: string;
    audioBlob: Blob;
    durationMs: number;
    silenceRatio?: number;
    averageEnergy?: number;
    qualityWarnings?: string[];
  }) => Promise<{ success: boolean; error?: string }>;
  deleteRecording: (recordingId: string) => Promise<{ success: boolean; error?: string }>;
  transcribeRecording: (recordingId: string) => Promise<{ success: boolean; error?: string }>;
  updateRecordingTranscript: (recordingId: string, formatted: TranscriptFormatted) => Promise<{ success: boolean; error?: string }>;
  deleteRecordingTranscript: (recordingId: string) => Promise<{ success: boolean; error?: string }>;
  uploadQuestionImage: (data: {
    chapterId: string;
    question: string;
    imageFile: File;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteQuestionImage: (imageId: string) => Promise<{ success: boolean; error?: string }>;
  addCustomQuestion: (chapterId: string, question: string) => Promise<{ success: boolean; error?: string }>;
  removeCustomQuestion: (chapterId: string, question: string) => Promise<{ success: boolean; error?: string }>;
  reorderQuestions: (chapterId: string, questionOrder: string[]) => Promise<{ success: boolean; error?: string }>;
  updateStoryProgress: (storyId: string) => Promise<void>;
  setSelectedChapter: (chapterId: string | null) => void;
}

export const useChapterStore = create<ChapterState>((set, get) => ({
  chapters: [],
  recordings: [],
  loading: false,
  selectedChapterId: null,

  fetchChapters: async (storyId: string) => {
    set({ loading: true });
    try {
      const { data: chapters, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('story_id', storyId)
        .order('order', { ascending: true });

      if (error) throw error;

      // If no chapters exist, create default ones from templates
      if (!chapters || chapters.length === 0) {
        // Fetch chapter templates
        const { data: chapterTemplates, error: templatesError } = await supabase
          .from('chapter_templates')
          .select(`
            id,
            title,
            order,
            question_templates (
              question,
              order
            )
          `)
          .order('order', { ascending: true });

        if (templatesError) throw templatesError;

        if (chapterTemplates && chapterTemplates.length > 0) {
          // Create chapters from templates
          const defaultChapters = chapterTemplates.map(template => ({
            story_id: storyId,
            title: template.title,
            order: template.order,
            custom_questions: [],
            question_order: (template.question_templates || [])
              .sort((a: any, b: any) => a.order - b.order)
              .map((q: any) => q.question)
          }));

          const { data: createdChapters, error: createError } = await supabase
            .from('chapters')
            .insert(defaultChapters)
            .select();

          if (createError) throw createError;
          set({ chapters: createdChapters || [] });
        } else {
          set({ chapters: [] });
        }
      } else {
        // Remove any duplicate chapters that might exist
        const uniqueChapters = chapters.filter((chapter, index, self) =>
          index === self.findIndex(c => c.title === chapter.title && c.order === chapter.order)
        );
        set({ chapters: uniqueChapters });
      }

      // Update story progress
      await get().updateStoryProgress(storyId);
    } catch (error: any) {
      console.error('Error fetching chapters:', error);
      
      // Check if it's a network/connection error
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network connection error. Please check:');
        console.error('1. Your internet connection');
        console.error('2. Supabase environment variables in .env file');
        console.error('3. Supabase project status');
      }
    } finally {
      set({ loading: false });
    }
  },

  fetchRecordings: async (chapterId: string) => {
    try {
      const { data: recordings, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: true});

      if (error) throw error;
      set({ recordings: recordings || [] });
    } catch (error: any) {
      console.error('Error fetching recordings:', error);
    }
  },

  fetchAllRecordingsForStory: async (storyId: string) => {
    try {
      const { data: recordings, error } = await supabase
        .from('recordings')
        .select(`
          *,
          chapters!inner(story_id)
        `)
        .eq('chapters.story_id', storyId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ recordings: recordings || [] });
    } catch (error: any) {
      console.error('Error fetching all recordings:', error);
    }
  },

  createRecording: async (data) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      // Upload audio file
      const fileName = `${user.id}/${data.chapterId}/${Date.now()}_recording.webm`;
      const { error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(fileName, data.audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('recordings')
        .getPublicUrl(fileName);

      // Create recording record with quality metrics
      const { data: recording, error } = await supabase
        .from('recordings')
        .insert([{
          chapter_id: data.chapterId,
          question: data.question,
          audio_url: publicUrl,
          audio_duration_ms: data.durationMs,
          silence_ratio: data.silenceRatio,
          audio_energy_average: data.averageEnergy,
          quality_warnings: data.qualityWarnings || [],
          has_speech_detected: true
        }])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set(state => ({
        recordings: [...state.recordings, recording]
      }));

      // Update story progress after creating recording
      const chapter = get().chapters.find(c => c.id === data.chapterId);
      if (chapter) {
        await get().updateStoryProgress(chapter.story_id);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error creating recording:', error);
      return { success: false, error: error.message };
    }
  },

  deleteRecording: async (recordingId) => {
    try {
      // First, get the recording to clean up storage if needed
      const recordingToDelete = get().recordings.find(r => r.id === recordingId);

      const { error } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId);

      if (error) throw error;

      // Update local state immediately
      set(state => ({
        recordings: state.recordings.filter(r => r.id !== recordingId)
      }));

      // Update story progress after deleting recording
      if (recordingToDelete?.chapter_id) {
        const chapter = get().chapters.find(c => c.id === recordingToDelete.chapter_id);
        if (chapter) {
          await get().updateStoryProgress(chapter.story_id);
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Delete recording error:', error);
      return { success: false, error: error.message };
    }
  },

  transcribeRecording: async (recordingId) => {
    try {
      const recording = get().recordings.find(r => r.id === recordingId);

      // Validation checks
      if (!recording) {
        return { success: false, error: 'Grabación no encontrada' };
      }

      if (!recording.audio_url) {
        return { success: false, error: 'URL de audio no disponible' };
      }

      // Check if already transcribing (prevent duplicate requests)
      if (recording.transcribing) {
        return { success: false, error: 'Transcripción ya en progreso' };
      }

      // Check if already has transcript
      if (recording.transcript) {
        return { success: false, error: 'Esta grabación ya tiene una transcripción. Elimínala primero si deseas volver a transcribir.' };
      }

      // Update local state to show loading
      set(state => ({
        recordings: state.recordings.map(r =>
          r.id === recordingId ? { ...r, transcribing: true } : r
        )
      }));

      // Fetch audio file
      const response = await fetch(recording.audio_url);
      const audioBlob = await response.blob();

      // Create FormData for transcription
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // Call transcription edge function
      const { data: { session } } = await supabase.auth.getSession();
      const transcribeResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: formData
      });

      if (!transcribeResponse.ok) {
        const errorText = await transcribeResponse.text();
        // Reset loading state
        set(state => ({
          recordings: state.recordings.map(r =>
            r.id === recordingId ? { ...r, transcribing: false } : r
          )
        }));
        throw new Error(`Error en la transcripción: ${transcribeResponse.status} - ${errorText}`);
      }

      const result = await transcribeResponse.json();

      const originalTranscript = result.transcript;
      const detectedLanguage = result.language || 'unknown';
      const transcriptionModel = result.model || 'whisper-1';

      // Apply hallucination filtering (in memory only)
      const filteredTranscript = filterTranscript(originalTranscript);

      // Apply automatic paragraph breaking to filtered transcript
      const { plain: formattedPlain, html: formattedHtml } = formatTranscript(filteredTranscript);

      // Calculate confidence score
      const durationMs = recording.audio_duration_ms || 0;
      const confidenceScore = calculateConfidenceScore(filteredTranscript, durationMs);

      // Detect validation issues
      const silenceRatio = recording.silence_ratio || 0;
      const validationFlags = detectValidationIssues(filteredTranscript, durationMs, silenceRatio);

      // Prepare transcript_formatted object
      const transcriptFormatted: TranscriptFormatted = {
        html: formattedHtml,
        plain: formattedPlain,
        version: 1
      };

      // Increment transcription attempts
      const currentAttempts = recording.transcription_attempts || 0;

      // Use the dedicated RPC function to bypass RLS and avoid timeout
      const { data: updateResult, error } = await supabase.rpc('update_recording_transcription', {
        p_recording_id: recordingId,
        p_transcript: formattedPlain,
        p_original_transcript: originalTranscript,
        p_transcript_formatted: transcriptFormatted,
        p_detected_language: detectedLanguage,
        p_transcription_model: transcriptionModel,
        p_confidence_score: confidenceScore,
        p_validation_flags: validationFlags,
        p_transcription_attempts: currentAttempts + 1
      });

      if (error || (updateResult && !updateResult.success)) {
        const errorMessage = error?.message || updateResult?.error || 'Unknown error';

        // Save error to database
        const currentAttempts = recording.transcription_attempts || 0;
        await supabase
          .from('recordings')
          .update({
            last_transcription_error: errorMessage,
            transcription_attempts: currentAttempts + 1
          })
          .eq('id', recordingId);

        // Reset loading state
        set(state => ({
          recordings: state.recordings.map(r =>
            r.id === recordingId ? { ...r, transcribing: false } : r
          )
        }));
        throw new Error(errorMessage);
      }

      // Update local state
      set(state => ({
        recordings: state.recordings.map(r =>
          r.id === recordingId ? {
            ...r,
            transcript: formattedPlain,
            original_transcript: originalTranscript,
            transcript_formatted: transcriptFormatted,
            detected_language: detectedLanguage,
            transcription_model: transcriptionModel,
            confidence_score: confidenceScore,
            validation_flags: validationFlags,
            transcription_attempts: currentAttempts + 1,
            transcribing: false
          } : r
        )
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error transcribing recording:', error);

      // Save error to database
      const recording = get().recordings.find(r => r.id === recordingId);
      if (recording) {
        const currentAttempts = recording.transcription_attempts || 0;
        await supabase
          .from('recordings')
          .update({
            last_transcription_error: error.message,
            transcription_attempts: currentAttempts + 1
          })
          .eq('id', recordingId);
      }

      // Reset loading state on error
      set(state => ({
        recordings: state.recordings.map(r =>
          r.id === recordingId ? { ...r, transcribing: false } : r
        )
      }));
      return { success: false, error: error.message };
    }
  },

  updateRecordingTranscript: async (recordingId, formatted) => {
    try {
      // Update recording with formatted transcript
      const { error } = await supabase
        .from('recordings')
        .update({
          transcript: formatted.plain,
          transcript_formatted: formatted
        })
        .eq('id', recordingId);

      if (error) throw error;

      // Update local state
      set(state => ({
        recordings: state.recordings.map(r =>
          r.id === recordingId
            ? { ...r, transcript: formatted.plain, transcript_formatted: formatted }
            : r
        )
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error updating transcript:', error);
      return { success: false, error: error.message };
    }
  },

  deleteRecordingTranscript: async (recordingId) => {
    try {
      // Remove transcript from recording
      const { error } = await supabase
        .from('recordings')
        .update({
          transcript: null,
          transcript_formatted: null
        })
        .eq('id', recordingId);

      if (error) throw error;

      // Update local state
      set(state => ({
        recordings: state.recordings.map(r =>
          r.id === recordingId
            ? { ...r, transcript: undefined, transcript_formatted: undefined }
            : r
        )
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting transcript:', error);
      return { success: false, error: error.message };
    }
  },

  uploadQuestionImage: async (data) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      // Optimize image
      const optimizedImage = await optimizeImage(data.imageFile);
      const fileName = `${user.id}/${data.chapterId}/${Date.now()}_${data.imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, optimizedImage, {
          contentType: 'image/webp',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      // Create image record
      const { error } = await supabase
        .from('images')
        .insert([{
          chapter_id: data.chapterId,
          question: data.question,
          image_url: publicUrl
        }]);

      if (error) throw error;

      // Update story progress after uploading image
      const chapter = get().chapters.find(c => c.id === data.chapterId);
      if (chapter) {
        await get().updateStoryProgress(chapter.story_id);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error uploading image:', error);
      return { success: false, error: error.message };
    }
  },

  deleteQuestionImage: async (imageId) => {
    try {
      // Get image info before deleting to find the chapter
      const { data: imageToDelete } = await supabase
        .from('images')
        .select('chapter_id')
        .eq('id', imageId)
        .single();

      const { error } = await supabase
        .from('images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      // Update story progress after deleting image
      if (imageToDelete?.chapter_id) {
        const chapter = get().chapters.find(c => c.id === imageToDelete.chapter_id);
        if (chapter) {
          await get().updateStoryProgress(chapter.story_id);
        }
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  addCustomQuestion: async (chapterId, question) => {
    try {
      const { error } = await supabase.rpc('add_custom_question', {
        chapter_id_param: chapterId,
        question_text: question
      });

      if (error) throw error;

      // Refresh chapters
      const chapter = get().chapters.find(c => c.id === chapterId);
      if (chapter) {
        const storyId = chapter.story_id;
        await get().fetchChapters(storyId);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  removeCustomQuestion: async (chapterId, question) => {
    try {
      const { error } = await supabase.rpc('remove_custom_question', {
        chapter_id_param: chapterId,
        question_text: question
      });

      if (error) throw error;

      // Refresh chapters
      const chapter = get().chapters.find(c => c.id === chapterId);
      if (chapter) {
        const storyId = chapter.story_id;
        await get().fetchChapters(storyId);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  reorderQuestions: async (chapterId, questionOrder) => {
    try {
      const { error } = await supabase.rpc('reorder_questions', {
        p_chapter_id: chapterId,
        p_question_order: questionOrder
      });

      if (error) throw error;

      // Update local state
      set(state => ({
        chapters: state.chapters.map(c =>
          c.id === chapterId ? { ...c, question_order: questionOrder } : c
        )
      }));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  updateStoryProgress: async (storyId: string) => {
    return requestDeduplicator.debounce(`updateStoryProgress:${storyId}`, async () => {
      try {
        const { error } = await supabase.rpc('update_story_progress', {
          story_id_param: storyId
        });

        if (error) {
          console.error('Error updating story progress:', error);
          return;
        }
      } catch (error) {
        console.error('Error updating story progress:', error);
      }
    }, 500);
  },

  setSelectedChapter: (chapterId) => {
    set({ selectedChapterId: chapterId });
  }
}));