import { NextResponse } from 'next/server'

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  accessMaxAge,
  baseCookieOptions,
  clearLegacyRefreshCookie,
} from '@/lib/session-cookies'

/**
 * Sets the pv_admin_access and pv_admin_refresh httpOnly cookies on a NextResponse.
 *
 * @param res - The NextResponse to set cookies on
 * @param accessToken - JWT access token
 * @param refreshToken - Opaque refresh token UUID
 * @param expiresIn - Access token expiry in seconds
 */
export function setAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): void {
  res.cookies.set(ACCESS_COOKIE, accessToken, { ...baseCookieOptions, maxAge: accessMaxAge(expiresIn) })
  // Site-wide so the proxy can refresh before any page or Route Handler runs.
  res.cookies.set(REFRESH_COOKIE, refreshToken, { ...baseCookieOptions, maxAge: REFRESH_MAX_AGE })
  clearLegacyRefreshCookie(res.headers)
}

/**
 * Clears both auth cookies from a NextResponse by setting maxAge=0.
 */
export function clearAuthCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, '', { ...baseCookieOptions, maxAge: 0 })
  res.cookies.set(REFRESH_COOKIE, '', { ...baseCookieOptions, maxAge: 0 })
  clearLegacyRefreshCookie(res.headers)
}
