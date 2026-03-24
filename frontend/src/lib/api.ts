import axios from 'axios';
import { useAuth } from '@/store/useAuth';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
});

// A dummy function just to satisfy existing imports. We don't use defaults anymore.
export function setAuthToken(token?: string) {
  // Ignored - the interceptor handles it dynamically now.
}

api.interceptors.request.use((config) => {
  let token = null;

  // 1. Try to get it from zustand first (fastest, most accurate)
  token = useAuth.getState().token;

  // 2. If zustand is hydrating, fallback to reading raw localStorage
  if (!token && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('auth-storage');
      if (raw) {
        token = JSON.parse(raw)?.state?.token;
      }
    } catch { /* ignore */ }
  }

  // 3. Apply standard Axios 1.x Headers.set
  if (token) {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else if (config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return config;
});
