const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getTokens() {
  try {
    const raw = localStorage.getItem('nutriai-auth');
    if (!raw) return { accessToken: null, refreshToken: null };
    return JSON.parse(raw) as { state: { accessToken: string | null; refreshToken: string | null } };
  } catch {
    return { state: { accessToken: null, refreshToken: null } };
  }
}

function getAccessToken(): string | null {
  const stored = getTokens();
  if ('state' in stored) return stored.state.accessToken;
  return null;
}

async function tryRefresh(): Promise<string | null> {
  const stored = getTokens();
  const refreshToken = 'state' in stored ? stored.state.refreshToken : null;
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { accessToken: string; refreshToken: string };
    // Update localStorage directly to avoid circular dependency with Zustand
    const raw = localStorage.getItem('nutriai-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.state.accessToken  = data.accessToken;
      parsed.state.refreshToken = data.refreshToken;
      localStorage.setItem('nutriai-auth', JSON.stringify(parsed));
    }
    return data.accessToken;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const token = getAccessToken();
  const res   = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !retried) {
    const newToken = await tryRefresh();
    if (newToken) return request<T>(path, options, true);
    // Clear auth state and let ProtectedRoute redirect
    localStorage.removeItem('nutriai-auth');
    window.location.href = '/login';
    throw new ApiError(401, 'Sesión expirada');
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({ error: { message: 'Error de red' } }));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.message ?? 'Error inesperado',
      body?.error?.code,
    );
  }

  return body as T;
}

export const api = {
  get:    <T>(path: string)                          => request<T>(path, { method: 'GET' }),
  post:   <T>(path: string, body: unknown)           => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)           => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)           => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                          => request<T>(path, { method: 'DELETE' }),

  // SSE streaming — returns the raw Response for manual stream reading
  stream: (path: string, body: unknown): Promise<Response> => {
    const token = getAccessToken();
    return fetch(`${API_BASE}${path}`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  },
};
