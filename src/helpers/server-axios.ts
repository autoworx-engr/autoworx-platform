import 'server-only';
import axios from 'axios';
import { getServerAuthHeaders } from './server-auth';

/**
 * Server-side axios instance for making authenticated API calls
 * Use this in server components, API routes, and server actions
 */
const createServerAxiosInstance = () => {
    const instance = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request interceptor to add auth headers
    instance.interceptors.request.use(
        async config => {
            const authHeaders = await getServerAuthHeaders();
            Object.assign(config.headers, authHeaders);
            return config;
        },
        error => Promise.reject(error)
    );

    // Response interceptor for error handling
    instance.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401) {
                console.error(
                    'Server-side unauthorized request:',
                    error.config?.url
                );
                // Note: Cannot redirect from server-side, handle this in your components
            }
            return Promise.reject(error);
        }
    );

    return instance;
};

export const serverAxios = createServerAxiosInstance();
