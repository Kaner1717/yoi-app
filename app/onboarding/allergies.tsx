import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingLayout, Chip } from '@/components/ui';
import { useOnboarding } from '@/context/OnboardingContext';
import { Allergy } from '@/types/onboarding';
import { theme } from '@/constants/theme';

const allergyOptions: { value: Allergy; label: string }[] = [
  { value: 'dairy', label: 'Dairy' },
  { value: 'gluten', label: 'Gluten' },
  { value: 'nuts', label: 'Nuts' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'fish', label: 'Fish' },
  { value: 'soy', label: 'Soy' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'sesame', label: 'Sesame' },
];

export default function AllergiesScreen() {
  const router = useRouter();
  const { data, setAllergies } = useOnboarding();

  const toggleAllergy = (allergy: Allergy) => {
    if (data.allergies.includes(allergy)) {
      setAllergies(data.allergies.filter((a) => a !== allergy));
    } else {
      setAllergies([...data.allergies, allergy]);
    }
  };

  return (
    <OnboardingLayout
      title="Any food allergies?"
      subtitle="Select all that apply. We'll make sure to exclude these from your meal plans."
      progress={0.6}
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/cooking')}
    >
      <View style={styles.container}>
        <View style={styles.chipsContainer}>
          {allergyOptions.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={data.allergies.includes(option.value)}
              onPress={() => toggleAllergy(option.value)}
              testID={`allergy-${option.value}`}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => {
            setAllergies([]);
            router.push('/onboarding/cooking');
          }}
        >
          <Text style={styles.skipText}>I have no allergies</Text>
        </TouchableOpacity>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  skipButton: {
    marginTop: theme.spacing.xxl,
    alignItems: 'center',
  },
  skipText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    textDecorationLine: 'underline',
  },
});
