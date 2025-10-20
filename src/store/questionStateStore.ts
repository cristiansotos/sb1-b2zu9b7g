import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type QuestionState = 'unanswered' | 'skipped' | 'answered';

interface QuestionStateRecord {
  id: string;
  story_id: string;
  question_text: string;
  chapter_id: string;
  state: QuestionState;
  has_content: boolean;
  skipped_at?: string;
  answered_at?: string;
  created_at: string;
  updated_at: string;
}

interface UserPreferences {
  id: string;
  user_id: string;
  show_skip_warning: boolean;
  created_at: string;
  updated_at: string;
}

interface QuestionStateStore {
  questionStates: Map<string, QuestionStateRecord>;
  userPreferences: UserPreferences | null;
  loading: boolean;

  fetchQuestionStates: (storyId: string) => Promise<void>;
  getQuestionState: (storyId: string, chapterId: string, questionText: string) => QuestionState;
  skipQuestion: (storyId: string, chapterId: string, questionText: string) => Promise<{ success: boolean; error?: string }>;
  reactivateQuestion: (storyId: string, chapterId: string, questionText: string) => Promise<{ success: boolean; error?: string }>;
  checkQuestionHasContent: (chapterId: string, questionText: string) => Promise<boolean>;
  findFirstIncompleteQuestion: (storyId: string, chapters: any[]) => Promise<{ chapterId: string; questionIndex: number } | null>;
  markQuestionAsAnswered: (storyId: string, chapterId: string, questionText: string) => Promise<{ success: boolean; error?: string }>;

  fetchUserPreferences: () => Promise<void>;
  updateShowSkipWarning: (show: boolean) => Promise<{ success: boolean; error?: string }>;
}

export const useQuestionStateStore = create<QuestionStateStore>((set, get) => ({
  questionStates: new Map(),
  userPreferences: null,
  loading: false,

  fetchQuestionStates: async (storyId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('question_states')
        .select('*')
        .eq('story_id', storyId);

      if (error) throw error;

      const statesMap = new Map<string, QuestionStateRecord>();
      data?.forEach((state) => {
        const key = `${state.story_id}-${state.chapter_id}-${state.question_text}`;
        statesMap.set(key, state);
      });

      set({ questionStates: statesMap, loading: false });
    } catch (error: any) {
      console.error('Error fetching question states:', error);
      set({ loading: false });
    }
  },

  getQuestionState: (storyId: string, chapterId: string, questionText: string): QuestionState => {
    const key = `${storyId}-${chapterId}-${questionText}`;
    const state = get().questionStates.get(key);
    return state?.state || 'unanswered';
  },

  skipQuestion: async (storyId: string, chapterId: string, questionText: string) => {
    try {
      const key = `${storyId}-${chapterId}-${questionText}`;
      const existingState = get().questionStates.get(key);

      const hasContent = await get().checkQuestionHasContent(chapterId, questionText);

      if (existingState) {
        const { data, error } = await supabase
          .from('question_states')
          .update({
            state: 'skipped',
            skipped_at: new Date().toISOString(),
            has_content: hasContent,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingState.id)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const newMap = new Map(get().questionStates);
          newMap.set(key, data);
          set({ questionStates: newMap });
        }
      } else {
        const { data, error } = await supabase
          .from('question_states')
          .insert({
            story_id: storyId,
            chapter_id: chapterId,
            question_text: questionText,
            state: 'skipped',
            has_content: hasContent,
            skipped_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const newMap = new Map(get().questionStates);
          newMap.set(key, data);
          set({ questionStates: newMap });
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error skipping question:', error);
      return { success: false, error: error.message };
    }
  },

  reactivateQuestion: async (storyId: string, chapterId: string, questionText: string) => {
    try {
      const key = `${storyId}-${chapterId}-${questionText}`;
      const existingState = get().questionStates.get(key);

      if (existingState) {
        const { data, error } = await supabase
          .from('question_states')
          .update({
            state: 'unanswered',
            skipped_at: null,
            answered_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingState.id)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const newMap = new Map(get().questionStates);
          newMap.set(key, data);
          set({ questionStates: newMap });
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error reactivating question:', error);
      return { success: false, error: error.message };
    }
  },

  checkQuestionHasContent: async (chapterId: string, questionText: string): Promise<boolean> => {
    try {
      const { data: recordings } = await supabase
        .from('recordings')
        .select('id')
        .eq('chapter_id', chapterId)
        .eq('question', questionText)
        .limit(1);

      if (recordings && recordings.length > 0) return true;

      const { data: images } = await supabase
        .from('images')
        .select('id')
        .eq('chapter_id', chapterId)
        .eq('question', questionText)
        .limit(1);

      if (images && images.length > 0) return true;

      return false;
    } catch (error) {
      console.error('Error checking question content:', error);
      return false;
    }
  },

  findFirstIncompleteQuestion: async (storyId: string, chapters: any[]) => {
    try {
      await get().fetchQuestionStates(storyId);
      const states = get().questionStates;

      for (const chapter of chapters) {
        const questions = chapter.question_order || [];

        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];
          const key = `${storyId}-${chapter.id}-${question}`;
          const state = states.get(key);

          if (!state || state.state === 'unanswered') {
            return {
              chapterId: chapter.id,
              questionIndex: i
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding first incomplete question:', error);
      return null;
    }
  },

  markQuestionAsAnswered: async (storyId: string, chapterId: string, questionText: string) => {
    try {
      const key = `${storyId}-${chapterId}-${questionText}`;
      const existingState = get().questionStates.get(key);

      if (existingState) {
        const { data, error } = await supabase
          .from('question_states')
          .update({
            state: 'answered',
            answered_at: new Date().toISOString(),
            has_content: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingState.id)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const newMap = new Map(get().questionStates);
          newMap.set(key, data);
          set({ questionStates: newMap });
        }
      } else {
        const { data, error } = await supabase
          .from('question_states')
          .insert({
            story_id: storyId,
            chapter_id: chapterId,
            question_text: questionText,
            state: 'answered',
            has_content: true,
            answered_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const newMap = new Map(get().questionStates);
          newMap.set(key, data);
          set({ questionStates: newMap });
        }
      }

      await supabase.rpc('update_story_progress', {
        story_id_param: storyId
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error marking question as answered:', error);
      return { success: false, error: error.message };
    }
  },

  fetchUserPreferences: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        set({ userPreferences: data });
      } else {
        const { data: newPrefs, error: insertError } = await supabase
          .from('user_preferences')
          .insert({ user_id: user.id, show_skip_warning: true })
          .select()
          .single();

        if (insertError) throw insertError;
        set({ userPreferences: newPrefs });
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  },

  updateShowSkipWarning: async (show: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          show_skip_warning: show,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      await get().fetchUserPreferences();

      return { success: true };
    } catch (error: any) {
      console.error('Error updating show skip warning:', error);
      return { success: false, error: error.message };
    }
  }
}));
