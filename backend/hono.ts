import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

console.log("[Backend] Starting YOI API server...");

const app = new Hono();

app.use("*", cors());

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

app.get("/", (c) => {
  console.log("[Backend] Root requested");
  return c.json({ status: "ok", message: "YOI API is running" });
});

app.get("/health", (c) => {
  console.log("[Backend] Health check requested");
  return c.json({ ok: true, timestamp: Date.now() });
});

export default app;
