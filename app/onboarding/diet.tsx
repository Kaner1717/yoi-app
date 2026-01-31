import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingLayout, SelectionCard } from '@/components/ui';
import { useOnboarding } from '@/context/OnboardingContext';
import { DietType } from '@/types/onboarding';

const dietOptions: { value: DietType; label: string; subtitle: string }[] = [
  { value: 'classic', label: 'Classic', subtitle: 'No restrictions, all food groups' },
  { value: 'vegetarian', label: 'Vegetarian', subtitle: 'No meat, includes dairy & eggs' },
  { value: 'vegan', label: 'Vegan', subtitle: 'Plant-based foods only' },
  { value: 'pescatarian', label: 'Pescatarian', subtitle: 'Vegetarian plus seafood' },
  { value: 'keto', label: 'Keto / Low Carb', subtitle: 'High fat, very low carbohydrates' },
];

export default function DietScreen() {
  const router = useRouter();
  const { data, setDietType } = useOnboarding();

  return (
    <OnboardingLayout
      title="What's your diet type?"
      subtitle="We'll customize your meal plans accordingly."
      progress={0.5}
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/allergies')}
      canContinue={data.dietType !== null}
    >
      <View style={styles.options}>
        {dietOptions.map((option) => (
          <SelectionCard
            key={option.value}
            title={option.label}
            subtitle={option.subtitle}
            selected={data.dietType === option.value}
            onPress={() => setDietType(option.value)}
            testID={`diet-${option.value}`}
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
