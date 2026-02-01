import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type AuthResult = {
  success: boolean;
  error?: string;
  isNewUser?: boolean;
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
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (error) {
        console.log('[Auth] Sign up error:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[Auth] Sign up success, user:', data.user?.id);
      return { success: true, isNewUser: true };
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

  const signUp = async (email: string, password: string, name: string) => {
    return signUpMutation.mutateAsync({ email, password, name });
  };

  const signIn = async (email: string, password: string) => {
    return signInMutation.mutateAsync({ email, password });
  };

  const signOut = async () => {
    return signOutMutation.mutateAsync();
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
    getAccessToken,
    isSigningUp: signUpMutation.isPending,
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending,
  };
});
