import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

import { safeNextPath } from '@/lib/auth-redirect'
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  accessMaxAge,
  baseCookieOptions,
  clearLegacyRefreshCookie,
  refreshSession,
} from '@/lib/session-cookies'

const JWT_SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET)

// Staff (marketing, park team) manage the CMS. Customer data, money and
// access control stay admin-only.
export const ADMIN_ONLY = ['/admin/bookings', '/admin/revenue', '/admin/refunds', '/admin/staff']

function isUnder(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

function redirect(req: NextRequest, destination: string) {
  const url = req.nextUrl.clone()
  url.pathname = destination.split('?')[0]
  url.search = destination.includes('?') ? destination.split('?')[1] : ''
  return NextResponse.redirect(url)
}

async function roleFrom(token: string | undefined): Promise<string | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY)
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    // JWT invalid or expired
    return null
  }
}

/**
 * Runs before every page and BFF route and does two jobs:
 *
 * 1. Refreshes the session. When the access token is missing or expired but
 *    a refresh cookie remains, it rotates the pair once and writes it both to
 *    the response and to this request, so the page or Route Handler running
 *    now sees the new token. This is the only place that refreshes; see
 *    lib/session-cookies.ts for why.
 * 2. Gates pages: every page needs a staff or admin session except /login and
 *    /accept-invite,
 *    and the ADMIN_ONLY sections need admin. BFF routes under /api are left
 *    to the REST API, which enforces roles itself.
 */
export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  let token = req.cookies.get(ACCESS_COOKIE)?.value
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value
  let role = await roleFrom(token)

  let refreshed: { access: string; refresh: string; expiresIn: number } | null = null
  let clearSession = false

  if (!role && refreshToken) {
    const result = await refreshSession(refreshToken, req.headers)
    if (result.ok) {
      const { access_token, refresh_token, expires_in } = result.tokens
      refreshed = { access: access_token, refresh: refresh_token, expiresIn: expires_in }
      token = access_token
      role = await roleFrom(token)
      req.cookies.set(ACCESS_COOKIE, access_token)
      req.cookies.set(REFRESH_COOKIE, refresh_token)
    } else if (result.rejected) {
      clearSession = true
      req.cookies.delete(ACCESS_COOKIE)
      req.cookies.delete(REFRESH_COOKIE)
    }
  }

  const isStaff = role === 'staff' || role === 'admin'
  let response: NextResponse

  if (path.startsWith('/api/') || path === '/accept-invite') {
    // BFF routes are guarded by the API; the invite page is for people who
    // can't sign in yet.
    response = NextResponse.next({ request: { headers: req.headers } })
  } else if (path === '/login') {
    response = isStaff
      ? redirect(req, safeNextPath(req.nextUrl.searchParams.get('next')))
      : NextResponse.next({ request: { headers: req.headers } })
  } else if (!isStaff) {
    response = redirect(req, `/login?next=${encodeURIComponent(path)}`)
  } else if (ADMIN_ONLY.some((p) => isUnder(path, p)) && role !== 'admin') {
    response = redirect(req, '/admin')
  } else {
    // Passing the request headers on makes the cookies set above visible to
    // the Server Components handling this request.
    response = NextResponse.next({ request: { headers: req.headers } })
  }

  if (refreshed) {
    response.cookies.set(ACCESS_COOKIE, refreshed.access, {
      ...baseCookieOptions,
      maxAge: accessMaxAge(refreshed.expiresIn),
    })
    response.cookies.set(REFRESH_COOKIE, refreshed.refresh, {
      ...baseCookieOptions,
      maxAge: REFRESH_MAX_AGE,
    })
    clearLegacyRefreshCookie(response.headers)
  } else if (clearSession) {
    response.cookies.set(ACCESS_COOKIE, '', { ...baseCookieOptions, maxAge: 0 })
    response.cookies.set(REFRESH_COOKIE, '', { ...baseCookieOptions, maxAge: 0 })
    clearLegacyRefreshCookie(response.headers)
  }

  return response
}

export const config = {
  // Everything except Next.js internals and static files, so sessions refresh
  // before any page or BFF route runs.
  matcher: ['/((?!_next/|brand/|icon.png|apple-icon.png|favicon.ico|robots.txt).*)'],
}
