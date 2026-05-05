import { api } from './client';
import type { AuthResponse } from '@nutriai/shared';

export const authApi = {
  register: (email: string, password: string) =>
    api.post<AuthResponse>('/api/v1/auth/register', { email, password }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/api/v1/auth/login', { email, password }),

  logout: (refreshToken: string) =>
    api.post<void>('/api/v1/auth/logout', { refreshToken }),
};
