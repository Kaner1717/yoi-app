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

const wakeUpBackend = async (baseUrl: string): Promise<boolean> => {
  try {
    console.log('[tRPC] Waking up backend...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${baseUrl}/api/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    console.log('[tRPC] Wake-up response:', res.status);
    return res.ok;
  } catch (e) {
    console.warn('[tRPC] Wake-up ping failed:', e instanceof Error ? e.message : e);
    return false;
  }
};

let backendAwake = false;

const fetchWithRetry = async (
  url: RequestInfo | URL,
  options?: RequestInit,
  maxRetries = 4,
  baseDelay = 3000
): Promise<Response> => {
  const urlStr = typeof url === 'string' ? url : url.toString();

  if (!backendAwake && API_BASE_URL) {
    const awake = await wakeUpBackend(API_BASE_URL);
    if (awake) backendAwake = true;
    else await sleep(2000);
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[tRPC] Fetch attempt ${attempt + 1}/${maxRetries + 1}:`, urlStr);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options?.headers,
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      console.log('[tRPC] Response status:', response.status);
      backendAwake = true;
      
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
        backendAwake = false;
        await sleep(delay);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isAbort = lastError.name === 'AbortError';
      console.warn(`[tRPC] Fetch attempt ${attempt + 1} failed:`, lastError.message, isAbort ? '(timeout)' : '');
      backendAwake = false;
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(1.5, attempt);
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
