// @ts-nocheck
/* eslint-disable import/no-unresolved */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Profile {
  gender: string | null;
  height_cm: number;
  weight_kg: number;
  birthdate: string | null;
  goal: string | null;
  diet_type: string | null;
  allergies: string[];
  cooking_effort: string | null;
  weekly_budget: number;
}

interface GeneratePlanInput {
  duration_days: 7 | 14;
  meals_per_day: 2 | 3 | 4;
}

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  est_price: number;
}

interface Meal {
  meal_slot: string;
  title: string;
  description: string;
  calories: number;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  steps: string[];
  ingredients: Ingredient[];
}

interface Day {
  day_index: number;
  meals: Meal[];
}

interface GeneratedPlan {
  meta: {
    duration_days: number;
    meals_per_day: number;
    target_calories: number;
    weekly_budget: number;
    estimated_total_cost: number;
    notes: string[];
  };
  days: Day[];
}

function calculateBMR(gender: string | null, heightCm: number, weightKg: number, age: number): number {
  if (gender === "male") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
}

function calculateTargetCalories(profile: Profile): number {
  const age = profile.birthdate
    ? Math.floor((Date.now() - new Date(profile.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 25;

  const bmr = calculateBMR(profile.gender, profile.height_cm, profile.weight_kg, age);
  const activityFactor = 1.4;
  let tdee = bmr * activityFactor;

  if (profile.goal === "lose") {
    tdee -= 400;
  } else if (profile.goal === "gain") {
    tdee += 300;
  }

  return Math.max(1200, Math.round(tdee));
}

function getMealSlots(count: number): string[] {
  switch (count) {
    case 2: return ["lunch", "dinner"];
    case 3: return ["breakfast", "lunch", "dinner"];
    case 4: return ["breakfast", "lunch", "dinner", "snack"];
    default: return ["breakfast", "lunch", "dinner"];
  }
}

async function generatePlanWithOpenAI(
  profile: Profile,
  durationDays: number,
  mealsPerDay: number,
  targetCalories: number,
  openaiKey: string,
  cheaperRetry: boolean = false
): Promise<GeneratedPlan> {
  const mealSlots = getMealSlots(mealsPerDay);
  
  const systemPrompt = `You are a professional nutritionist and meal planner. Generate a detailed meal plan in strict JSON format.
The user has the following profile:
- Gender: ${profile.gender || "not specified"}
- Goal: ${profile.goal || "maintain weight"}
- Diet type: ${profile.diet_type || "classic"}
- Allergies to avoid: ${profile.allergies?.length ? profile.allergies.join(", ") : "none"}
- Cooking effort preference: ${profile.cooking_effort || "medium"}
- Weekly budget: $${profile.weekly_budget}
${cheaperRetry ? "\n⚠️ IMPORTANT: The previous plan exceeded budget. Use ONLY cheap, budget-friendly ingredients. Focus on beans, rice, eggs, seasonal vegetables, and affordable proteins." : ""}

Target daily calories: ${targetCalories}
Duration: ${durationDays} days
Meals per day: ${mealsPerDay} (${mealSlots.join(", ")})

Return ONLY valid JSON matching this exact schema with no additional text:
{
  "meta": {
    "duration_days": ${durationDays},
    "meals_per_day": ${mealsPerDay},
    "target_calories": ${targetCalories},
    "weekly_budget": ${profile.weekly_budget},
    "estimated_total_cost": <number>,
    "notes": [<any warnings or notes as strings>]
  },
  "days": [
    {
      "day_index": <0 to ${durationDays - 1}>,
      "meals": [
        {
          "meal_slot": "<breakfast|lunch|dinner|snack>",
          "title": "<meal name>",
          "description": "<brief description>",
          "calories": <number>,
          "macros": {"protein_g": <number>, "carbs_g": <number>, "fat_g": <number>},
          "steps": ["<step 1>", "<step 2>", ...],
          "ingredients": [
            {"name": "<ingredient>", "quantity": <number>, "unit": "<g|ml|pcs|tbsp|tsp|cup>", "category": "<produce|protein|dairy|pantry|frozen|other>", "est_price": <number in USD>}
          ]
        }
      ]
    }
  ]
}

Requirements:
1. Each day must have exactly ${mealsPerDay} meals with slots: ${mealSlots.join(", ")}
2. Daily calories should total approximately ${targetCalories}
3. Include variety - don't repeat meals within 3 days
4. Respect dietary restrictions and allergies
5. Estimate realistic ingredient prices
6. Keep total cost within $${profile.weekly_budget * (durationDays / 7)} for the plan duration`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a ${durationDays}-day meal plan with ${mealsPerDay} meals per day.` }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[generate_plan] OpenAI API error:", error);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  const plan: GeneratedPlan = JSON.parse(content);
  
  // Validate the plan structure
  if (!plan.meta || !plan.days || !Array.isArray(plan.days)) {
    throw new Error("Invalid plan structure");
  }

  if (plan.days.length !== durationDays) {
    throw new Error(`Expected ${durationDays} days, got ${plan.days.length}`);
  }

  for (const day of plan.days) {
    if (!day.meals || day.meals.length !== mealsPerDay) {
      throw new Error(`Day ${day.day_index} has incorrect number of meals`);
    }
    for (const meal of day.meals) {
      if (!meal.ingredients || meal.ingredients.length === 0) {
        throw new Error(`Meal ${meal.title} has no ingredients`);
      }
    }
  }

  return plan;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create client with user's auth token
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      console.error("[generate_plan] Auth error:", userError);
      throw new Error("Unauthorized");
    }

    const userId = user.id;
    console.log("[generate_plan] User ID:", userId);

    const { duration_days, meals_per_day }: GeneratePlanInput = await req.json();
    console.log("[generate_plan] Input:", { duration_days, meals_per_day });

    // Validate input
    if (![7, 14].includes(duration_days)) {
      throw new Error("duration_days must be 7 or 14");
    }
    if (![2, 3, 4].includes(meals_per_day)) {
      throw new Error("meals_per_day must be 2, 3, or 4");
    }

    // Load user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      console.error("[generate_plan] Profile error:", profileError);
      throw new Error("Profile not found. Please complete onboarding first.");
    }

    console.log("[generate_plan] Profile loaded:", profile.gender, profile.goal);

    const targetCalories = calculateTargetCalories(profile);
    console.log("[generate_plan] Target calories:", targetCalories);

    // Create plan record with 'generating' status
    const { data: planRecord, error: planError } = await supabase
      .from("plans")
      .insert({
        user_id: userId,
        duration_days,
        meals_per_day,
        target_calories: targetCalories,
        weekly_budget: profile.weekly_budget,
        status: "generating",
      })
      .select()
      .single();

    if (planError) {
      console.error("[generate_plan] Plan insert error:", planError);
      throw new Error("Failed to create plan record");
    }

    const planId = planRecord.id;
    console.log("[generate_plan] Plan record created:", planId);

    let generatedPlan: GeneratedPlan;
    let retried = false;

    try {
      // First attempt
      generatedPlan = await generatePlanWithOpenAI(
        profile,
        duration_days,
        meals_per_day,
        targetCalories,
        openaiKey
      );

      // Check budget
      const maxBudget = profile.weekly_budget * (duration_days / 7) * 1.15;
      if (generatedPlan.meta.estimated_total_cost > maxBudget) {
        console.log("[generate_plan] Over budget, retrying with cheaper meals...");
        retried = true;
        generatedPlan = await generatePlanWithOpenAI(
          profile,
          duration_days,
          meals_per_day,
          targetCalories,
          openaiKey,
          true // cheaper retry
        );
      }
    } catch (genError) {
      console.error("[generate_plan] Generation error:", genError);
      
      // Retry once on failure
      if (!retried) {
        console.log("[generate_plan] Retrying generation...");
        retried = true;
        generatedPlan = await generatePlanWithOpenAI(
          profile,
          duration_days,
          meals_per_day,
          targetCalories,
          openaiKey
        );
      } else {
        // Mark plan as failed
        await supabase
          .from("plans")
          .update({ status: "failed", generation_notes: String(genError) })
          .eq("id", planId);
        throw genError;
      }
    }

    // Check if still over budget after retry
    const finalMaxBudget = profile.weekly_budget * (duration_days / 7) * 1.15;
    if (generatedPlan.meta.estimated_total_cost > finalMaxBudget) {
      generatedPlan.meta.notes.push(
        `Warning: Estimated cost ($${generatedPlan.meta.estimated_total_cost.toFixed(2)}) exceeds budget by ${((generatedPlan.meta.estimated_total_cost / (profile.weekly_budget * (duration_days / 7)) - 1) * 100).toFixed(0)}%`
      );
    }

    // Save meals and ingredients
    for (const day of generatedPlan.days) {
      for (const meal of day.meals) {
        const { data: mealRecord, error: mealError } = await supabase
          .from("plan_meals")
          .insert({
            plan_id: planId,
            day_index: day.day_index,
            meal_slot: meal.meal_slot,
            title: meal.title,
            description: meal.description,
            calories: meal.calories,
            protein_g: meal.macros.protein_g,
            carbs_g: meal.macros.carbs_g,
            fat_g: meal.macros.fat_g,
            steps: meal.steps,
          })
          .select()
          .single();

        if (mealError) {
          console.error("[generate_plan] Meal insert error:", mealError);
          continue;
        }

        // Insert ingredients
        const ingredients = meal.ingredients.map((ing) => ({
          meal_id: mealRecord.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          category: ing.category,
          est_price: ing.est_price,
        }));

        const { error: ingError } = await supabase
          .from("meal_ingredients")
          .insert(ingredients);

        if (ingError) {
          console.error("[generate_plan] Ingredients insert error:", ingError);
        }
      }
    }

    // Update plan status to ready
    const { error: updateError } = await supabase
      .from("plans")
      .update({
        status: "ready",
        estimated_total_cost: generatedPlan.meta.estimated_total_cost,
        generation_notes: generatedPlan.meta.notes.join("; "),
      })
      .eq("id", planId);

    if (updateError) {
      console.error("[generate_plan] Plan update error:", updateError);
    }

    console.log("[generate_plan] Plan generated successfully:", planId);

    return new Response(
      JSON.stringify({
        success: true,
        plan_id: planId,
        meta: generatedPlan.meta,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[generate_plan] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
