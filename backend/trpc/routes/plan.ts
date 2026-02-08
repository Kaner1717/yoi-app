import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { MEAL_TEMPLATES, INGREDIENT_TEMPLATES, getStepsForMeal } from "./plan-data";

const mealSlotSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
const ingredientCategorySchema = z.enum(['produce', 'protein', 'pantry', 'dairy', 'frozen', 'other']);

const ingredientSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  category: ingredientCategorySchema,
  est_price: z.number(),
});

const mealSchema = z.object({
  meal_slot: mealSlotSchema,
  title: z.string(),
  description: z.string(),
  calories: z.number(),
  macros: z.object({
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
  }),
  steps: z.array(z.string()),
  ingredients: z.array(ingredientSchema),
});

const daySchema = z.object({
  day_index: z.number(),
  meals: z.array(mealSchema),
});

const aiPlanSchema = z.object({
  meta: z.object({
    duration_days: z.number(),
    meals_per_day: z.number(),
    target_calories: z.number(),
    weekly_budget: z.number(),
    estimated_total_cost: z.number(),
    notes: z.array(z.string()),
  }),
  days: z.array(daySchema),
});

interface StoredPlan {
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
  rawPlan: z.infer<typeof aiPlanSchema> | null;
}

const planStore = new Map<string, StoredPlan>();

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function calculateBMR(gender: string | null, heightCm: number, weightKg: number, age: number): number {
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
}

function calculateTargetCalories(
  gender: string | null,
  heightCm: number,
  weightKg: number,
  birthDate: string | null,
  goal: string | null
): number {
  const age = birthDate 
    ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 22;
  
  const bmr = calculateBMR(gender, heightCm, weightKg, age);
  const activityFactor = 1.4;
  let tdee = bmr * activityFactor;
  
  if (goal === 'lose') {
    tdee -= 400;
  } else if (goal === 'gain') {
    tdee += 300;
  }
  
  return Math.max(1200, Math.round(tdee));
}

function getMealSlotsForCount(count: number): string[] {
  switch (count) {
    case 2: return ['lunch', 'dinner'];
    case 3: return ['breakfast', 'lunch', 'dinner'];
    case 4: return ['breakfast', 'lunch', 'dinner', 'snack'];
    default: return ['breakfast', 'lunch', 'dinner'];
  }
}



function generateMockPlan(
  durationDays: number,
  mealsPerDay: number,
  targetCalories: number,
  weeklyBudget: number,
  dietType: string | null,
  allergies: string[],
  cookingEffort: string | null
): z.infer<typeof aiPlanSchema> {
  const mealSlots = getMealSlotsForCount(mealsPerDay);
  const caloriesPerMeal = Math.round(targetCalories / mealsPerDay);
  const days: z.infer<typeof aiPlanSchema>['days'] = [];
  let totalCost = 0;

  for (let dayIndex = 0; dayIndex < durationDays; dayIndex++) {
    const meals: z.infer<typeof mealSchema>[] = [];
    
    for (const slot of mealSlots) {
      const slotKey = slot as keyof typeof MEAL_TEMPLATES;
      const templates = MEAL_TEMPLATES[slotKey] || MEAL_TEMPLATES.lunch;
      const template = templates[(dayIndex + mealSlots.indexOf(slot)) % templates.length];
      
      const ingredients = INGREDIENT_TEMPLATES[template.title] || [
        { name: 'Mixed ingredients', quantity: 200, unit: 'g', category: 'other' as const, est_price: 3.00 }
      ];
      
      const mealCost = ingredients.reduce((sum, ing) => sum + ing.est_price, 0);
      totalCost += mealCost;
      
      meals.push({
        meal_slot: slot as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        title: template.title,
        description: template.description,
        calories: slot === 'snack' ? template.baseCalories : caloriesPerMeal,
        macros: {
          protein_g: template.protein,
          carbs_g: template.carbs,
          fat_g: template.fat,
        },
        steps: getStepsForMeal(template.title, cookingEffort),
        ingredients: ingredients.map(ing => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          category: ing.category as 'produce' | 'protein' | 'pantry' | 'dairy' | 'frozen' | 'other',
          est_price: ing.est_price,
        })),
      });
    }
    
    days.push({ day_index: dayIndex, meals });
  }

  const notes: string[] = [];
  const maxBudget = weeklyBudget * (durationDays / 7);
  if (totalCost > maxBudget * 1.15) {
    notes.push(`Estimated cost exceeds budget. Consider cheaper substitutions.`);
  }

  return {
    meta: {
      duration_days: durationDays,
      meals_per_day: mealsPerDay,
      target_calories: targetCalories,
      weekly_budget: weeklyBudget,
      estimated_total_cost: Math.round(totalCost * 100) / 100,
      notes,
    },
    days,
  };
}

export const planRouter = createTRPCRouter({
  getLatest: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      const plans = Array.from(planStore.values())
        .filter(p => p.userId === input.userId && p.status === 'ready')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      console.log('[Plan] Getting latest plan for userId:', input.userId, plans.length > 0 ? 'found' : 'not found');
      return plans[0] || null;
    }),

  generate: publicProcedure
    .input(z.object({
      userId: z.string(),
      mealsPerDay: z.number().min(2).max(4),
      durationWeeks: z.number().min(1).max(2),
      profile: z.object({
        gender: z.enum(['male', 'female', 'other']).nullable(),
        heightCm: z.number(),
        weightKg: z.number(),
        birthDate: z.string().nullable(),
        goal: z.enum(['lose', 'maintain', 'gain']).nullable(),
        dietType: z.enum(['classic', 'vegetarian', 'vegan', 'pescatarian', 'keto']).nullable(),
        allergies: z.array(z.string()),
        cookingEffort: z.enum(['low', 'medium', 'high']).nullable(),
        weeklyBudget: z.number(),
      }),
    }))
    .mutation(async ({ input }) => {
      console.log('[Plan] Generate mutation received input:', JSON.stringify(input, null, 2));
      const planId = generateUUID();
      const durationDays = input.durationWeeks * 7;
      const targetCalories = calculateTargetCalories(
        input.profile.gender,
        input.profile.heightCm,
        input.profile.weightKg,
        input.profile.birthDate,
        input.profile.goal
      );

      console.log('[Plan] Starting generation for userId:', input.userId);
      console.log('[Plan] Target calories:', targetCalories);
      console.log('[Plan] Duration days:', durationDays);
      console.log('[Plan] Meals per day:', input.mealsPerDay);

      const plan: StoredPlan = {
        id: planId,
        userId: input.userId,
        durationDays,
        mealsPerDay: input.mealsPerDay,
        targetCalories,
        weeklyBudget: input.profile.weeklyBudget,
        estimatedTotalCost: 0,
        status: 'generating',
        generationNotes: [],
        createdAt: new Date(),
        rawPlan: null,
      };

      planStore.set(planId, plan);

      try {
        console.log('[Plan] Generating meal plan...');

        const generatedPlan = generateMockPlan(
          durationDays,
          input.mealsPerDay,
          targetCalories,
          input.profile.weeklyBudget,
          input.profile.dietType,
          input.profile.allergies,
          input.profile.cookingEffort
        );

        console.log('[Plan] AI generation complete');

        let totalCost = 0;
        generatedPlan.days.forEach(day => {
          day.meals.forEach(meal => {
            meal.ingredients.forEach(ing => {
              totalCost += ing.est_price;
            });
          });
        });

        const weeklyBudgetForDuration = input.profile.weeklyBudget * (durationDays / 7);
        const notes: string[] = [];
        const maxBudget = weeklyBudgetForDuration * 1.15;
        if (totalCost > maxBudget) {
          notes.push(`Estimated cost (${totalCost.toFixed(2)}) exceeds budget by ${((totalCost / weeklyBudgetForDuration - 1) * 100).toFixed(0)}%. Consider cheaper substitutions.`);
        }

        plan.rawPlan = generatedPlan;
        plan.estimatedTotalCost = totalCost;
        plan.generationNotes = [...generatedPlan.meta.notes, ...notes];
        plan.status = 'ready';
        planStore.set(planId, plan);

        console.log('[Plan] Plan saved successfully, id:', planId);
        return plan;

      } catch (error) {
        console.error('[Plan] Generation failed:', error);
        plan.status = 'failed';
        plan.generationNotes = ['Generation failed. Please try again.'];
        planStore.set(planId, plan);
        throw error;
      }
    }),

  delete: publicProcedure
    .input(z.object({ planId: z.string() }))
    .mutation(({ input }) => {
      planStore.delete(input.planId);
      console.log('[Plan] Deleted plan:', input.planId);
      return { success: true };
    }),
});
