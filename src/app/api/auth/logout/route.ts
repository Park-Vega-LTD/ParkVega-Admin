import { NextRequest, NextResponse } from 'next/server'
import { apiHeaders } from '@/lib/forwarded'
import { API_URL } from '@/lib/api-url'
import { clearAuthCookies } from '@/lib/auth'
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/session-cookies'

/**
 * POST /api/auth/logout
 *
 * Reads the pv_admin_refresh cookie, calls POST /auth/logout on the REST API
 * with the refresh token (ignoring the result), always clears both auth
 * cookies, and returns 200.
 *
 * Requirements: 2.3
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value

  // Fire-and-forget: call REST API logout but ignore the result entirely.
  // We always clear cookies regardless of whether this succeeds or fails.
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiHeaders(request.headers),
          // With the bearer, the API blocklists the access token at once too.
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {
      // Intentionally ignored — logout must always succeed from the client's perspective
    }
  }

  const response = NextResponse.json({ success: true }, { status: 200 })
  clearAuthCookies(response)

  return response
}
