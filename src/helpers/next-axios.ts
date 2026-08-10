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
