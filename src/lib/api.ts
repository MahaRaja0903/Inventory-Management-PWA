import { AuthUser } from "../types";

const BASE_URL = "/api";

export function getAuthToken(): string | null {
  return localStorage.getItem("aquarius_access_token");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("aquarius_refresh_token");
}

export function getRememberedUser(): AuthUser | null {
  const userJson = localStorage.getItem("aquarius_user");
  try {
    return userJson ? JSON.parse(userJson) : null;
  } catch {
    return null;
  }
}

export function saveAuthentication(accessToken: string, refreshToken: string, user: AuthUser): void {
  localStorage.setItem("aquarius_access_token", accessToken);
  localStorage.setItem("aquarius_refresh_token", refreshToken);
  localStorage.setItem("aquarius_user", JSON.stringify(user));
}

export function clearAuthentication(): void {
  localStorage.removeItem("aquarius_access_token");
  localStorage.removeItem("aquarius_refresh_token");
  localStorage.removeItem("aquarius_user");
}

function expireSession(): void {
  clearAuthentication();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-expired"));
  }
}

/**
 * Exchange the refresh token for a new access token.
 *
 * The endpoint has always existed but nothing ever called it, so a session simply
 * died after a day. Concurrent 401s share one in-flight refresh rather than each
 * firing their own.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const token = getRefreshToken();
    if (!token) return false;

    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (!data.accessToken) return false;

      localStorage.setItem("aquarius_access_token", data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem("aquarius_refresh_token", data.refreshToken);
      }
      return true;
    } catch {
      return false;
    } finally {
      // Clear on the next tick so callers awaiting this promise still see the result.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

function buildHeaders(options: RequestInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export class ApiError extends Error {
  status: number;
  /** The parsed response body, so callers can act on details such as a duplicate record. */
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(options),
  });

  // A 401 means the access token is dead. Try one silent refresh before giving up.
  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: buildHeaders(options),
      });
    }

    if (!refreshed || response.status === 401) {
      expireSession();
      throw new ApiError("Session expired. Please log in again.", 401, null);
    }
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message || "An unexpected error occurred",
      response.status,
      data
    );
  }

  return data as T;
}
