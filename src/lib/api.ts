const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ── Session helpers ───────────────────────────────────────────
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminRefreshToken");
}

// ── Token refresh ─────────────────────────────────────────────
let _refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // Évite les appels parallèles de refresh
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        // Refresh expiré ou révoqué → déconnexion forcée
        clearSession();
        if (typeof window !== "undefined") window.location.href = "/login";
        return null;
      }

      const data = await res.json();
      const newToken = data.accessToken || data.token;
      localStorage.setItem("adminToken", newToken);
      if (data.refreshToken) {
        localStorage.setItem("adminRefreshToken", data.refreshToken);
      }
      return newToken;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// ── Core request ──────────────────────────────────────────────
async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Token expiré → on tente un refresh automatique (une seule fois)
  if (res.status === 401 && retry) {
    const data = await res.json().catch(() => ({}));

    if (data.code === "TOKEN_EXPIRED") {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Relancer la requête originale avec le nouveau token
        return request<T>(path, options, false);
      }
    }

    // Toute autre 401 → déconnexion
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expirée");
  }

  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Erreur API");
  return body;
}

// ── Public API ────────────────────────────────────────────────
export const api = {
  get:    <T>(path: string)                  => request<T>(path),
  post:   <T>(path: string, body: unknown)   => request<T>(path, { method: "POST",   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)   => request<T>(path, { method: "PATCH",  body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)   => request<T>(path, { method: "PUT",    body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown)  => request<T>(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
};

// ── Session management ────────────────────────────────────────
export const saveSession = (token: string, admin: object, refreshToken?: string) => {
  localStorage.setItem("adminToken", token);
  localStorage.setItem("adminUser", JSON.stringify(admin));
  if (refreshToken) {
    localStorage.setItem("adminRefreshToken", refreshToken);
  }
};

export const clearSession = () => {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminRefreshToken");
  localStorage.removeItem("adminUser");
};

export const getAdmin = () => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("adminUser");
  return raw ? JSON.parse(raw) : null;
};

export const isAuthenticated = () => {
  if (typeof window === "undefined") return false;
  const token = getToken();
  if (!token) return false;

  // Vérification légère de l'expiration côté client (sans secret)
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token expiré : on vérifie si un refresh token est dispo
      return !!getRefreshToken();
    }
    return true;
  } catch {
    return false;
  }
};