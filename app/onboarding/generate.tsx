import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/context/OnboardingContext';
import { Button } from '@/components/ui';
import { theme } from '@/constants/theme';
import { Check, Sparkles } from 'lucide-react-native';

export default function GenerateScreen() {
  const router = useRouter();
  const { data } = useOnboarding();

  const summaryItems = [
    { label: 'Goal', value: data.goal ? data.goal.charAt(0).toUpperCase() + data.goal.slice(1) + ' weight' : '-' },
    { label: 'Diet', value: data.dietType ? data.dietType.charAt(0).toUpperCase() + data.dietType.slice(1) : '-' },
    { label: 'Budget', value: `$${data.weeklyBudget}/week` },
    { label: 'Cooking', value: data.cookingEffort === 'low' ? 'Quick meals' : data.cookingEffort === 'medium' ? 'Medium effort' : 'Full recipes' },
  ];

  const handleGenerate = () => {
    router.push('/onboarding/account');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Sparkles size={32} color={theme.colors.text.inverse} />
          </View>
        </View>

        <Text style={styles.title}>Ready to create your plan!</Text>
        <Text style={styles.subtitle}>
          Based on your preferences, we will generate a personalized meal and grocery plan just for you.
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your preferences</Text>
          {summaryItems.map((item, index) => (
            <View key={index} style={styles.summaryRow}>
              <View style={styles.checkIcon}>
                <Check size={16} color={theme.colors.success} strokeWidth={2.5} />
              </View>
              <Text style={styles.summaryLabel}>{item.label}:</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ))}
          {data.allergies.length > 0 && (
            <View style={styles.summaryRow}>
              <View style={styles.checkIcon}>
                <Check size={16} color={theme.colors.success} strokeWidth={2.5} />
              </View>
              <Text style={styles.summaryLabel}>Allergies:</Text>
              <Text style={styles.summaryValue}>{data.allergies.length} excluded</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Generate My Custom Plan"
          onPress={handleGenerate}
          testID="generate-button"
        />
      </View>
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
    paddingTop: theme.spacing.huge,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xxl,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  summaryTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  checkIcon: {
    marginRight: theme.spacing.sm,
  },
  summaryLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
  summaryValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
});
