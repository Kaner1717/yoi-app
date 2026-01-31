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
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession) {
          console.log('[Auth] Existing session found');
          setSession(existingSession);
          setUser(existingSession.user);
          setIsAnonymous(existingSession.user.is_anonymous ?? false);
        } else {
          console.log('[Auth] No session, creating anonymous user...');
          const { data, error } = await supabase.auth.signInAnonymously();
          
          if (error) {
            console.error('[Auth] Anonymous sign in error:', error);
          } else if (data.session) {
            console.log('[Auth] Anonymous session created:', data.user?.id);
            setSession(data.session);
            setUser(data.user);
            setIsAnonymous(true);
          }
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
      setIsAnonymous(session?.user?.is_anonymous ?? false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name: string }): Promise<AuthResult> => {
      console.log('[Auth] Signing up:', email);
      
      if (isAnonymous && user) {
        console.log('[Auth] Converting anonymous user to permanent account...');
        const { error } = await supabase.auth.updateUser({
          email,
          password,
          data: { full_name: name },
        });

        if (error) {
          console.log('[Auth] Conversion error:', error.message);
          return { success: false, error: error.message };
        }

        console.log('[Auth] Anonymous user converted successfully');
        setIsAnonymous(false);
        return { success: true, isNewUser: true };
      }

      const { error } = await supabase.auth.signUp({
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

      console.log('[Auth] Sign up success');
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
      setIsAnonymous(false);
      return { success: true, isNewUser: false };
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      console.log('[Auth] Signing out');
      await supabase.auth.signOut();
      
      console.log('[Auth] Creating new anonymous session...');
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        console.error('[Auth] Failed to create anonymous session after logout:', anonError);
      } else {
        setIsAnonymous(true);
        console.log('[Auth] New anonymous session created');
      }
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
    isAuthenticated: !!session,
    isAnonymous,
    signUp,
    signIn,
    signOut,
    getAccessToken,
    isSigningUp: signUpMutation.isPending,
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending,
  };
});
