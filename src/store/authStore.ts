import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, skipEmailConfirmation?: boolean) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
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

  signUp: async (email: string, password: string, skipEmailConfirmation: boolean = false) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          // Disable email confirmation for invitation-based signups
          data: {
            skip_confirmation: skipEmailConfirmation
          }
        }
      });

      if (error) {
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

  signInWithGoogle: async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error de conexión con Google' };
    }
  },

  resetPassword: async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error al enviar el correo' };
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

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .maybeSingle();

      set({
        user,
        isAdmin: profile?.is_admin || false,
        loading: false
      });
    } else {
      set({ user: null, isAdmin: false, loading: false });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = {
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at
        };

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .maybeSingle();

        set({
          user,
          isAdmin: profile?.is_admin || false,
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