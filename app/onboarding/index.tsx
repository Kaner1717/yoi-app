import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Button } from '@/components/ui';
import { useOnboarding } from '@/context/OnboardingContext';
import { useAuth } from '@/context/AuthContext';
import { X } from 'lucide-react-native';

export default function WelcomeScreen() {
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();
  const { signIn, isSigningIn } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }

    const result = await signIn(email, password);
    if (result.success) {
      setShowSignIn(false);
      completeOnboarding();
      router.replace('/(tabs)/(home)/home');
    } else {
      Alert.alert('Sign In Failed', result.error || 'Invalid credentials.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>YOI</Text>
        </View>
        
        <View style={styles.heroContainer}>
          <View style={styles.mockupContainer}>
            <View style={styles.mockup}>
              <View style={styles.mockupInner}>
                <Text style={styles.mockupText}>🥗</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.valueContainer}>
          <Text style={styles.tagline}>Healthy eating{'\n'}made easy</Text>
          <Text style={styles.subtitle}>
            Personalized meal plans and grocery lists designed for students
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Get Started"
          onPress={() => router.push('/onboarding/gender')}
          testID="get-started-button"
        />
        <TouchableOpacity onPress={() => setShowSignIn(true)} testID="sign-in-button">
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInLink}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showSignIn} animationType="slide" transparent onRequestClose={() => setShowSignIn(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSignIn(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Welcome Back</Text>
              <TouchableOpacity onPress={() => setShowSignIn(false)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={theme.colors.text.tertiary}
              secureTextEntry
            />

            <View style={styles.modalFooter}>
              <Button
                title={isSigningIn ? "Signing In..." : "Sign In"}
                onPress={handleSignIn}
                disabled={isSigningIn}
              />
            </View>

            {isSigningIn && (
              <ActivityIndicator style={styles.loader} size="small" color={theme.colors.primary} />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  logoContainer: {
    paddingTop: theme.spacing.xl,
  },
  logo: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    letterSpacing: 2,
  },
  heroContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockupContainer: {
    width: 240,
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockup: {
    width: 200,
    height: 280,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  mockupInner: {
    width: 160,
    height: 200,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockupText: {
    fontSize: 64,
  },
  valueContainer: {
    marginBottom: theme.spacing.xl,
  },
  tagline: {
    fontSize: theme.typography.fontSize.xxxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    lineHeight: 42,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  signInText: {
    textAlign: 'center',
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  signInLink: {
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  inputLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  modalFooter: {
    marginTop: theme.spacing.md,
  },
  loader: {
    marginTop: theme.spacing.md,
  },
});
