import createContextHook from '@nkzw/create-context-hook';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Meal, GroceryItem, IngredientCategory } from '@/types/plan';

function extractSupabaseError(error: unknown): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  
  const err = error as { message?: string; details?: string; hint?: string; code?: string };
  const parts: string[] = [];
  if (err.message) parts.push(err.message);
  if (err.details) parts.push(`Details: ${err.details}`);
  if (err.hint) parts.push(`Hint: ${err.hint}`);
  if (err.code) parts.push(`Code: ${err.code}`);
  
  return parts.length > 0 ? parts.join(' | ') : JSON.stringify(error);
}

interface DbPlan {
  id: string;
  user_id: string;
  duration_days: number;
  meals_per_day: number;
  target_calories: number;
  weekly_budget: number;
  estimated_total_cost: number;
  status: 'generating' | 'ready' | 'failed';
  generation_notes: string | null;
  created_at: string;
}

interface DbMeal {
  id: string;
  plan_id: string;
  day_index: number;
  meal_slot: string;
  title: string;
  description: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  steps: string[] | null;
  created_at: string;
}

interface DbIngredient {
  id: string;
  meal_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  est_price: number | null;
}

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

export const [PlanProvider, usePlan] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { userId, getAccessToken } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<Error | null>(null);

  const latestPlanQuery = useQuery({
    queryKey: ['plan', 'latest', userId],
    queryFn: async (): Promise<TransformedPlan | null> => {
      if (!userId) return null;
      
      console.log('[PlanContext] Fetching latest plan for user:', userId);
      
      const { data: plans, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(1);

      if (planError) {
        const errorMsg = extractSupabaseError(planError);
        console.error('[PlanContext] Plan fetch error:', errorMsg);
        throw new Error(errorMsg);
      }

      if (!plans || plans.length === 0) {
        console.log('[PlanContext] No plans found');
        return null;
      }

      const plan = plans[0] as DbPlan;
      console.log('[PlanContext] Found plan:', plan.id);

      const { data: meals, error: mealsError } = await supabase
        .from('plan_meals')
        .select('*')
        .eq('plan_id', plan.id)
        .order('day_index', { ascending: true });

      if (mealsError) {
        const errorMsg = extractSupabaseError(mealsError);
        console.error('[PlanContext] Meals fetch error:', errorMsg);
        throw new Error(errorMsg);
      }

      const mealIds = (meals as DbMeal[]).map(m => m.id);
      
      let ingredients: DbIngredient[] = [];
      if (mealIds.length > 0) {
        const { data: ings, error: ingsError } = await supabase
          .from('meal_ingredients')
          .select('*')
          .in('meal_id', mealIds);

        if (ingsError) {
          console.error('[PlanContext] Ingredients fetch error:', extractSupabaseError(ingsError));
        } else {
          ingredients = ings as DbIngredient[];
        }
      }

      const ingredientsByMeal = new Map<string, DbIngredient[]>();
      ingredients.forEach(ing => {
        const existing = ingredientsByMeal.get(ing.meal_id) || [];
        existing.push(ing);
        ingredientsByMeal.set(ing.meal_id, existing);
      });

      const groceryMap = new Map<string, GroceryItem>();
      const transformedMeals: Meal[] = (meals as DbMeal[]).map(meal => {
        const mealIngredients = ingredientsByMeal.get(meal.id) || [];
        
        const transformedIngredients = mealIngredients.map((ing, idx) => {
          const ingKey = `${ing.name.toLowerCase()}-${ing.unit || ''}`;
          const existing = groceryMap.get(ingKey);
          
          if (existing) {
            existing.quantity += ing.quantity || 0;
            existing.estPrice += ing.est_price || 0;
          } else {
            groceryMap.set(ingKey, {
              id: `grocery-${plan.id}-${ingKey}`,
              planId: plan.id,
              name: ing.name,
              category: (ing.category || 'other') as IngredientCategory,
              quantity: ing.quantity || 0,
              unit: ing.unit || '',
              estPrice: ing.est_price || 0,
            });
          }

          return {
            id: ing.id,
            name: ing.name,
            quantity: ing.quantity || 0,
            unit: ing.unit || '',
            category: (ing.category || 'other') as IngredientCategory,
            estPrice: ing.est_price || 0,
          };
        });

        return {
          id: meal.id,
          planId: plan.id,
          dayIndex: meal.day_index,
          mealSlot: meal.meal_slot as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          title: meal.title,
          description: meal.description || '',
          calories: meal.calories || 0,
          proteinG: meal.protein_g,
          carbsG: meal.carbs_g,
          fatG: meal.fat_g,
          steps: meal.steps || [],
          ingredients: transformedIngredients,
          createdAt: new Date(meal.created_at),
        };
      });

      return {
        id: plan.id,
        userId: plan.user_id,
        durationDays: plan.duration_days,
        mealsPerDay: plan.meals_per_day,
        targetCalories: plan.target_calories,
        weeklyBudget: plan.weekly_budget || 0,
        estimatedTotalCost: plan.estimated_total_cost || 0,
        status: plan.status,
        generationNotes: plan.generation_notes ? [plan.generation_notes] : [],
        createdAt: new Date(plan.created_at),
        meals: transformedMeals,
        groceries: Array.from(groceryMap.values()),
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (latestPlanQuery.error) {
      console.error('[PlanContext] Query error:', extractSupabaseError(latestPlanQuery.error));
    }
  }, [latestPlanQuery.error]);

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
    
    console.log('[PlanContext] Generating plan...', { mealsPerDay, durationWeeks });
    
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/generate_plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration_days: durationWeeks * 7,
          meals_per_day: mealsPerDay,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate plan');
      }

      const result = await response.json();
      console.log('[PlanContext] Plan generated:', result);
      
      await queryClient.invalidateQueries({ queryKey: ['plan', 'latest'] });
      
      return result;
    } catch (error) {
      console.error('[PlanContext] Generation error:', error);
      setGenerateError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [userId, getAccessToken, queryClient]);

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

  return {
    userId,
    isLoadingUserId: false,
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
    refetchPlan: latestPlanQuery.refetch,
  };
});

export function useMealsForDay(dayIndex: number) {
  const { getMealsForDay } = usePlan();
  return getMealsForDay(dayIndex);
}

export function useGroceries() {
  const { getGroceriesByCategory, getTotalGroceryCost, currentPlan } = usePlan();
  return {
    groceriesByCategory: getGroceriesByCategory(),
    totalCost: getTotalGroceryCost(),
    groceries: currentPlan?.groceries || [],
  };
}
