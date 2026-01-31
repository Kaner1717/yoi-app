import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingLayout, SliderControl } from '@/components/ui';
import { useOnboarding } from '@/context/OnboardingContext';
import { theme } from '@/constants/theme';

export default function BudgetScreen() {
  const router = useRouter();
  const { data, setWeeklyBudget } = useOnboarding();

  const getBudgetMessage = (budget: number) => {
    if (budget <= 30) return "Budget-conscious choice!";
    if (budget <= 50) return "Great for balanced eating";
    if (budget <= 75) return "Room for variety";
    return "Premium ingredients unlocked";
  };

  return (
    <OnboardingLayout
      title="Weekly grocery budget?"
      subtitle="We'll optimize your meal plan to fit your budget."
      progress={0.85}
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/generate')}
    >
      <View style={styles.container}>
        <View style={styles.sliderContainer}>
          <SliderControl
            min={20}
            max={100}
            value={data.weeklyBudget}
            step={5}
            onValueChange={setWeeklyBudget}
            formatValue={(v) => `$${v}`}
          />
        </View>
        
        <View style={styles.messageContainer}>
          <Text style={styles.message}>{getBudgetMessage(data.weeklyBudget)}</Text>
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  sliderContainer: {
    paddingHorizontal: theme.spacing.md,
  },
  messageContainer: {
    marginTop: theme.spacing.xxxl,
    alignItems: 'center',
  },
  message: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});
