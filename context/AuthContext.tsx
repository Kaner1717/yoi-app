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
  needsVerification?: boolean;
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
      console.log('[Auth] Signing up with OTP:', email);
      
      try {
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
        console.log('[Auth] Session:', data.session ? 'Created' : 'Needs OTP verification');
        
        if (data.session) {
          setSession(data.session);
          setUser(data.user);
          return { success: true, isNewUser: true, userId: data.user?.id };
        }
        
        return { success: true, isNewUser: true, userId: data.user?.id, needsVerification: true };
      } catch (err: any) {
        console.error('[Auth] Sign up exception:', err);
        const message = err instanceof Error ? err.message : 'Network error';
        return { success: false, error: `Connection failed: ${message}` };
      }
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, token }: { email: string; token: string }): Promise<AuthResult> => {
      console.log('[Auth] Verifying OTP for:', email);
      
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'signup',
        });

        if (error) {
          console.log('[Auth] OTP verification error:', error.message);
          return { success: false, error: error.message };
        }

        console.log('[Auth] OTP verified, user:', data.user?.id);
        
        if (data.session) {
          setSession(data.session);
          setUser(data.user);
        }
        
        return { success: true, isNewUser: true, userId: data.user?.id };
      } catch (err: any) {
        console.error('[Auth] OTP verification exception:', err);
        const message = err instanceof Error ? err.message : 'Network error';
        return { success: false, error: `Verification failed: ${message}` };
      }
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: async ({ email }: { email: string }): Promise<AuthResult> => {
      console.log('[Auth] Resending OTP to:', email);
      
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
        });

        if (error) {
          console.log('[Auth] Resend OTP error:', error.message);
          return { success: false, error: error.message };
        }

        console.log('[Auth] OTP resent successfully');
        return { success: true };
      } catch (err: any) {
        console.error('[Auth] Resend OTP exception:', err);
        const message = err instanceof Error ? err.message : 'Network error';
        return { success: false, error: `Resend failed: ${message}` };
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

  const verifyOtp = async (email: string, token: string) => {
    return verifyOtpMutation.mutateAsync({ email, token });
  };

  const resendOtp = async (email: string) => {
    return resendOtpMutation.mutateAsync({ email });
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
    verifyOtp,
    resendOtp,
    getAccessToken,
    isSigningUp: signUpMutation.isPending,
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    isDeletingAccount: deleteAccountMutation.isPending,
    isVerifyingOtp: verifyOtpMutation.isPending,
    isResendingOtp: resendOtpMutation.isPending,
  };
});
