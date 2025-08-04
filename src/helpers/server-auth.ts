import { authOptions } from '@/authOptions';
import { getServerSession } from 'next-auth';
import 'server-only';

/**
 * Get the access token from server session
 * Use this in server components, API routes, and server actions
 */
export async function getServerAccessToken(): Promise<string | null> {
    try {
        const session = await getServerSession(authOptions);
        return session?.accessToken || null;
    } catch (error) {
        console.error('Failed to get server session:', error);
        return null;
    }
}

/**
 * Get authorization headers for server-side API calls
 * Returns headers object with Authorization header if token exists
 */
export async function getServerAuthHeaders(): Promise<Record<string, string>> {
    const token = await getServerAccessToken();

    const baseHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        baseHeaders.Authorization = `Bearer ${token}`;
    }

    return baseHeaders;
}

/**
 * Create axios config with authentication for server-side requests
 */
export async function createServerAxiosConfig(
    additionalHeaders?: Record<string, string>
) {
    const authHeaders = await getServerAuthHeaders();

    return {
        headers: {
            ...authHeaders,
            ...additionalHeaders,
        },
    };
}
