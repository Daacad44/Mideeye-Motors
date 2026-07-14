import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { http, setAccessToken, getAccessToken } from '@/lib/http';
import type { AuthUser, Role } from '@/types/media';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount (refresh cookie → access token → /me).
  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) {
          const r = await fetch(
            `${(import.meta.env.VITE_API_URL as string | undefined) ?? '/api'}/auth/refresh`,
            { method: 'POST', credentials: 'include' },
          );
          if (r.ok) setAccessToken((await r.json()).token);
        }
        if (getAccessToken()) {
          const me = await http<{ user: AuthUser }>('/auth/me');
          setUser(me.user);
        }
      } catch {
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await http<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(res.token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await http<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setAccessToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    await http('/auth/logout', { method: 'POST' }).catch(() => {});
    setAccessToken(null);
    setUser(null);
  };

  const hasRole = (...roles: Role[]) => !!user && roles.includes(user.role);
  const isStaff = !!user && ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'].includes(user.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, hasRole, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
