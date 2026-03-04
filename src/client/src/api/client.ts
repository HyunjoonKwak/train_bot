import type { ApiResponse } from '../types';

const BASE_URL = '/api';

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const { headers: customHeaders, ...restOptions } = options ?? {};
  const res = await fetch(`${BASE_URL}${url}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...customHeaders,
    },
    credentials: 'include',
  });

  if (res.status === 401) {
    onUnauthorized?.();
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.');
  }

  return data;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
