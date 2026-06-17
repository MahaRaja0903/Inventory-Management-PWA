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

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Attempt automatic refresh or signout
    clearAuthentication();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth-expired"));
    }
    throw new Error("Session expired. Please log in again.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "An unexpected error occurred");
  }

  return data as T;
}
