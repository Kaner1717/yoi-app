import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { CalendarDays, Flame, Clock } from 'lucide-react-native';
import { usePlan } from '@/context/PlanContext';
import type { Meal } from '@/types/plan';

const MEAL_SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function CalendarScreen() {
  const [selectedDay, setSelectedDay] = useState(0);
  const { currentPlan, isLoadingPlan, getMealsForDay } = usePlan();

  const planStartDate = useMemo(() => {
    if (!currentPlan) return new Date();
    return new Date(currentPlan.createdAt);
  }, [currentPlan]);

  const durationDays = currentPlan?.durationDays || 7;

  const getDateForDay = (dayIndex: number) => {
    const date = new Date(planStartDate);
    date.setDate(planStartDate.getDate() + dayIndex);
    return date;
  };

  const formatMonth = () => {
    if (!currentPlan) {
      const now = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    }
    
    const firstDay = getDateForDay(0);
    const lastDay = getDateForDay(durationDays - 1);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (firstDay.getMonth() === lastDay.getMonth()) {
      return `${monthNames[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
    }
    return `${monthNames[firstDay.getMonth()]} - ${monthNames[lastDay.getMonth()]} ${lastDay.getFullYear()}`;
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isToday = (dayIndex: number) => {
    const date = getDateForDay(dayIndex);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const mealsForSelectedDay = useMemo(() => {
    const meals = getMealsForDay(selectedDay);
    return meals.sort((a, b) => {
      return MEAL_SLOT_ORDER.indexOf(a.mealSlot) - MEAL_SLOT_ORDER.indexOf(b.mealSlot);
    });
  }, [selectedDay, getMealsForDay]);

  const renderMealBlock = (meal: Meal) => {
    const slotLabel = meal.mealSlot.charAt(0).toUpperCase() + meal.mealSlot.slice(1);
    
    return (
      <View key={meal.id} style={styles.mealBlock}>
        <Text style={styles.mealTypeLabel}>{slotLabel}</Text>
        <View style={styles.mealContent}>
          <Text style={styles.mealTitle}>{meal.title}</Text>
          <Text style={styles.mealDescription} numberOfLines={2}>{meal.description}</Text>
          <View style={styles.mealMeta}>
            <View style={styles.metaItem}>
              <Flame size={14} color={theme.colors.text.tertiary} />
              <Text style={styles.metaText}>{meal.calories} cal</Text>
            </View>
            {meal.steps && meal.steps.length > 0 && (
              <View style={styles.metaItem}>
                <Clock size={14} color={theme.colors.text.tertiary} />
                <Text style={styles.metaText}>{meal.steps.length} steps</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyMealSlot = (slot: string) => (
    <View key={slot} style={styles.mealBlock}>
      <Text style={styles.mealTypeLabel}>{slot.charAt(0).toUpperCase() + slot.slice(1)}</Text>
      <View style={styles.mealContent}>
        <Text style={styles.mealTextEmpty}>No meal planned</Text>
      </View>
    </View>
  );

  const renderMealSlots = () => {
    if (!currentPlan || mealsForSelectedDay.length === 0) {
      const slotsToShow = currentPlan?.mealsPerDay === 2 
        ? ['lunch', 'dinner']
        : currentPlan?.mealsPerDay === 4
        ? ['breakfast', 'lunch', 'dinner', 'snack']
        : ['breakfast', 'lunch', 'dinner'];
      
      return slotsToShow.map(slot => renderEmptyMealSlot(slot));
    }

    return mealsForSelectedDay.map(meal => renderMealBlock(meal));
  };

  const totalCalories = useMemo(() => {
    return mealsForSelectedDay.reduce((sum, meal) => sum + meal.calories, 0);
  }, [mealsForSelectedDay]);

  if (isLoadingPlan) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <View style={styles.monthNav}>
          <Text style={styles.monthText}>{formatMonth()}</Text>
        </View>
      </View>

      <View style={styles.weekContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekScroll}>
          {Array.from({ length: durationDays }, (_, index) => {
            const date = getDateForDay(index);
            const isTodayDate = isToday(index);
            const isSelected = selectedDay === index;
            const dayName = dayNames[date.getDay()];
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayColumn,
                  isSelected && styles.dayColumnSelected,
                ]}
                onPress={() => setSelectedDay(index)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>Day {index + 1}</Text>
                <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>{dayName}</Text>
                <View style={[
                  styles.dateCircle,
                  isTodayDate && styles.dateCircleToday,
                  isSelected && styles.dateCircleSelected,
                ]}>
                  <Text style={[
                    styles.dateNumber,
                    isTodayDate && styles.dateNumberToday,
                    isSelected && styles.dateNumberSelected,
                  ]}>
                    {date.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scheduleHeader}>
          <Text style={styles.scheduleTitle}>Day {selectedDay + 1} Meals</Text>
          {totalCalories > 0 && (
            <View style={styles.calorieBadge}>
              <Flame size={14} color={theme.colors.text.inverse} />
              <Text style={styles.calorieBadgeText}>{totalCalories} cal</Text>
            </View>
          )}
        </View>
        
        {renderMealSlots()}

        {!currentPlan && (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIcon}>
              <CalendarDays size={32} color={theme.colors.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>No meal plan yet</Text>
            <Text style={styles.emptySubtitle}>
              Generate a meal plan from Home to see your weekly schedule here.
            </Text>
          </View>
        )}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
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
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  monthText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  weekContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.md,
  },
  weekScroll: {
    paddingHorizontal: theme.spacing.sm,
  },
  dayColumn: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: 2,
    minWidth: 56,
  },
  dayColumnSelected: {
    backgroundColor: theme.colors.surface,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.tertiary,
    marginBottom: 2,
  },
  dayLabelSelected: {
    color: theme.colors.text.secondary,
  },
  dayName: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  dayNameSelected: {
    color: theme.colors.text.primary,
  },
  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCircleToday: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  dateCircleSelected: {
    backgroundColor: theme.colors.primary,
  },
  dateNumber: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  dateNumberToday: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  dateNumberSelected: {
    color: theme.colors.text.inverse,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  scheduleTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.primary,
  },
  calorieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  calorieBadgeText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.inverse,
  },
  mealBlock: {
    marginBottom: theme.spacing.md,
  },
  mealTypeLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  mealContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  mealTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  mealDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  mealMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
  mealTextEmpty: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
  },
  emptyStateCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomPadding: {
    height: theme.spacing.xxl,
  },
});
