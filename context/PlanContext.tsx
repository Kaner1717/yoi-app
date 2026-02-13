import createContextHook from '@nkzw/create-context-hook';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { trpcClient } from '@/lib/trpc';
import type { Meal, GroceryItem, IngredientCategory } from '@/types/plan';

interface TransformedPlan {
  id: string;
  userId: string;
  durationDays: number;
  mealsPerDay: number;
  targetCalories: number;
  weeklyBudget: number;
  estimatedTotalCost: number;
  status: 'generating' | 'ready' | 'failed';
  generationNotes: string[];
  createdAt: Date;
  meals: Meal[];
  groceries: GroceryItem[];
}

function generateIngredientId(): string {
  return 'ing-' + Math.random().toString(36).substring(2, 10);
}

function transformStoredPlan(stored: {
  id: string;
  userId: string;
  durationDays: number;
  mealsPerDay: number;
  targetCalories: number;
  weeklyBudget: number;
  estimatedTotalCost: number;
  status: string;
  generationNotes: string[];
  createdAt: Date;
  rawPlan: {
    days: {
      day_index: number;
      meals: {
        meal_slot: string;
        title: string;
        description: string;
        calories: number;
        macros: { protein_g: number; carbs_g: number; fat_g: number };
        steps: string[];
        ingredients: { name: string; quantity: number; unit: string; category: string; est_price: number }[];
      }[];
    }[];
  } | null;
}): TransformedPlan {
  const groceryMap = new Map<string, GroceryItem>();
  const meals: Meal[] = [];

  if (stored.rawPlan) {
    for (const day of stored.rawPlan.days) {
      for (const meal of day.meals) {
        const mealId = `meal-${stored.id}-${day.day_index}-${meal.meal_slot}`;

        const transformedIngredients = meal.ingredients.map((ing) => {
          const ingKey = `${ing.name.toLowerCase()}-${ing.unit || ''}`;
          const existing = groceryMap.get(ingKey);

          if (existing) {
            existing.quantity += ing.quantity || 0;
            existing.estPrice += ing.est_price || 0;
          } else {
            groceryMap.set(ingKey, {
              id: `grocery-${stored.id}-${ingKey}`,
              planId: stored.id,
              name: ing.name,
              category: (ing.category || 'other') as IngredientCategory,
              quantity: ing.quantity || 0,
              unit: ing.unit || '',
              estPrice: ing.est_price || 0,
            });
          }

          return {
            id: generateIngredientId(),
            name: ing.name,
            quantity: ing.quantity || 0,
            unit: ing.unit || '',
            category: (ing.category || 'other') as IngredientCategory,
            estPrice: ing.est_price || 0,
          };
        });

        meals.push({
          id: mealId,
          planId: stored.id,
          dayIndex: day.day_index,
          mealSlot: meal.meal_slot as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          title: meal.title,
          description: meal.description || '',
          calories: meal.calories || 0,
          proteinG: meal.macros?.protein_g ?? null,
          carbsG: meal.macros?.carbs_g ?? null,
          fatG: meal.macros?.fat_g ?? null,
          steps: meal.steps || [],
          ingredients: transformedIngredients,
          createdAt: new Date(stored.createdAt),
        });
      }
    }
  }

  return {
    id: stored.id,
    userId: stored.userId,
    durationDays: stored.durationDays,
    mealsPerDay: stored.mealsPerDay,
    targetCalories: stored.targetCalories,
    weeklyBudget: stored.weeklyBudget,
    estimatedTotalCost: stored.estimatedTotalCost,
    status: stored.status as 'generating' | 'ready' | 'failed',
    generationNotes: stored.generationNotes || [],
    createdAt: new Date(stored.createdAt),
    meals,
    groceries: Array.from(groceryMap.values()),
  };
}

export const [PlanProvider, usePlan] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { userId, isLoading: isAuthLoading } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<Error | null>(null);

  const latestPlanQuery = useQuery({
    queryKey: ['plan', 'latest', userId],
    queryFn: async (): Promise<TransformedPlan | null> => {
      if (!userId) return null;

      console.log('[PlanContext] Fetching latest plan via tRPC for user:', userId);

      try {
        const stored = await trpcClient.plan.getLatest.query({ userId });

        if (!stored) {
          console.log('[PlanContext] No plans found');
          return null;
        }

        console.log('[PlanContext] Found plan:', stored.id, 'status:', stored.status);
        return transformStoredPlan(stored);
      } catch (error) {
        console.error('[PlanContext] tRPC fetch error:', error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const generatePlan = useCallback(async (
    mealsPerDay: 2 | 3 | 4,
    durationWeeks: 1 | 2,
    profile: {
      gender: 'male' | 'female' | 'other' | null;
      heightCm: number;
      weightKg: number;
      birthDate: string | null;
      goal: 'lose' | 'maintain' | 'gain' | null;
      dietType: 'classic' | 'vegetarian' | 'vegan' | 'pescatarian' | 'keto' | null;
      allergies: string[];
      cookingEffort: 'low' | 'medium' | 'high' | null;
      weeklyBudget: number;
    }
  ) => {
    if (!userId) throw new Error('User ID not available');

    setIsGenerating(true);
    setGenerateError(null);

    console.log('[PlanContext] Generating plan via tRPC...', { mealsPerDay, durationWeeks });

    try {
      const result = await trpcClient.plan.generate.mutate({
        userId,
        mealsPerDay,
        durationWeeks,
        profile,
      });

      console.log('[PlanContext] Plan generated via tRPC:', result.id);

      await queryClient.invalidateQueries({ queryKey: ['plan', 'latest'] });

      return result;
    } catch (error) {
      console.error('[PlanContext] Generation error:', error);
      setGenerateError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [userId, queryClient]);

  const currentPlan = latestPlanQuery.data ?? null;

  const getMealsForDay = useCallback((dayIndex: number): Meal[] => {
    if (!currentPlan) return [];
    return currentPlan.meals.filter(m => m.dayIndex === dayIndex);
  }, [currentPlan]);

  const getGroceriesByCategory = useCallback((): Record<string, GroceryItem[]> => {
    if (!currentPlan) return {};

    const grouped: Record<string, GroceryItem[]> = {};
    currentPlan.groceries.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, [currentPlan]);

  const getTotalGroceryCost = useCallback((): number => {
    if (!currentPlan) return 0;
    return currentPlan.groceries.reduce((sum, item) => sum + item.estPrice, 0);
  }, [currentPlan]);

  const groceriesByCategory = getGroceriesByCategory();
  const totalGroceryCost = getTotalGroceryCost();

  return {
    userId,
    isLoadingUserId: isAuthLoading,
    currentPlan,
    isLoadingPlan: latestPlanQuery.isLoading,
    isPlanError: latestPlanQuery.isError,
    planError: latestPlanQuery.error,
    isGenerating,
    generateError,
    generatePlan,
    getMealsForDay,
    getGroceriesByCategory,
    getTotalGroceryCost,
    groceriesByCategory,
    totalGroceryCost,
    groceries: currentPlan?.groceries || [],
    refetchPlan: latestPlanQuery.refetch,
  };
});
