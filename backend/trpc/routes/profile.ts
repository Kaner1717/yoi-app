import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const getSupabaseAdmin = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const profileSchema = z.object({
  userId: z.string(),
  gender: z.enum(['male', 'female', 'other']).nullable(),
  heightCm: z.number(),
  weightKg: z.number(),
  birthDate: z.string().nullable(),
  goal: z.enum(['lose', 'maintain', 'gain']).nullable(),
  dietType: z.enum(['classic', 'vegetarian', 'vegan', 'pescatarian', 'keto']).nullable(),
  allergies: z.array(z.string()),
  cookingEffort: z.enum(['low', 'medium', 'high']).nullable(),
  weeklyBudget: z.number(),
  measurementUnit: z.enum(['metric', 'imperial']),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
});

export const profileRouter = createTRPCRouter({
  get: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      console.log('[Profile] Get profile for userId:', input.userId);
      
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', input.userId)
        .single();

      if (error) {
        console.log('[Profile] Get error:', error.message);
        return null;
      }

      console.log('[Profile] Found profile:', data);
      return data;
    }),

  upsert: publicProcedure
    .input(profileSchema)
    .mutation(async ({ input }) => {
      console.log('[Profile] Upserting profile for userId:', input.userId);
      console.log('[Profile] Input data:', JSON.stringify(input, null, 2));
      
      const supabase = getSupabaseAdmin();
      
      const profileData = {
        user_id: input.userId,
        gender: input.gender,
        height_cm: input.heightCm,
        weight_kg: input.weightKg,
        birthdate: input.birthDate,
        goal: input.goal,
        diet_type: input.dietType,
        allergies: input.allergies,
        cooking_effort: input.cookingEffort,
        weekly_budget: input.weeklyBudget,
        measurement_system: input.measurementUnit,
        user_name: input.userName,
        user_email: input.userEmail,
      };

      console.log('[Profile] Database data:', JSON.stringify(profileData, null, 2));

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.error('[Profile] Upsert error:', error.message);
        throw new Error(`Failed to save profile: ${error.message}`);
      }

      console.log('[Profile] Upserted successfully:', data);
      return data;
    }),

  delete: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      console.log('[Profile] Deleting profile for userId:', input.userId);
      
      const supabase = getSupabaseAdmin();
      
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', input.userId);

      if (error) {
        console.error('[Profile] Delete error:', error.message);
        throw new Error(`Failed to delete profile: ${error.message}`);
      }

      console.log('[Profile] Deleted successfully');
      return { success: true };
    }),
});
