import { cookies } from "next/headers";

type FetchOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined | null>;
};

/**
 * A wrapper around native `fetch` specifically for Server Components.
 * Automatically injects cookies, Base URL, Content-Type, and builds search parameters.
 */
export async function serverFetch(
  endpoint: string,
  options: FetchOptions = {},
) {
  const { params, headers, ...restOptions } = options;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000";

  let url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  // Get all cookies to forward authentication context.
  // Note: this function requires next/headers and should only be used in Server Components.
  const cookieStore = await cookies();
  const cookiesString = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (cookiesString) {
    defaultHeaders["Cookie"] = cookiesString;
  }

  const response = await fetch(url, {
    cache: "no-store", // Default to no-store for dynamic data fetching
    ...restOptions,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  return response;
}

/**
 * A wrapper around `serverFetch` that also calls `.json()` automatically
 * and potentially checks `response.ok`.
 */
export async function serverFetchJson<T = any>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<{ response: Response; data: T }> {
  const response = await serverFetch(endpoint, options);

  const data = await response.json().catch(() => null);

  return {
    response,
    data,
  };
}
