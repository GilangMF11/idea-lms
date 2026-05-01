import { get } from 'svelte/store';
import { authStore } from './stores/auth.js';

export class ApiClientError extends Error {
  public status: number;
  public data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Reusable fetch wrapper that automatically injects the Authorization header
 * and handles common response processing.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const { token } = get(authStore);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Merge headers appropriately
  const mergedHeaders = {
    ...headers,
    ...(options.headers as Record<string, string> || {})
  };

  // If body is FormData, we need to let the browser set the Content-Type with boundary
  if (options.body instanceof FormData) {
    delete mergedHeaders['Content-Type'];
  }

  return fetch(endpoint, {
    ...options,
    headers: mergedHeaders
  });
}

/**
 * Helper to perform an apiFetch and automatically parse JSON and throw on error.
 */
export async function apiFetchJson<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(endpoint, options);
  
  const isJson = response.headers.get('content-type')?.includes('application/json');
  let data;
  
  if (isJson) {
    data = await response.json();
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `API request failed with status ${response.status}`;
    throw new ApiClientError(response.status, message, data);
  }

  return data as T;
}
