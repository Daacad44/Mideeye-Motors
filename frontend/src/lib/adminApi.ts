import { http } from './http';
import type { AdminUser, Role, UserStatus } from '@/types/media';

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  actor: { name: string; email: string; role: Role } | null;
}

export const adminApi = {
  listUsers: (search?: string) =>
    http<{ data: AdminUser[] }>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createUser: (body: { name: string; email: string; password: string; role: Role }) =>
    http<{ data: AdminUser }>('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  setRole: (id: string, role: Role) =>
    http<{ data: AdminUser }>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  setStatus: (id: string, status: UserStatus) =>
    http<{ data: AdminUser }>(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  resetPassword: (id: string, password: string) =>
    http<{ ok: true }>(`/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
  deleteUser: (id: string) => http<{ ok: true }>(`/admin/users/${id}`, { method: 'DELETE' }),
  audit: () => http<{ data: AuditEntry[] }>('/admin/audit'),
};
