import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { Button, SelectionCard, SegmentedControl } from '@/components/ui';
import { Sparkles, ChevronRight, X, CheckCircle, Calendar, ShoppingCart } from 'lucide-react-native';
import { usePlan } from '@/context/PlanContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { useAuth } from '@/context/AuthContext';

type TimeRange = '1week' | '2weeks';
type MealCount = 2 | 3 | 4;

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [mealCount, setMealCount] = useState<MealCount>(3);
  const [timeRange, setTimeRange] = useState<TimeRange>('1week');
  
  const { currentPlan, isGenerating, generatePlan, isLoadingPlan, getTotalGroceryCost } = usePlan();
  const { data: onboardingData } = useOnboarding();
  useAuth();

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '1week', label: '1 Week' },
    { value: '2weeks', label: '2 Weeks' },
  ];

  const mealOptions: { value: MealCount; label: string; subtitle: string }[] = [
    { value: 2, label: '2 meals/day', subtitle: 'Lunch & Dinner' },
    { value: 3, label: '3 meals/day', subtitle: 'Breakfast, Lunch & Dinner' },
    { value: 4, label: '4 meals/day', subtitle: 'With afternoon snack' },
  ];

  const handleGenerate = async () => {
    try {
      console.log('[HomeScreen] Starting plan generation...');
      console.log('[HomeScreen] Onboarding data:', JSON.stringify(onboardingData, null, 2));
      
      const birthDateStr = onboardingData.birthDate 
        ? new Date(onboardingData.birthDate).toISOString() 
        : null;

      const profile = {
        gender: onboardingData.gender,
        heightCm: onboardingData.heightCm || 170,
        weightKg: onboardingData.weightKg || 70,
        birthDate: birthDateStr,
        goal: onboardingData.goal,
        dietType: onboardingData.dietType,
        allergies: onboardingData.allergies || [],
        cookingEffort: onboardingData.cookingEffort,
        weeklyBudget: onboardingData.weeklyBudget || 80,
      };

      console.log('[HomeScreen] Profile for generation:', JSON.stringify(profile, null, 2));
      console.log('[HomeScreen] Meals per day:', mealCount);
      console.log('[HomeScreen] Duration weeks:', timeRange === '1week' ? 1 : 2);

      await generatePlan(
        mealCount,
        timeRange === '1week' ? 1 : 2,
        profile
      );
      
      setModalVisible(false);
      console.log('[HomeScreen] Plan generated successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[HomeScreen] Plan generation failed:', errorMessage);
      console.error('[HomeScreen] Full error:', error);
      Alert.alert(
        'Generation Failed',
        `Unable to generate your meal plan: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  };

  const totalMeals = currentPlan ? currentPlan.meals.length : 0;
  const totalGroceryCost = getTotalGroceryCost();

  const hasPlan = !!currentPlan && currentPlan.status === 'ready';

  if (isLoadingPlan) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>YOI</Text>
        <Text style={styles.greeting}>Welcome back!</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {!hasPlan ? (
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Sparkles size={28} color={theme.colors.text.inverse} />
            </View>
            <Text style={styles.heroTitle}>Create your meal plan</Text>
            <Text style={styles.heroSubtitle}>
              Get a personalized weekly meal plan with a shopping list tailored to your budget and preferences.
            </Text>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.heroButtonText}>Create My First Plan</Text>
              <ChevronRight size={20} color={theme.colors.text.inverse} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.planActiveCard}>
            <View style={styles.planActiveHeader}>
              <CheckCircle size={24} color={theme.colors.success} />
              <Text style={styles.planActiveTitle}>Plan Active</Text>
            </View>
            <Text style={styles.planActiveSubtitle}>
              {currentPlan.durationDays} day plan • {currentPlan.mealsPerDay} meals/day
            </Text>
            <View style={styles.planStats}>
              <View style={styles.planStatItem}>
                <Calendar size={18} color={theme.colors.text.secondary} />
                <Text style={styles.planStatText}>{totalMeals} meals planned</Text>
              </View>
              <View style={styles.planStatItem}>
                <ShoppingCart size={18} color={theme.colors.text.secondary} />
                <Text style={styles.planStatText}>${totalGroceryCost.toFixed(2)} est. groceries</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.regenerateButton}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Sparkles size={18} color={theme.colors.text.primary} />
              <Text style={styles.regenerateButtonText}>Generate New Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalMeals}</Text>
              <Text style={styles.statLabel}>Meals planned</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>${totalGroceryCost.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Est. groceries</Text>
            </View>
          </View>
        </View>

        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Getting Started</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipNumber}>1</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Create your plan</Text>
              <Text style={styles.tipText}>Choose how many meals and for how long</Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipNumber}>2</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Review your meals</Text>
              <Text style={styles.tipText}>Check the Food tab for your meals</Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipNumber}>3</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Shop smart</Text>
              <Text style={styles.tipText}>Use your generated grocery list</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => !isGenerating && setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {isGenerating ? (
              <View style={styles.generatingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.generatingTitle}>Creating Your Plan</Text>
                <Text style={styles.generatingSubtitle}>
                  Our AI is crafting personalized meals based on your preferences...
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Plan Settings</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <X size={24} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSectionTitle}>How many meals per day?</Text>
                {mealOptions.map((option) => (
                  <SelectionCard
                    key={option.value}
                    title={option.label}
                    subtitle={option.subtitle}
                    selected={mealCount === option.value}
                    onPress={() => setMealCount(option.value)}
                  />
                ))}

                <Text style={[styles.modalSectionTitle, { marginTop: 24 }]}>Time range</Text>
                <SegmentedControl
                  options={timeRangeOptions}
                  selected={timeRange}
                  onSelect={setTimeRange}
                />

                <View style={styles.modalFooter}>
                  <Button
                    title="Generate Plan"
                    onPress={handleGenerate}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  logo: {
    fontSize: 24,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    letterSpacing: 2,
  },
  greeting: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  heroCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  heroTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
    marginBottom: theme.spacing.xs,
  },
  heroSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  heroButtonText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.inverse,
    marginRight: theme.spacing.xs,
  },
  planActiveCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  planActiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  planActiveTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  planActiveSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  planStats: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  planStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  planStatText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  regenerateButtonText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  statsSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  statValue: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  tipsSection: {},
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  tipNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
    lineHeight: 28,
    marginRight: theme.spacing.sm,
    overflow: 'hidden',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  tipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
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
  modalSectionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  modalFooter: {
    marginTop: theme.spacing.xl,
  },
  generatingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
  },
  generatingTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  generatingSubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
