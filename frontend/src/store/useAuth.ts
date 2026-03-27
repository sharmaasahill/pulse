import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setAuthToken } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';

type UserData = {
  id: string;
  email: string;
  username: string;
  name: string;
};

type AuthState = {
  token?: string;
  user?: UserData;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: undefined,
      user: undefined,
      async login(data) {
        const response = await api.post('/auth/login', data);
        setAuthToken(response.data.token);
        set({ token: response.data.token, user: response.data.user });
      },
      async register(data) {
        const response = await api.post('/auth/register', data);
        setAuthToken(response.data.token);
        set({ token: response.data.token, user: response.data.user });
      },
      logout() {
        setAuthToken(undefined);
        disconnectSocket();
        set({ token: undefined, user: undefined });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
      // ← THIS is the key fix.
      // onRehydrateStorage fires the instant zustand-persist reads the token
      // from localStorage and restores it into the store.
      // We call setAuthToken here so the axios header is set BEFORE any
      // component's useEffect/useCallback can fire an API request.
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthToken(state.token);
        }
      },
    }
  )
);
