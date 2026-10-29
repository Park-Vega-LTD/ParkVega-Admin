import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { API_URL } from '@/lib/api-url'
import { forwardedFor } from '@/lib/forwarded'
import { ACCESS_COOKIE } from '@/lib/session-cookies'
import type { PaginationMeta } from '@/types/api'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export class AuthError extends Error {
  constructor(message = 'Unauthenticated') {
    super(message)
  }
}

type Envelope<T> = { data: T; meta: PaginationMeta }

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
  extraHeaders: Record<string, string> = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.message ?? `API error ${res.status}`)
  }

  const envelope: Envelope<T> = await res.json()
  return envelope.data
}

/**
 * Fetch public, non-personalised data. It never reads cookies, so pages that
 * use it stay statically cached (ISR) instead of hitting the API per request.
 * It sends no correlation ID either: headers are part of Next's fetch cache
 * key, so a fresh ID per call would defeat the cache.
 */
export async function publicFetch<T>(path: string, options?: RequestInit): Promise<T> {
  return apiFetch<T>(path, options)
}

/** One correlation ID per server request, so identical fetches still de-duplicate. */
const requestCorrelationId = cache(() => crypto.randomUUID())

/**
 * Fetch with the staff session. The proxy has already refreshed an
 * expired session before this render started, and a Server Component can't
 * write cookies, so a 401 here is final: it throws AuthError.
 */
export async function serverFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value
  const incoming = await headers()
  const extra = {
    ...forwardedFor(incoming),
    'X-Correlation-ID': incoming.get('x-correlation-id') ?? requestCorrelationId(),
  }

  try {
    return await apiFetch<T>(path, options, accessToken, extra)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) throw new AuthError()
    throw err
  }
}
