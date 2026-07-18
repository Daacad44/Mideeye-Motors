import { http } from './http';

export const authApi = {
  forgotPassword: (email: string) =>
    http<{ ok: true }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token: string, password: string) =>
    http<{ ok: true }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
};
