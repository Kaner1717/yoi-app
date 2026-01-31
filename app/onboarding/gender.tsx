import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingLayout, SelectionCard } from '@/components/ui';
import { useOnboarding } from '@/context/OnboardingContext';
import { Gender } from '@/types/onboarding';

const genderOptions: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export default function GenderScreen() {
  const router = useRouter();
  const { data, setGender } = useOnboarding();

  return (
    <OnboardingLayout
      title="Choose your gender"
      subtitle="This will be used to calibrate your custom plan."
      progress={0.1}
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/measurements')}
      canContinue={data.gender !== null}
    >
      <View style={styles.options}>
        {genderOptions.map((option) => (
          <SelectionCard
            key={option.value}
            title={option.label}
            selected={data.gender === option.value}
            onPress={() => setGender(option.value)}
            testID={`gender-${option.value}`}
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
