import React, { useState, useRef } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/context/OnboardingContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';
import { theme } from '@/constants/theme';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { trpc } from '@/lib/trpc';

type Step = 'credentials' | 'verification';

export default function AccountScreen() {
  const router = useRouter();
  const { data, completeOnboarding, updateData } = useOnboarding();
  const { signUp, signIn, verifyOtp, resendOtp, isSigningUp, isSigningIn, isVerifyingOtp, isResendingOtp } = useAuth();
  
  const [step, setStep] = useState<Step>('credentials');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [isUpsertingProfile, setIsUpsertingProfile] = useState(false);
  
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '', '', '']);
  const otpInputRefs = useRef<(TextInput | null)[]>([]);

  const isFormValid = name.trim().length > 0 && email.trim().length > 0 && password.length >= 6;
  const isLoginValid = email.trim().length > 0 && password.length >= 6;
  const isOtpValid = otpCode.every(digit => digit.length === 1);
  const isProcessing = isSigningUp || isSigningIn || isUpsertingProfile || isVerifyingOtp;

  const profileUpsertMutation = trpc.profile.upsert.useMutation();

  const upsertProfileDirect = async (uid: string, userName: string, userEmail: string) => {
    console.log('[Account] Upserting profile via tRPC for user:', uid);
    
    const profileData = {
      userId: uid,
      gender: data.gender,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      birthDate: data.birthDate ? new Date(data.birthDate).toISOString().split('T')[0] : null,
      goal: data.goal,
      dietType: data.dietType,
      allergies: data.allergies || [],
      cookingEffort: data.cookingEffort,
      weeklyBudget: data.weeklyBudget || 100,
      measurementUnit: data.measurementUnit || 'imperial',
      userName: userName,
      userEmail: userEmail,
    };

    console.log('[Account] Profile data to save:', JSON.stringify(profileData, null, 2));
    const result = await profileUpsertMutation.mutateAsync(profileData);
    console.log('[Account] Profile saved successfully');
    return result;
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      const digits = value.split('').slice(0, 8);
      const newOtp = [...otpCode];
      digits.forEach((digit, i) => {
        if (index + i < 8) {
          newOtp[index + i] = digit;
        }
      });
      setOtpCode(newOtp);
      const nextIndex = Math.min(index + digits.length, 7);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    if (value && index < 7) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSignUp = async () => {
    console.log('[Account] Starting sign up...');
    
    try {
      const result = await signUp(email.trim(), password, name.trim());
      console.log('[Account] Sign up result:', JSON.stringify(result));
      
      if (!result.success) {
        Alert.alert('Sign Up Failed', result.error || 'An error occurred');
        return;
      }

      if (result.needsVerification) {
        console.log('[Account] OTP verification needed, showing verification screen');
        setStep('verification');
        Alert.alert(
          'Check Your Email',
          `We sent an 8-digit verification code to ${email.trim()}`,
          [{ text: 'OK' }]
        );
      } else {
        await completeSignUp(result.userId!);
      }
    } catch (error) {
      console.error('[Account] Sign up error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.join('');
    console.log('[Account] Verifying OTP...');
    
    try {
      setIsUpsertingProfile(true);
      const result = await verifyOtp(email.trim(), code);
      
      if (!result.success) {
        Alert.alert('Verification Failed', result.error || 'Invalid code. Please try again.');
        return;
      }

      console.log('[Account] OTP verified, userId:', result.userId);
      await completeSignUp(result.userId!);
    } catch (error) {
      console.error('[Account] OTP verification error:', error);
      Alert.alert('Error', 'Verification failed. Please try again.');
    } finally {
      setIsUpsertingProfile(false);
    }
  };

  const completeSignUp = async (userId: string) => {
    console.log('[Account] Completing sign up for user:', userId);
    
    updateData({ 
      userName: name.trim(),
      userEmail: email.trim(),
    });

    try {
      await upsertProfileDirect(userId, name.trim(), email.trim());
    } catch (profileError) {
      console.error('[Account] Profile creation failed:', profileError);
      Alert.alert(
        'Profile Save Issue',
        'Account created but profile sync failed. Your preferences will sync on next login.',
        [{ text: 'OK' }]
      );
    }
    
    completeOnboarding();
    router.replace('/(tabs)/(home)/home');
  };

  const handleResendOtp = async () => {
    console.log('[Account] Resending OTP...');
    
    try {
      const result = await resendOtp(email.trim());
      
      if (!result.success) {
        Alert.alert('Resend Failed', result.error || 'Could not resend code. Please try again.');
        return;
      }

      Alert.alert('Code Sent', `A new verification code has been sent to ${email.trim()}`);
    } catch (error) {
      console.error('[Account] Resend OTP error:', error);
      Alert.alert('Error', 'Could not resend code. Please try again.');
    }
  };

  const handleSignIn = async () => {
    try {
      setIsUpsertingProfile(true);
      const result = await signIn(email.trim(), password);
      
      if (!result.success) {
        Alert.alert('Sign In Failed', result.error || 'Invalid credentials');
        return;
      }
      
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
          console.log('[Account] Loaded profile');
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
    } catch (error) {
      console.error('[Account] Sign in error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsUpsertingProfile(false);
    }
  };

  const handleContinue = async () => {
    if (isSignUp) {
      await handleSignUp();
    } else {
      await handleSignIn();
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setOtpCode(['', '', '', '', '', '', '', '']);
  };

  if (step === 'verification') {
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
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToCredentials}
              testID="back-button"
            >
              <ArrowLeft size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>Verify your email</Text>
              <Text style={styles.subtitle}>
                Enter the 8-digit code we sent to{'\n'}
                <Text style={styles.emailText}>{email.trim()}</Text>
              </Text>
            </View>

            <View style={styles.otpContainer}>
              {otpCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { otpInputRefs.current[index] = ref; }}
                  style={[
                    styles.otpInput,
                    digit ? styles.otpInputFilled : null,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={8}
                  selectTextOnFocus
                  testID={`otp-input-${index}`}
                />
              ))}
            </View>

            <TouchableOpacity 
              style={styles.resendButton}
              onPress={handleResendOtp}
              disabled={isResendingOtp}
              testID="resend-button"
            >
              <Text style={styles.resendText}>
                {isResendingOtp ? 'Sending...' : "Didn't receive code? Resend"}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={isVerifyingOtp || isUpsertingProfile ? 'Verifying...' : 'Verify & Continue'}
              onPress={handleVerifyOtp}
              disabled={!isOtpValid || isProcessing}
              testID="verify-button"
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
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
  emailText: {
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.primary,
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: theme.spacing.xl,
  },
  otpInput: {
    width: 40,
    height: 50,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    fontSize: 20,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    color: theme.colors.text.primary,
  },
  otpInputFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  resendText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
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
