import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse } from '@nutriai/shared';

interface User { id: string; email: string; role: string }

interface AuthState {
  accessToken:  string | null;
  refreshToken: string | null;
  user:         User | null;
  login:  (data: AuthResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken:  null,
      refreshToken: null,
      user:         null,

      login: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),

      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'nutriai-auth' },
  ),
);
