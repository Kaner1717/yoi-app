import { useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/context/OnboardingContext';
import { theme } from '@/constants/theme';

export default function RootIndex() {
  const router = useRouter();
  const { data, isLoading } = useOnboarding();

  const navigate = useCallback(() => {
    if (data.isOnboardingComplete) {
      router.replace('/(tabs)/(home)/home');
    } else {
      router.replace('/onboarding');
    }
  }, [data.isOnboardingComplete, router]);

  useEffect(() => {
    if (!isLoading) {
      navigate();
    }
  }, [isLoading, navigate]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
