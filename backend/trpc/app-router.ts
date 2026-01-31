import { createTRPCRouter } from "./create-context";
import { profileRouter } from "./routes/profile";
import { planRouter } from "./routes/plan";

export const appRouter = createTRPCRouter({
  profile: profileRouter,
  plan: planRouter,
});

export type AppRouter = typeof appRouter;
