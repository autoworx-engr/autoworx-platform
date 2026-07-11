import axios, { AxiosError } from "axios";
import { getSession, signOut } from "next-auth/react";

/**
 * Client-side axios instance for making authenticated API calls
 * Use this only in client components and client-side code
 */
const nextAxios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL + "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// === REQUEST INTERCEPTOR ===
nextAxios.interceptors.request.use(
  async (config) => {
    // This instance is meant for client components, but some server-side
    // code calls it too. next-auth/react's getSession() only works in the
    // browser, so on the server delegate to the same auth resolution
    // serverAxios uses instead of silently sending an unauthenticated
    // request.
    if (typeof window === "undefined") {
      const { getServerAuthHeaders } = await import("./server-auth");
      const data = config.data;
      const fallbackCompanyId =
        data && typeof data === "object" && typeof data.companyId === "number"
          ? data.companyId
          : undefined;

      const authHeaders = await getServerAuthHeaders(fallbackCompanyId);
      Object.assign(config.headers, authHeaders);
      return config;
    }

    const session = await getSession();
    const token = session?.accessToken || null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// === RESPONSE INTERCEPTOR ===
nextAxios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized, redirecting to login...");
      if (typeof window !== "undefined") {
        await signOut({
          callbackUrl: "/login",
        });
      }
    }

    return Promise.reject(error);
  },
);

export default nextAxios;
