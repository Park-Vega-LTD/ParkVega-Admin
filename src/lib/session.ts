import 'server-only'

import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { ACCESS_COOKIE } from '@/lib/session-cookies'

const JWT_SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET)

import { canAccess } from '@/lib/roles'

export { canAccess, isStaffRole } from '@/lib/roles'

/** Claims from the verified `pv_admin_access` JWT, or null when signed out / invalid. */
export async function getSession(): Promise<{ userId: string; role: string } | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY)
    if (typeof payload.sub !== 'string' || typeof payload.role !== 'string') return null
    return { userId: payload.sub, role: payload.role }
  } catch {
    return null
  }
}

/** Role from the verified `pv_admin_access` JWT, or null when signed out / invalid. */
export async function getSessionRole(): Promise<string | null> {
  return (await getSession())?.role ?? null
}

/** Page guard: sends anyone whose role may not open `path` to the overview. */
export async function requireAccess(path: string): Promise<string> {
  const role = await getSessionRole()
  if (!canAccess(role, path)) redirect('/admin')
  return role as string
}
