import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Track if we're currently attempting to refresh the token to prevent race conditions
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Refresh the access token using the refresh token stored in cookies
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    
    if (res.ok) {
      return true;
    }
    
    // If refresh fails, user needs to re-login
    return false;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return false;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // If we get a 401, try to refresh the token and retry once
  if (res.status === 401 && url !== "/api/auth/refresh") {
    // Prevent multiple simultaneous refresh attempts
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().then((success) => {
        isRefreshing = false;
        refreshPromise = null;
        return success;
      });
    }
    
    const refreshSuccess = await refreshPromise;
    
    if (refreshSuccess) {
      // Token was refreshed, retry the original request
      const retryRes = await fetch(url, {
        method,
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
      
      await throwIfResNotOk(retryRes);
      return retryRes;
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    let res = await fetch(url, {
      credentials: "include",
    });

    // If we get a 401, try to refresh the token and retry
    if (res.status === 401 && url !== "/api/auth/refresh") {
      // Prevent multiple simultaneous refresh attempts
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken().then((success) => {
          isRefreshing = false;
          refreshPromise = null;
          return success;
        });
      }
      
      const refreshSuccess = await refreshPromise;
      
      if (refreshSuccess) {
        // Token was refreshed, retry the original request
        res = await fetch(url, {
          credentials: "include",
        });
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
