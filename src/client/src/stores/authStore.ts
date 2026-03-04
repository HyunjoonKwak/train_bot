import { create } from 'zustand';
import type { User } from '../types';
import { api, setOnUnauthorized } from '../api/client';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  fetchUser: async () => {
    try {
      const res = await api.get<User>('/auth/me');
      set({ user: res.data ?? null, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      set({ user: null });
      window.location.href = '/';
    }
  },
}));

// Clear auth state on any 401 response (session expired)
setOnUnauthorized(() => {
  useAuthStore.setState({ user: null });
});
