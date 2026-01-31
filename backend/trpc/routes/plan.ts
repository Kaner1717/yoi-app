import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

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

const MEAL_TEMPLATES = {
  breakfast: [
    { title: 'Greek Yogurt Parfait', description: 'Creamy yogurt layered with granola and fresh berries', baseCalories: 350, protein: 20, carbs: 45, fat: 10 },
    { title: 'Avocado Toast', description: 'Whole grain toast topped with mashed avocado and poached egg', baseCalories: 380, protein: 15, carbs: 35, fat: 22 },
    { title: 'Overnight Oats', description: 'Oats soaked in milk with chia seeds, honey, and banana', baseCalories: 400, protein: 12, carbs: 65, fat: 10 },
    { title: 'Veggie Scramble', description: 'Fluffy scrambled eggs with spinach, tomatoes, and cheese', baseCalories: 320, protein: 22, carbs: 8, fat: 24 },
    { title: 'Banana Pancakes', description: 'Light and fluffy pancakes made with ripe bananas', baseCalories: 420, protein: 10, carbs: 70, fat: 12 },
  ],
  lunch: [
    { title: 'Chicken Caesar Wrap', description: 'Grilled chicken with romaine lettuce and caesar dressing in a tortilla', baseCalories: 520, protein: 35, carbs: 40, fat: 25 },
    { title: 'Quinoa Buddha Bowl', description: 'Nutritious quinoa with roasted vegetables and tahini dressing', baseCalories: 480, protein: 18, carbs: 60, fat: 20 },
    { title: 'Turkey Club Sandwich', description: 'Classic club with turkey, bacon, lettuce, and tomato', baseCalories: 550, protein: 32, carbs: 45, fat: 28 },
    { title: 'Mediterranean Salad', description: 'Fresh greens with feta, olives, cucumber, and grilled chicken', baseCalories: 450, protein: 30, carbs: 25, fat: 28 },
    { title: 'Black Bean Tacos', description: 'Seasoned black beans with fresh salsa and guacamole', baseCalories: 480, protein: 16, carbs: 58, fat: 22 },
  ],
  dinner: [
    { title: 'Baked Salmon', description: 'Herb-crusted salmon fillet with roasted asparagus', baseCalories: 520, protein: 42, carbs: 15, fat: 32 },
    { title: 'Chicken Stir Fry', description: 'Tender chicken with mixed vegetables in savory sauce', baseCalories: 480, protein: 38, carbs: 35, fat: 20 },
    { title: 'Pasta Primavera', description: 'Penne pasta with seasonal vegetables in light garlic sauce', baseCalories: 550, protein: 18, carbs: 75, fat: 18 },
    { title: 'Beef Tacos', description: 'Seasoned ground beef with fresh toppings in corn tortillas', baseCalories: 580, protein: 32, carbs: 45, fat: 30 },
    { title: 'Vegetable Curry', description: 'Aromatic curry with chickpeas and mixed vegetables', baseCalories: 450, protein: 15, carbs: 55, fat: 18 },
  ],
  snack: [
    { title: 'Hummus & Veggies', description: 'Creamy hummus with carrot and celery sticks', baseCalories: 180, protein: 6, carbs: 20, fat: 8 },
    { title: 'Apple & Peanut Butter', description: 'Sliced apple with natural peanut butter', baseCalories: 220, protein: 6, carbs: 28, fat: 12 },
    { title: 'Trail Mix', description: 'Mixed nuts, seeds, and dried fruit', baseCalories: 200, protein: 5, carbs: 22, fat: 12 },
    { title: 'Greek Yogurt Cup', description: 'Plain Greek yogurt with a drizzle of honey', baseCalories: 150, protein: 15, carbs: 12, fat: 4 },
    { title: 'Cheese & Crackers', description: 'Whole grain crackers with cheddar cheese', baseCalories: 190, protein: 8, carbs: 18, fat: 10 },
  ],
};

const INGREDIENT_TEMPLATES: Record<string, { name: string; quantity: number; unit: string; category: string; est_price: number }[]> = {
  'Greek Yogurt Parfait': [
    { name: 'Greek yogurt', quantity: 200, unit: 'g', category: 'dairy', est_price: 1.50 },
    { name: 'Granola', quantity: 50, unit: 'g', category: 'pantry', est_price: 0.80 },
    { name: 'Mixed berries', quantity: 100, unit: 'g', category: 'produce', est_price: 2.00 },
    { name: 'Honey', quantity: 15, unit: 'ml', category: 'pantry', est_price: 0.30 },
  ],
  'Avocado Toast': [
    { name: 'Whole grain bread', quantity: 2, unit: 'pcs', category: 'pantry', est_price: 0.60 },
    { name: 'Avocado', quantity: 1, unit: 'pcs', category: 'produce', est_price: 1.50 },
    { name: 'Eggs', quantity: 2, unit: 'pcs', category: 'protein', est_price: 0.60 },
    { name: 'Salt', quantity: 1, unit: 'pinch', category: 'pantry', est_price: 0.05 },
  ],
  'Overnight Oats': [
    { name: 'Rolled oats', quantity: 80, unit: 'g', category: 'pantry', est_price: 0.40 },
    { name: 'Milk', quantity: 200, unit: 'ml', category: 'dairy', est_price: 0.50 },
    { name: 'Chia seeds', quantity: 15, unit: 'g', category: 'pantry', est_price: 0.60 },
    { name: 'Banana', quantity: 1, unit: 'pcs', category: 'produce', est_price: 0.30 },
  ],
  'Veggie Scramble': [
    { name: 'Eggs', quantity: 3, unit: 'pcs', category: 'protein', est_price: 0.90 },
    { name: 'Spinach', quantity: 50, unit: 'g', category: 'produce', est_price: 0.80 },
    { name: 'Cherry tomatoes', quantity: 100, unit: 'g', category: 'produce', est_price: 1.00 },
    { name: 'Cheddar cheese', quantity: 30, unit: 'g', category: 'dairy', est_price: 0.70 },
  ],
  'Banana Pancakes': [
    { name: 'Flour', quantity: 150, unit: 'g', category: 'pantry', est_price: 0.30 },
    { name: 'Bananas', quantity: 2, unit: 'pcs', category: 'produce', est_price: 0.50 },
    { name: 'Eggs', quantity: 2, unit: 'pcs', category: 'protein', est_price: 0.60 },
    { name: 'Maple syrup', quantity: 30, unit: 'ml', category: 'pantry', est_price: 0.80 },
  ],
  'Chicken Caesar Wrap': [
    { name: 'Chicken breast', quantity: 150, unit: 'g', category: 'protein', est_price: 2.50 },
    { name: 'Romaine lettuce', quantity: 100, unit: 'g', category: 'produce', est_price: 0.80 },
    { name: 'Tortilla wrap', quantity: 1, unit: 'pcs', category: 'pantry', est_price: 0.50 },
    { name: 'Caesar dressing', quantity: 30, unit: 'ml', category: 'pantry', est_price: 0.60 },
    { name: 'Parmesan cheese', quantity: 20, unit: 'g', category: 'dairy', est_price: 0.80 },
  ],
  'Quinoa Buddha Bowl': [
    { name: 'Quinoa', quantity: 100, unit: 'g', category: 'pantry', est_price: 1.00 },
    { name: 'Sweet potato', quantity: 150, unit: 'g', category: 'produce', est_price: 0.80 },
    { name: 'Chickpeas', quantity: 100, unit: 'g', category: 'pantry', est_price: 0.60 },
    { name: 'Tahini', quantity: 30, unit: 'ml', category: 'pantry', est_price: 0.70 },
    { name: 'Kale', quantity: 50, unit: 'g', category: 'produce', est_price: 0.90 },
  ],
  'Turkey Club Sandwich': [
    { name: 'Turkey slices', quantity: 100, unit: 'g', category: 'protein', est_price: 2.00 },
    { name: 'Bacon', quantity: 50, unit: 'g', category: 'protein', est_price: 1.50 },
    { name: 'Bread', quantity: 3, unit: 'pcs', category: 'pantry', est_price: 0.60 },
    { name: 'Lettuce', quantity: 30, unit: 'g', category: 'produce', est_price: 0.40 },
    { name: 'Tomato', quantity: 1, unit: 'pcs', category: 'produce', est_price: 0.50 },
  ],
  'Mediterranean Salad': [
    { name: 'Mixed greens', quantity: 150, unit: 'g', category: 'produce', est_price: 1.50 },
    { name: 'Feta cheese', quantity: 50, unit: 'g', category: 'dairy', est_price: 1.20 },
    { name: 'Olives', quantity: 50, unit: 'g', category: 'pantry', est_price: 0.80 },
    { name: 'Cucumber', quantity: 100, unit: 'g', category: 'produce', est_price: 0.60 },
    { name: 'Chicken breast', quantity: 120, unit: 'g', category: 'protein', est_price: 2.00 },
  ],
  'Black Bean Tacos': [
    { name: 'Black beans', quantity: 200, unit: 'g', category: 'pantry', est_price: 0.80 },
    { name: 'Corn tortillas', quantity: 4, unit: 'pcs', category: 'pantry', est_price: 0.80 },
    { name: 'Avocado', quantity: 1, unit: 'pcs', category: 'produce', est_price: 1.50 },
    { name: 'Salsa', quantity: 60, unit: 'ml', category: 'pantry', est_price: 0.60 },
    { name: 'Lime', quantity: 1, unit: 'pcs', category: 'produce', est_price: 0.30 },
  ],
  'Baked Salmon': [
    { name: 'Salmon fillet', quantity: 180, unit: 'g', category: 'protein', est_price: 4.50 },
    { name: 'Asparagus', quantity: 150, unit: 'g', category: 'produce', est_price: 2.00 },
    { name: 'Lemon', quantity: 1, unit: 'pcs', category: 'produce', est_price: 0.40 },
    { name: 'Olive oil', quantity: 15, unit: 'ml', category: 'pantry', est_price: 0.30 },
    { name: 'Garlic', quantity: 2, unit: 'cloves', category: 'produce', est_price: 0.20 },
  ],
  'Chicken Stir Fry': [
    { name: 'Chicken breast', quantity: 180, unit: 'g', category: 'protein', est_price: 3.00 },
    { name: 'Bell peppers', quantity: 150, unit: 'g', category: 'produce', est_price: 1.50 },
    { name: 'Broccoli', quantity: 150, unit: 'g', category: 'produce', est_price: 1.20 },
    { name: 'Soy sauce', quantity: 30, unit: 'ml', category: 'pantry', est_price: 0.40 },
    { name: 'Rice', quantity: 100, unit: 'g', category: 'pantry', est_price: 0.30 },
  ],
  'Pasta Primavera': [
    { name: 'Penne pasta', quantity: 120, unit: 'g', category: 'pantry', est_price: 0.60 },
    { name: 'Zucchini', quantity: 100, unit: 'g', category: 'produce', est_price: 0.80 },
    { name: 'Cherry tomatoes', quantity: 100, unit: 'g', category: 'produce', est_price: 1.00 },
    { name: 'Garlic', quantity: 3, unit: 'cloves', category: 'produce', est_price: 0.30 },
    { name: 'Parmesan', quantity: 30, unit: 'g', category: 'dairy', est_price: 1.00 },
  ],
  'Beef Tacos': [
    { name: 'Ground beef', quantity: 150, unit: 'g', category: 'protein', est_price: 2.50 },
    { name: 'Corn tortillas', quantity: 4, unit: 'pcs', category: 'pantry', est_price: 0.80 },
    { name: 'Cheddar cheese', quantity: 50, unit: 'g', category: 'dairy', est_price: 0.90 },
    { name: 'Lettuce', quantity: 50, unit: 'g', category: 'produce', est_price: 0.50 },
    { name: 'Sour cream', quantity: 30, unit: 'ml', category: 'dairy', est_price: 0.50 },
  ],
  'Vegetable Curry': [
    { name: 'Chickpeas', quantity: 200, unit: 'g', category: 'pantry', est_price: 0.80 },
    { name: 'Coconut milk', quantity: 200, unit: 'ml', category: 'pantry', est_price: 1.20 },
    { name: 'Mixed vegetables', quantity: 200, unit: 'g', category: 'produce', est_price: 1.50 },
    { name: 'Curry paste', quantity: 30, unit: 'g', category: 'pantry', est_price: 0.70 },
    { name: 'Rice', quantity: 100, unit: 'g', category: 'pantry', est_price: 0.30 },
  ],
  'Hummus & Veggies': [
    { name: 'Hummus', quantity: 100, unit: 'g', category: 'pantry', est_price: 1.20 },
    { name: 'Carrots', quantity: 100, unit: 'g', category: 'produce', est_price: 0.50 },
    { name: 'Celery', quantity: 100, unit: 'g', category: 'produce', est_price: 0.60 },
  ],
  'Apple & Peanut Butter': [
    { name: 'Apple', quantity: 1, unit: 'pcs', category: 'produce', est_price: 0.80 },
    { name: 'Peanut butter', quantity: 30, unit: 'g', category: 'pantry', est_price: 0.50 },
  ],
  'Trail Mix': [
    { name: 'Mixed nuts', quantity: 40, unit: 'g', category: 'pantry', est_price: 1.00 },
    { name: 'Dried fruit', quantity: 30, unit: 'g', category: 'pantry', est_price: 0.80 },
  ],
  'Greek Yogurt Cup': [
    { name: 'Greek yogurt', quantity: 150, unit: 'g', category: 'dairy', est_price: 1.20 },
    { name: 'Honey', quantity: 10, unit: 'ml', category: 'pantry', est_price: 0.20 },
  ],
  'Cheese & Crackers': [
    { name: 'Cheddar cheese', quantity: 50, unit: 'g', category: 'dairy', est_price: 1.00 },
    { name: 'Whole grain crackers', quantity: 40, unit: 'g', category: 'pantry', est_price: 0.80 },
  ],
};

function getStepsForMeal(title: string, effort: string | null): string[] {
  const basicSteps: Record<string, string[]> = {
    'Greek Yogurt Parfait': ['Layer yogurt in a bowl', 'Add granola on top', 'Top with fresh berries', 'Drizzle with honey'],
    'Avocado Toast': ['Toast the bread until golden', 'Mash avocado with salt', 'Spread avocado on toast', 'Top with poached egg'],
    'Overnight Oats': ['Mix oats with milk and chia seeds', 'Refrigerate overnight', 'Top with sliced banana', 'Drizzle with honey'],
    'Veggie Scramble': ['Beat eggs in a bowl', 'Sauté spinach and tomatoes', 'Add eggs and scramble', 'Top with cheese'],
    'Banana Pancakes': ['Mash bananas and mix with eggs', 'Add flour to make batter', 'Cook on medium heat', 'Serve with maple syrup'],
    'Chicken Caesar Wrap': ['Season and grill chicken', 'Chop romaine lettuce', 'Assemble in tortilla with dressing', 'Roll and serve'],
    'Quinoa Buddha Bowl': ['Cook quinoa according to package', 'Roast sweet potato and chickpeas', 'Arrange over quinoa with kale', 'Drizzle with tahini'],
    'Turkey Club Sandwich': ['Toast bread slices', 'Cook bacon until crispy', 'Layer turkey, bacon, lettuce, tomato', 'Stack and slice diagonally'],
    'Mediterranean Salad': ['Grill chicken breast', 'Chop vegetables and greens', 'Combine all ingredients', 'Top with feta and olives'],
    'Black Bean Tacos': ['Warm and season black beans', 'Heat tortillas', 'Prepare guacamole', 'Assemble tacos with toppings'],
    'Baked Salmon': ['Preheat oven to 400°F', 'Season salmon with herbs', 'Arrange asparagus around salmon', 'Bake for 15-18 minutes'],
    'Chicken Stir Fry': ['Slice chicken into strips', 'Stir fry vegetables', 'Add chicken and sauce', 'Serve over rice'],
    'Pasta Primavera': ['Cook pasta al dente', 'Sauté garlic and vegetables', 'Toss pasta with vegetables', 'Top with parmesan'],
    'Beef Tacos': ['Brown ground beef with seasoning', 'Warm tortillas', 'Prepare toppings', 'Assemble and serve'],
    'Vegetable Curry': ['Sauté vegetables with curry paste', 'Add coconut milk and chickpeas', 'Simmer for 15 minutes', 'Serve over rice'],
    'Hummus & Veggies': ['Cut vegetables into sticks', 'Arrange on plate with hummus'],
    'Apple & Peanut Butter': ['Slice apple', 'Serve with peanut butter for dipping'],
    'Trail Mix': ['Combine nuts and dried fruit', 'Portion into serving size'],
    'Greek Yogurt Cup': ['Spoon yogurt into bowl', 'Drizzle with honey'],
    'Cheese & Crackers': ['Slice cheese', 'Arrange with crackers on plate'],
  };
  
  const steps = basicSteps[title] || ['Prepare ingredients', 'Cook according to recipe', 'Serve and enjoy'];
  if (effort === 'low') {
    return steps.slice(0, 3);
  }
  return steps;
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
