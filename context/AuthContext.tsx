import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type AuthResult = {
  success: boolean;
  error?: string;
  isNewUser?: boolean;
  userId?: string;
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession) {
          console.log('[Auth] Existing session found for user:', existingSession.user.id);
          setSession(existingSession);
          setUser(existingSession.user);
        } else {
          console.log('[Auth] No session found - user needs to sign up or sign in');
        }
      } catch (error) {
        console.error('[Auth] Init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[Auth] Auth state changed:', _event);
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name: string }): Promise<AuthResult> => {
      console.log('[Auth] Signing up:', email);
      
      try {
        console.log('[Auth] Attempting sign up with email:', email);
        console.log('[Auth] Supabase client URL check...');
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        });

        if (error) {
          console.log('[Auth] Sign up error code:', error.status);
          console.log('[Auth] Sign up error name:', error.name);
          console.log('[Auth] Sign up error message:', error.message);
          return { success: false, error: error.message };
        }

        console.log('[Auth] Sign up success, user:', data.user?.id);
        console.log('[Auth] Session:', data.session ? 'Created' : 'Not created (email confirmation needed)');
        
        // If session was created, update state immediately
        if (data.session) {
          setSession(data.session);
          setUser(data.user);
        }
        
        return { success: true, isNewUser: true, userId: data.user?.id };
      } catch (err: any) {
        console.error('[Auth] Sign up caught exception:', err);
        console.error('[Auth] Exception type:', typeof err);
        console.error('[Auth] Exception name:', err?.name);
        console.error('[Auth] Exception message:', err?.message);
        console.error('[Auth] Exception stack:', err?.stack);
        
        const message = err instanceof Error ? err.message : 'Network error';
        return { success: false, error: `Connection failed: ${message}` };
      }
    },
  });

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }): Promise<AuthResult> => {
      console.log('[Auth] Signing in:', email);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('[Auth] Sign in error:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[Auth] Sign in success');
      return { success: true, isNewUser: false };
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      console.log('[Auth] Signing out');
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      console.log('[Auth] Signed out successfully');
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!user) {
        throw new Error('No user logged in');
      }
      
      console.log('[Auth] Deleting account for user:', user.id);
      
      // Delete all user data (cascade will handle related tables)
      // Order matters due to foreign key constraints
      
      // Delete plans (this will cascade to plan_meals, meal_ingredients, grocery_items)
      const { error: plansError } = await supabase
        .from('plans')
        .delete()
        .eq('user_id', user.id);
      
      if (plansError) {
        console.log('[Auth] Error deleting plans:', plansError.message);
      } else {
        console.log('[Auth] Deleted user plans');
      }
      
      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);
      
      if (profileError) {
        console.log('[Auth] Error deleting profile:', profileError.message);
      } else {
        console.log('[Auth] Deleted user profile');
      }
      
      // Sign out after deleting data
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      console.log('[Auth] Account deleted and signed out');
    },
  });

  const signUp = async (email: string, password: string, name: string) => {
    return signUpMutation.mutateAsync({ email, password, name });
  };

  const signIn = async (email: string, password: string) => {
    return signInMutation.mutateAsync({ email, password });
  };

  const signOut = async () => {
    return signOutMutation.mutateAsync();
  };

  const deleteAccount = async () => {
    return deleteAccountMutation.mutateAsync();
  };

  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  return {
    session,
    user,
    userId: user?.id ?? null,
    isLoading,
    isAuthenticated: !!session && !!user,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    getAccessToken,
    isSigningUp: signUpMutation.isPending,
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    isDeletingAccount: deleteAccountMutation.isPending,
  };
});
