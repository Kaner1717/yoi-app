import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { SegmentedControl } from '@/components/ui';
import { ShoppingCart, UtensilsCrossed, ChevronDown, ChevronUp, Flame, Clock } from 'lucide-react-native';
import { usePlan, useGroceries } from '@/context/PlanContext';
import type { Meal, IngredientCategory } from '@/types/plan';

type FoodTab = 'meals' | 'groceries';

const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  produce: '🥬 Produce',
  protein: '🥩 Protein',
  dairy: '🧀 Dairy',
  pantry: '🥫 Pantry',
  frozen: '🧊 Frozen',
  other: '📦 Other',
};

const CATEGORY_ORDER: IngredientCategory[] = ['produce', 'protein', 'dairy', 'pantry', 'frozen', 'other'];

export default function FoodScreen() {
  const [activeTab, setActiveTab] = useState<FoodTab>('meals');
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORY_ORDER));
  
  const { currentPlan, isLoadingPlan } = usePlan();
  const { groceriesByCategory, totalCost } = useGroceries();

  const tabOptions: { value: FoodTab; label: string }[] = [
    { value: 'meals', label: 'Meals' },
    { value: 'groceries', label: 'Groceries' },
  ];

  const mealsByDay = useMemo(() => {
    if (!currentPlan) return {};
    const grouped: Record<number, Meal[]> = {};
    currentPlan.meals.forEach(meal => {
      if (!grouped[meal.dayIndex]) {
        grouped[meal.dayIndex] = [];
      }
      grouped[meal.dayIndex].push(meal);
    });
    Object.values(grouped).forEach(meals => {
      meals.sort((a, b) => {
        const order = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
        return order[a.mealSlot] - order[b.mealSlot];
      });
    });
    return grouped;
  }, [currentPlan]);

  const toggleMealExpanded = (mealId: string) => {
    setExpandedMeals(prev => {
      const next = new Set(prev);
      if (next.has(mealId)) {
        next.delete(mealId);
      } else {
        next.add(mealId);
      }
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const renderMealCard = (meal: Meal) => {
    const isExpanded = expandedMeals.has(meal.id);
    const slotLabel = meal.mealSlot.charAt(0).toUpperCase() + meal.mealSlot.slice(1);

    return (
      <View key={meal.id} style={styles.mealCard}>
        <TouchableOpacity 
          style={styles.mealCardHeader}
          onPress={() => toggleMealExpanded(meal.id)}
          activeOpacity={0.7}
        >
          <View style={styles.mealInfo}>
            <Text style={styles.mealSlot}>{slotLabel}</Text>
            <Text style={styles.mealTitle}>{meal.title}</Text>
            <View style={styles.mealMeta}>
              <View style={styles.metaItem}>
                <Flame size={14} color={theme.colors.text.tertiary} />
                <Text style={styles.metaText}>{meal.calories} cal</Text>
              </View>
              {meal.steps && (
                <View style={styles.metaItem}>
                  <Clock size={14} color={theme.colors.text.tertiary} />
                  <Text style={styles.metaText}>{meal.steps.length} steps</Text>
                </View>
              )}
            </View>
          </View>
          {isExpanded ? (
            <ChevronUp size={20} color={theme.colors.text.tertiary} />
          ) : (
            <ChevronDown size={20} color={theme.colors.text.tertiary} />
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.mealDetails}>
            <Text style={styles.mealDescription}>{meal.description}</Text>
            
            {meal.proteinG !== null && (
              <View style={styles.macrosRow}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{meal.proteinG}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{meal.carbsG}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{meal.fatG}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
            )}

            {meal.ingredients.length > 0 && (
              <View style={styles.ingredientsSection}>
                <Text style={styles.sectionLabel}>Ingredients</Text>
                {meal.ingredients.map((ing, idx) => (
                  <Text key={idx} style={styles.ingredientText}>
                    • {ing.quantity} {ing.unit} {ing.name}
                  </Text>
                ))}
              </View>
            )}

            {meal.steps.length > 0 && (
              <View style={styles.stepsSection}>
                <Text style={styles.sectionLabel}>Steps</Text>
                {meal.steps.map((step, idx) => (
                  <View key={idx} style={styles.stepRow}>
                    <Text style={styles.stepNumber}>{idx + 1}</Text>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderMeals = () => {
    if (!currentPlan || currentPlan.meals.length === 0) {
      return renderEmptyMeals();
    }

    const dayIndices = Object.keys(mealsByDay).map(Number).sort((a, b) => a - b);

    return (
      <View>
        {dayIndices.map(dayIndex => (
          <View key={dayIndex} style={styles.daySection}>
            <Text style={styles.dayTitle}>Day {dayIndex + 1}</Text>
            {mealsByDay[dayIndex].map(meal => renderMealCard(meal))}
          </View>
        ))}
      </View>
    );
  };

  const renderGroceries = () => {
    const hasGroceries = Object.keys(groceriesByCategory).length > 0;
    
    if (!hasGroceries) {
      return renderEmptyGroceries();
    }

    return (
      <View>
        <View style={styles.groceryHeader}>
          <Text style={styles.groceryTotal}>Estimated Total</Text>
          <Text style={styles.groceryTotalValue}>${totalCost.toFixed(2)}</Text>
        </View>

        {CATEGORY_ORDER.map(category => {
          const items = groceriesByCategory[category];
          if (!items || items.length === 0) return null;

          const isExpanded = expandedCategories.has(category);
          const categoryTotal = items.reduce((sum, item) => sum + item.estPrice, 0);

          return (
            <View key={category} style={styles.categorySection}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryTitle}>{CATEGORY_LABELS[category]}</Text>
                <View style={styles.categoryRight}>
                  <Text style={styles.categoryTotal}>${categoryTotal.toFixed(2)}</Text>
                  {isExpanded ? (
                    <ChevronUp size={18} color={theme.colors.text.tertiary} />
                  ) : (
                    <ChevronDown size={18} color={theme.colors.text.tertiary} />
                  )}
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.groceryItems}>
                  {items.map(item => (
                    <View key={item.id} style={styles.groceryItem}>
                      <View style={styles.groceryItemInfo}>
                        <Text style={styles.groceryItemName}>{item.name}</Text>
                        <Text style={styles.groceryItemQty}>
                          {item.quantity} {item.unit}
                        </Text>
                      </View>
                      <Text style={styles.groceryItemPrice}>${item.estPrice.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderEmptyMeals = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <UtensilsCrossed size={48} color={theme.colors.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>No meals yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first meal plan from the Home tab to see your personalized meals here.
      </Text>
    </View>
  );

  const renderEmptyGroceries = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <ShoppingCart size={48} color={theme.colors.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>No groceries yet</Text>
      <Text style={styles.emptySubtitle}>
        Your shopping list will appear here once you generate a meal plan.
      </Text>
    </View>
  );

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
        <Text style={styles.title}>Food</Text>
        <View style={styles.segmentContainer}>
          <SegmentedControl
            options={tabOptions}
            selected={activeTab}
            onSelect={setActiveTab}
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'meals' ? renderMeals() : renderGroceries()}
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
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  segmentContainer: {
    marginBottom: theme.spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  daySection: {
    marginBottom: theme.spacing.lg,
  },
  dayTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  mealCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  mealInfo: {
    flex: 1,
  },
  mealSlot: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.primary,
    marginTop: 2,
  },
  mealMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
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
  mealDetails: {
    padding: theme.spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  mealDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  macrosRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  macroLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  ingredientsSection: {
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  ingredientText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  stepsSection: {},
  stepRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
  stepNumber: {
    width: 20,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  groceryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  groceryTotal: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.inverse,
  },
  groceryTotalValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  categorySection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  categoryTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.primary,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  categoryTotal: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
  },
  groceryItems: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  groceryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  groceryItemInfo: {
    flex: 1,
  },
  groceryItemName: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
  },
  groceryItemQty: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
  groceryItemPrice: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomPadding: {
    height: theme.spacing.xxl,
  },
});
