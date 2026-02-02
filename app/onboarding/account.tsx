import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/context/OnboardingContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';
import { theme } from '@/constants/theme';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const router = useRouter();
  const { data, completeOnboarding, updateData } = useOnboarding();
  const { signUp, signIn, isSigningUp, isSigningIn } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [isUpsertingProfile, setIsUpsertingProfile] = useState(false);

  const isFormValid = name.trim().length > 0 && email.trim().length > 0 && password.length >= 6;
  const isLoginValid = email.trim().length > 0 && password.length >= 6;
  const isProcessing = isSigningUp || isSigningIn || isUpsertingProfile;

  const waitForSession = async (maxWaitMs: number = 5000): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[Account] Session ready:', session.user.id);
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.error('[Account] Timeout waiting for session');
    return false;
  };

  const upsertProfile = async (uid: string, userName: string, userEmail: string) => {
    console.log('[Account] Upserting profile for user:', uid);
    
    // Ensure session is ready before upserting
    const sessionReady = await waitForSession();
    if (!sessionReady) {
      throw new Error('Session not established - please try again');
    }
    
    const profileData = {
      user_id: uid,
      gender: data.gender,
      height_cm: data.heightCm,
      weight_kg: data.weightKg,
      birthdate: data.birthDate ? new Date(data.birthDate).toISOString().split('T')[0] : null,
      goal: data.goal,
      diet_type: data.dietType,
      allergies: data.allergies,
      cooking_effort: data.cookingEffort,
      weekly_budget: data.weeklyBudget,
      measurement_system: data.measurementUnit,
      user_name: userName,
      user_email: userEmail,
    };

    console.log('[Account] Profile data:', JSON.stringify(profileData, null, 2));

    const { data: upsertedData, error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_id' })
      .select();

    if (error) {
      console.error('[Account] Profile upsert error:', JSON.stringify(error, null, 2));
      console.error('[Account] Error code:', error.code);
      console.error('[Account] Error message:', error.message);
      console.error('[Account] Error details:', error.details);
      throw error;
    }

    console.log('[Account] Profile upserted successfully:', JSON.stringify(upsertedData, null, 2));
  };

  const handleContinue = async () => {
    console.log('[Account] handleContinue called - isSignUp:', isSignUp);
    console.log('[Account] Form values - email:', email.trim(), 'name:', name.trim(), 'passwordLength:', password.length);
    
    try {
      setIsUpsertingProfile(true);
      
      if (isSignUp) {
        console.log('[Account] Starting sign up process...');
        const result = await signUp(email.trim(), password, name.trim());
        console.log('[Account] Sign up result:', JSON.stringify(result));
        
        if (!result.success) {
          console.log('[Account] Sign up failed with error:', result.error);
          Alert.alert('Sign Up Failed', result.error || 'An error occurred');
          return;
        }
        
        updateData({ 
          userName: name.trim(),
          userEmail: email.trim(),
        });

        // Wait a moment for auth state to propagate, then get user
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: { user }, error: getUserError } = await supabase.auth.getUser();
        console.log('[Account] Got user after signup:', user?.id, 'error:', getUserError?.message);
        
        if (user) {
          try {
            await upsertProfile(user.id, name.trim(), email.trim());
          } catch (profileError) {
            console.error('[Account] Profile creation failed:', profileError);
            // Don't block navigation - profile can be created later
            Alert.alert(
              'Profile Save Issue',
              'Account created but profile sync failed. Your preferences will sync on next login.',
              [{ text: 'OK' }]
            );
          }
        } else {
          console.error('[Account] No user after signup - this should not happen');
        }
        
        completeOnboarding();
        router.replace('/(tabs)/(home)/home');
      } else {
        const result = await signIn(email.trim(), password);
        if (!result.success) {
          Alert.alert('Sign In Failed', result.error || 'Invalid credentials');
          return;
        }
        
        // Load existing profile from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('[Account] Loading profile for user:', user.id);
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (profileError) {
            console.log('[Account] No existing profile found:', profileError.message);
          } else if (profile) {
            console.log('[Account] Loaded profile:', JSON.stringify(profile, null, 2));
            // Update local onboarding data with profile from Supabase
            updateData({
              gender: profile.gender,
              heightCm: profile.height_cm,
              weightKg: profile.weight_kg,
              birthDate: profile.birthdate ? new Date(profile.birthdate) : null,
              goal: profile.goal,
              dietType: profile.diet_type,
              allergies: profile.allergies || [],
              cookingEffort: profile.cooking_effort,
              weeklyBudget: profile.weekly_budget || 100,
              measurementUnit: profile.measurement_system || 'imperial',
              userName: profile.user_name,
              userEmail: profile.user_email,
              isOnboardingComplete: true,
            });
          }
        }
        
        completeOnboarding();
        router.replace('/(tabs)/(home)/home');
      }
    } catch (error) {
      console.log('[Account] Auth error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsUpsertingProfile(false);
    }
  };



  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp 
                ? 'Save your plan and access it anywhere' 
                : 'Sign in to access your meal plans'}
            </Text>
          </View>

          <View style={styles.form}>
            {isSignUp && (
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <User size={20} color={theme.colors.text.tertiary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  testID="name-input"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Mail size={20} color={theme.colors.text.tertiary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={theme.colors.text.tertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                testID="email-input"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Lock size={20} color={theme.colors.text.tertiary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={theme.colors.text.tertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                testID="password-input"
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                testID="toggle-password"
              >
                {showPassword ? (
                  <EyeOff size={20} color={theme.colors.text.tertiary} />
                ) : (
                  <Eye size={20} color={theme.colors.text.tertiary} />
                )}
              </TouchableOpacity>
            </View>

            {isSignUp && (
              <Text style={styles.passwordHint}>
                Password must be at least 6 characters
              </Text>
            )}
          </View>

          <TouchableOpacity 
            style={styles.switchMode}
            onPress={() => setIsSignUp(!isSignUp)}
            testID="switch-mode"
          >
            <Text style={styles.switchModeText}>
              {isSignUp 
                ? 'Already have an account? ' 
                : "Don't have an account? "}
              <Text style={styles.switchModeLink}>
                {isSignUp ? 'Sign in' : 'Sign up'}
              </Text>
            </Text>
          </TouchableOpacity>


        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={isProcessing ? (isSignUp ? 'Creating...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
            onPress={handleContinue}
            disabled={(isSignUp ? !isFormValid : !isLoginValid) || isProcessing}
            testID="continue-button"
          />
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  header: {
    marginBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  form: {
    gap: theme.spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    height: 56,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    height: '100%',
  },
  eyeIcon: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  passwordHint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: -theme.spacing.xs,
  },
  switchMode: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  switchModeText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  switchModeLink: {
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.primary,
  },

  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  termsText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: theme.colors.text.secondary,
    textDecorationLine: 'underline',
  },
});
