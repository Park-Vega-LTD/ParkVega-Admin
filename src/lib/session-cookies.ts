import { API_URL } from '@/lib/api-url'

/**
 * Session cookies and the token refresh, shared by the proxy and Route
 * Handlers. Nothing here may import `server-only` or `next/headers`.
 *
 * Only the proxy refreshes. The API rotates refresh tokens and treats a
 * reused one as theft, revoking every session for that user. A Server
 * Component can't write cookies, so a refresh during a render would lose the
 * rotated token and the next request would replay the old one. The proxy runs
 * before every page and Route Handler and can write cookies.
 */

export const ACCESS_COOKIE = 'pv_admin_access'
export const REFRESH_COOKIE = 'pv_admin_refresh'

/** Matches the API's default JWT_REFRESH_EXPIRES of 7d. */
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60

export const baseCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
}

/**
 * Before the proxy took over refreshing, pv_admin_refresh lived on /api/.
 * Browsers may still hold that copy and would send it ahead of the new one on
 * /api/* requests, so every write of new cookies also clears it.
 * `cookies.set` keeps one entry per name, hence a raw Set-Cookie header.
 */
export function clearLegacyRefreshCookie(headers: Headers): void {
  headers.append('Set-Cookie', `${REFRESH_COOKIE}=; Path=/api/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`)
}

/**
 * The access cookie expires a minute before its token, so a present cookie
 * always holds a usable token and a missing one means "refresh".
 */
export function accessMaxAge(expiresIn: number): number {
  return Math.max(expiresIn - 60, 30)
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  expires_in: number
}

export type RefreshResult =
  | { ok: true; tokens: TokenPair }
  /** The refresh token was rejected: clear the session. */
  | { ok: false; rejected: true }
  /** Network or server error: keep the cookies and try again later. */
  | { ok: false; rejected: false }

// Requests that arrive together carry the same refresh token. Sharing one
// in-flight call, and its result for a short while, stops them from each
// refreshing and tripping reuse detection. This is per server instance: with
// several instances, route a session to one instance or share this map
// through Redis.
const inFlight = new Map<string, Promise<RefreshResult>>()
const RESULT_TTL_MS = 30_000

export function refreshSession(refreshToken: string, incoming: Headers): Promise<RefreshResult> {
  const existing = inFlight.get(refreshToken)
  if (existing) return existing

  const promise = callRefresh(refreshToken, incoming)
  inFlight.set(refreshToken, promise)
  promise.finally(() => {
    setTimeout(() => inFlight.delete(refreshToken), RESULT_TTL_MS)
  })
  return promise
}

async function callRefresh(refreshToken: string, incoming: Headers): Promise<RefreshResult> {
  // /auth is limited to 10 requests a minute per IP, so pass the visitor's on.
  const chain = incoming.get('x-forwarded-for') ?? incoming.get('x-real-ip')
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': crypto.randomUUID(),
        ...(chain ? { 'X-Forwarded-For': chain } : {}),
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    })
    if (res.status === 401) return { ok: false, rejected: true }
    if (!res.ok) return { ok: false, rejected: false }
    const body = (await res.json()) as { data: TokenPair }
    return { ok: true, tokens: body.data }
  } catch {
    return { ok: false, rejected: false }
  }
}
