/**
 * Authenticated fetch wrapper.
 * - Attaches the in-memory access token as a Bearer header.
 * - On 401, transparently tries one refresh (httpOnly cookie) then retries.
 */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

let accessToken: string | null = localStorage.getItem('mm_token');

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem('mm_token', token);
  else localStorage.removeItem('mm_token');
}
export const getAccessToken = () => accessToken;

async function refresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok) return false;
    const json = await res.json();
    setAccessToken(json.token);
    return true;
  } catch {
    return false;
  }
}

export async function http<T = unknown>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (!(init.body instanceof FormData) && init.body) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && retry && (await refresh())) {
    return http<T>(path, init, false);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.formErrors?.join?.(', ') || body.error || `Request failed (${res.status})`);
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
        let msg = `Upload failed (${xhr.status})`;
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch { /* ignore */ }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(form);
  });
}
