import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  updateUserBookInterest: (interested: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  isAdmin: false,

  signIn: async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  },

  signUp: async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined
        }
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('User already registered')) {
          return { success: false, error: 'Este email ya está registrado. Intenta iniciar sesión.' };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  initialize: async () => {
    set({ loading: true });
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const user = {
        id: session.user.id,
        email: session.user.email!,
        created_at: session.user.created_at
      };
      
      set({ 
        user, 
        isAdmin: session.user.email === 'cristian.sotos.v@gmail.com',
        loading: false 
      });
    } else {
      set({ user: null, isAdmin: false, loading: false });
    }

    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const user = {
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at
        };
        
        set({ 
          user, 
          isAdmin: session.user.email === 'cristian.sotos.v@gmail.com',
          loading: false 
        });
      } else {
        set({ user: null, isAdmin: false, loading: false });
      }
    });
  },

  updateUserBookInterest: async (interested: boolean) => {
    const { user } = get();
    if (!user) return;

    try {
      await supabase
        .from('user_metrics')
        .upsert({
          user_id: user.id,
          email: user.email,
          expressed_book_interest: interested
        });
    } catch (error) {
      console.error('Error updating book interest:', error);
    }
  }
}));