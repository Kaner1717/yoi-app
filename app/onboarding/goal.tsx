import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingLayout, SelectionCard } from '@/components/ui';
import { useOnboarding } from '@/context/OnboardingContext';
import { Goal } from '@/types/onboarding';

const goalOptions: { value: Goal; label: string; subtitle: string }[] = [
  { value: 'lose', label: 'Lose weight', subtitle: 'Reduce body fat and get leaner' },
  { value: 'maintain', label: 'Maintain', subtitle: 'Keep your current weight stable' },
  { value: 'gain', label: 'Gain weight', subtitle: 'Build muscle and increase mass' },
];

export default function GoalScreen() {
  const router = useRouter();
  const { data, setGoal } = useOnboarding();

  return (
    <OnboardingLayout
      title="What is your goal?"
      subtitle="This helps us generate a plan for your calorie intake."
      progress={0.4}
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/diet')}
      canContinue={data.goal !== null}
    >
      <View style={styles.options}>
        {goalOptions.map((option) => (
          <SelectionCard
            key={option.value}
            title={option.label}
            subtitle={option.subtitle}
            selected={data.goal === option.value}
            onPress={() => setGoal(option.value)}
            testID={`goal-${option.value}`}
          />
        ))}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  options: {
    marginTop: 8,
  },
});
