import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

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

const profileStore = new Map<string, z.infer<typeof profileSchema> & { createdAt: Date; updatedAt: Date }>();

export const profileRouter = createTRPCRouter({
  get: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      const profile = profileStore.get(input.userId);
      console.log('[Profile] Get profile for userId:', input.userId, profile ? 'found' : 'not found');
      return profile || null;
    }),

  upsert: publicProcedure
    .input(profileSchema)
    .mutation(({ input }) => {
      const existing = profileStore.get(input.userId);
      const now = new Date();
      
      const profile = {
        ...input,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      
      profileStore.set(input.userId, profile);
      console.log('[Profile] Upserted profile for userId:', input.userId);
      return profile;
    }),
});
