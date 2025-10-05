import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Question {
  id: string;
  chapter_template_id: string;
  section_template_id?: string;
  question: string;
  order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Section {
  id: string;
  chapter_template_id: string;
  title: string;
  order: number;
  created_at?: string;
  updated_at?: string;
  questions?: Question[];
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  created_at?: string;
  updated_at?: string;
  sections?: Section[];
  questions?: Question[];
}

interface ChaptersState {
  chapters: Chapter[];
  loading: boolean;
  error: string | null;
  fetchChapters: () => Promise<void>;
  fetchSectionsForChapter: (chapterId: string) => Promise<Section[]>;
  fetchQuestionsForChapter: (chapterId: string) => Promise<Question[]>;
  fetchQuestionsForSection: (sectionId: string) => Promise<Question[]>;
  createChapter: (title: string, order: number) => Promise<void>;
  updateChapter: (id: string, title: string, order: number) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;
  reorderChapters: (chapters: Chapter[]) => Promise<void>;
  createSection: (chapterId: string, title: string, order: number) => Promise<void>;
  updateSection: (id: string, title: string, order: number) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  reorderSections: (chapterId: string, sections: Section[]) => Promise<void>;
  createQuestion: (chapterId: string, question: string, order: number, sectionId?: string) => Promise<void>;
  updateQuestion: (id: string, question: string, order: number, sectionId?: string) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  reorderQuestions: (questions: Question[]) => Promise<void>;
}

export const useChaptersStore = create<ChaptersState>((set, get) => ({
  chapters: [],
  loading: false,
  error: null,

  fetchChapters: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('chapter_templates')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;

      set({ chapters: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchSectionsForChapter: async (chapterId: string) => {
    const { data, error } = await supabase
      .from('section_templates')
      .select('*')
      .eq('chapter_template_id', chapterId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  fetchQuestionsForChapter: async (chapterId: string) => {
    const { data, error } = await supabase
      .from('question_templates')
      .select('*')
      .eq('chapter_template_id', chapterId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  fetchQuestionsForSection: async (sectionId: string) => {
    const { data, error } = await supabase
      .from('question_templates')
      .select('*')
      .eq('section_template_id', sectionId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  createChapter: async (title: string, order: number) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('chapter_templates')
        .insert({ title, order });

      if (error) throw error;

      await get().fetchChapters();
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateChapter: async (id: string, title: string, order: number) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('chapter_templates')
        .update({ title, order })
        .eq('id', id);

      if (error) throw error;

      await get().fetchChapters();
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteChapter: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('chapter_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await get().fetchChapters();
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  reorderChapters: async (chapters: Chapter[]) => {
    try {
      const updates = chapters.map((chapter, index) => ({
        id: chapter.id,
        order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('chapter_templates')
          .update({ order: update.order })
          .eq('id', update.id);

        if (error) throw error;
      }

      await get().fetchChapters();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  createSection: async (chapterId: string, title: string, order: number) => {
    try {
      const { error } = await supabase
        .from('section_templates')
        .insert({
          chapter_template_id: chapterId,
          title,
          order,
        });

      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  },

  updateSection: async (id: string, title: string, order: number) => {
    try {
      const { error } = await supabase
        .from('section_templates')
        .update({ title, order })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  },

  deleteSection: async (id: string) => {
    try {
      const { error } = await supabase
        .from('section_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  },

  reorderSections: async (chapterId: string, sections: Section[]) => {
    try {
      const updates = sections.map((section, index) => ({
        id: section.id,
        order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('section_templates')
          .update({ order: update.order })
          .eq('id', update.id);

        if (error) throw error;
      }
    } catch (error: any) {
      throw error;
    }
  },

  createQuestion: async (chapterId: string, question: string, order: number, sectionId?: string) => {
    try {
      const { error } = await supabase
        .from('question_templates')
        .insert({
          chapter_template_id: chapterId,
          section_template_id: sectionId || null,
          question,
          order,
        });

      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  },

  updateQuestion: async (id: string, question: string, order: number, sectionId?: string) => {
    try {
      const { error } = await supabase
        .from('question_templates')
        .update({
          question,
          order,
          section_template_id: sectionId || null,
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  },

  deleteQuestion: async (id: string) => {
    try {
      const { error } = await supabase
        .from('question_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  },

  reorderQuestions: async (questions: Question[]) => {
    try {
      const updates = questions.map((question, index) => ({
        id: question.id,
        order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('question_templates')
          .update({ order: update.order })
          .eq('id', update.id);

        if (error) throw error;
      }
    } catch (error: any) {
      throw error;
    }
  },
}));
