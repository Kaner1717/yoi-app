import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingLayout, SelectionCard } from '@/components/ui';
import { useOnboarding } from '@/context/OnboardingContext';
import { CookingEffort } from '@/types/onboarding';
import { Zap, Clock, ChefHat } from 'lucide-react-native';
import { theme } from '@/constants/theme';

const cookingOptions: { value: CookingEffort; label: string; subtitle: string; icon: React.ReactNode }[] = [
  { 
    value: 'low', 
    label: 'Quick & simple', 
    subtitle: '15-20 min meals, minimal prep',
    icon: <Zap size={20} color={theme.colors.text.primary} />
  },
  { 
    value: 'medium', 
    label: 'Medium effort', 
    subtitle: '30-45 min meals, some cooking',
    icon: <Clock size={20} color={theme.colors.text.primary} />
  },
  { 
    value: 'high', 
    label: 'I enjoy cooking', 
    subtitle: 'Full recipes, variety of techniques',
    icon: <ChefHat size={20} color={theme.colors.text.primary} />
  },
];

export default function CookingScreen() {
  const router = useRouter();
  const { data, setCookingEffort } = useOnboarding();

  return (
    <OnboardingLayout
      title="How much time for cooking?"
      subtitle="We'll match recipes to your lifestyle."
      progress={0.7}
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/budget')}
      canContinue={data.cookingEffort !== null}
    >
      <View style={styles.options}>
        {cookingOptions.map((option) => (
          <SelectionCard
            key={option.value}
            title={option.label}
            subtitle={option.subtitle}
            icon={option.icon}
            selected={data.cookingEffort === option.value}
            onPress={() => setCookingEffort(option.value)}
            testID={`cooking-${option.value}`}
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
