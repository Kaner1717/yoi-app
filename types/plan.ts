export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type IngredientCategory = 'produce' | 'protein' | 'pantry' | 'dairy' | 'frozen' | 'other';

export type PlanStatus = 'generating' | 'ready' | 'failed';

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  estPrice: number;
}

export interface Meal {
  id: string;
  planId: string;
  dayIndex: number;
  mealSlot: MealSlot;
  title: string;
  description: string;
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  steps: string[];
  ingredients: Ingredient[];
  createdAt: Date;
}

export interface GroceryItem {
  id: string;
  planId: string;
  name: string;
  category: IngredientCategory;
  quantity: number;
  unit: string;
  estPrice: number;
}

export interface Plan {
  id: string;
  userId: string;
  durationDays: number;
  mealsPerDay: number;
  targetCalories: number;
  weeklyBudget: number;
  estimatedTotalCost: number;
  status: PlanStatus;
  generationNotes: string[];
  createdAt: Date;
  meals: Meal[];
  groceries: GroceryItem[];
}

export interface GeneratePlanInput {
  mealsPerDay: 2 | 3 | 4;
  durationWeeks: 1 | 2;
}

export interface AIGeneratedPlan {
  meta: {
    duration_days: number;
    meals_per_day: number;
    target_calories: number;
    weekly_budget: number;
    estimated_total_cost: number;
    notes: string[];
  };
  days: {
    day_index: number;
    meals: {
      meal_slot: MealSlot;
      title: string;
      description: string;
      calories: number;
      macros: {
        protein_g: number;
        carbs_g: number;
        fat_g: number;
      };
      steps: string[];
      ingredients: {
        name: string;
        quantity: number;
        unit: string;
        category: IngredientCategory;
        est_price: number;
      }[];
    }[];
  }[];
}

export interface UserProfile {
  userId: string;
  gender: 'male' | 'female' | 'other' | null;
  heightCm: number;
  weightKg: number;
  birthDate: Date | null;
  goal: 'lose' | 'maintain' | 'gain' | null;
  dietType: 'classic' | 'vegetarian' | 'vegan' | 'pescatarian' | 'keto' | null;
  allergies: string[];
  cookingEffort: 'low' | 'medium' | 'high' | null;
  weeklyBudget: number;
  measurementUnit: 'metric' | 'imperial';
  userName: string | null;
  userEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}
