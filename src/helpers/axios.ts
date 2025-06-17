import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// === REQUEST INTERCEPTOR ===
// axiosInstance.interceptors.request.use(
//   (config) => {
//     const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// === RESPONSE INTERCEPTOR ===
// axiosInstance.interceptors.response.use(
//   (response) => response,
//   (error: AxiosError) => {
//     if (error.response?.status === 401) {
//       console.warn('Unauthorized, redirecting to login...');
//       if (typeof window !== 'undefined') {
//         localStorage.removeItem('token');
//         window.location.href = '/login';
//       }
//     }

//     return Promise.reject(error);
//   }
// );

export default axiosInstance;
