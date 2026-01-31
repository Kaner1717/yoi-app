import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

function joinUrl(base: string, path: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  return `${cleanBase}/${cleanPath}`;
}

const getBaseUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

  if (!url) {
    console.warn("[tRPC] EXPO_PUBLIC_RORK_API_BASE_URL not set, using fallback");
    return "";
  }

  console.log("[tRPC] Using API base URL:", url);
  return url;
};

export const API_BASE_URL = getBaseUrl();
export const TRPC_URL = joinUrl(API_BASE_URL, "api/trpc");
export const HEALTH_URL = joinUrl(API_BASE_URL, "api/health");

console.log("[tRPC] TRPC_URL:", TRPC_URL);
console.log("[tRPC] HEALTH_URL:", HEALTH_URL);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (
  url: RequestInfo | URL,
  options?: RequestInit,
  maxRetries = 2,
  baseDelay = 3000
): Promise<Response> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[tRPC] Fetch attempt ${attempt + 1}/${maxRetries + 1}:`, url);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('[tRPC] Response status:', response.status);
      
      if (response.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[tRPC] Rate limited (429), waiting ${delay}ms before retry...`);
        if (attempt < maxRetries) {
          await sleep(delay);
          continue;
        }
        return response;
      }
      
      if (response.status === 404 && attempt < maxRetries) {
        const delay = baseDelay * (attempt + 1);
        console.log(`[tRPC] Got 404, backend may be cold starting. Waiting ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[tRPC] Fetch attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[tRPC] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch after retries');
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: TRPC_URL,
      transformer: superjson,
      fetch: fetchWithRetry,
    }),
  ],
});
