/**
 * Authenticated fetch wrapper.
 * - Attaches the in-memory access token as a Bearer header.
 * - On 401, transparently tries one refresh (httpOnly cookie) then retries.
 * - Converts network failures + status codes into MEANINGFUL messages
 *   (never a raw "Failed to fetch").
 */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

let accessToken: string | null = localStorage.getItem('mm_token');

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem('mm_token', token);
  else localStorage.removeItem('mm_token');
}
export const getAccessToken = () => accessToken;

/** Error carrying the HTTP status + parsed body so callers can branch on it
 * (e.g. a 409 "image in use" response includes `usedBy`/`blocked` details). */
export class ApiError extends Error {
  status: number;
  body?: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Turn a server error body into a human-readable string. */
function messageFromBody(body: unknown, status: number): string {
  const err = (body as { error?: unknown })?.error;
  if (typeof err === 'string') return err;

  // Zod flatten: { formErrors: [], fieldErrors: { field: [msg] } }
  const z = err as { formErrors?: string[]; fieldErrors?: Record<string, string[]> } | undefined;
  if (z) {
    const parts = [
      ...(z.formErrors ?? []),
      ...Object.entries(z.fieldErrors ?? {}).map(([k, v]) => `${k}: ${v?.join?.(', ')}`),
    ].filter(Boolean);
    if (parts.length) return parts.join(' · ');
  }

  switch (status) {
    case 400: return 'Please check the details you entered.';
    case 401: return 'Invalid email or password.';
    case 403: return 'You don’t have permission to do that.';
    case 404: return 'Not found.';
    case 409: return 'That already exists.';
    case 429: return 'Too many attempts. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503: return 'Server error. Please try again shortly.';
    default: return `Request failed (${status}).`;
  }
}

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, init);
  } catch {
    // fetch rejects (TypeError "Failed to fetch") on DNS/CORS/offline/server-down.
    throw new ApiError(
      'Network connection failed — cannot reach the server. Please check your connection or ensure the API is running.',
      0,
    );
  }
}

async function refresh(): Promise<boolean> {
  try {
    const res = await rawFetch('/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) return false;
    setAccessToken((await res.json()).token);
    return true;
  } catch {
    return false;
  }
}

export async function http<T = unknown>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const res = await rawFetch(path, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && retry && (await refresh())) {
    return http<T>(path, init, false);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = res.status === 401 && !retry ? 'Your session has expired. Please sign in again.' : messageFromBody(body, res.status);
    throw new ApiError(msg, res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Upload with progress via XHR (fetch has no upload progress). */
export function uploadWithProgress<T = unknown>(
  path: string,
  form: FormData,
  onProgress?: (pct: number) => void,
  method = 'POST',
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${API_URL}${path}`);
    xhr.withCredentials = true;
    if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText ? JSON.parse(xhr.responseText) : (undefined as T));
      } else {
        let body: unknown = {};
        try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
        reject(new ApiError(messageFromBody(body, xhr.status), xhr.status, body));
      }
    };
    xhr.onerror = () =>
      reject(new ApiError('Network connection failed during upload. Please try again.', 0));
    xhr.send(form);
  });
}
