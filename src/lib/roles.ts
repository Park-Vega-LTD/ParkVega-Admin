/**
 * Console access rules, shared by the login route, the proxy, the nav and the
 * page guards. Plain data and functions with no server imports so the proxy
 * can use them.
 *
 * Mirrors the REST API's @Roles() checks (park-vega-services):
 * - staff:      CMS content, events, attractions, enquiries, food orders,
 *               menu availability, gate check-in
 * - pos:        bookings, gate check-in, food orders, restaurants and menus
 * - cms:        website content, events, attractions, enquiries
 * - admin:      all of the above plus ticket products, revenue and refunds
 * - superadmin: everything, and the only role that manages staff accounts
 *
 * The API enforces these on every call regardless; this only decides which
 * screens each role sees.
 */

export const ROLES = ['user', 'staff', 'pos', 'cms', 'admin', 'superadmin'] as const
export type Role = (typeof ROLES)[number]
export type ConsoleRole = Exclude<Role, 'user'>

const CONSOLE_ROLES: readonly ConsoleRole[] = ['staff', 'pos', 'cms', 'admin', 'superadmin']

const CONTENT: readonly ConsoleRole[] = ['staff', 'cms', 'admin']
const OPERATIONS: readonly ConsoleRole[] = ['staff', 'pos', 'admin']

/**
 * Who may open each section, by path prefix. The longest matching prefix
 * wins. Superadmin may open every section, so it is never listed.
 */
export const SECTION_ROLES: Record<string, readonly ConsoleRole[]> = {
  '/admin': CONSOLE_ROLES,
  '/admin/settings': CONTENT,
  '/admin/blog': CONTENT,
  '/admin/events': CONTENT,
  '/admin/attractions': CONTENT,
  '/admin/content': CONTENT,
  '/admin/faqs': CONTENT,
  '/admin/page-images': CONTENT,
  '/admin/sections': CONTENT,
  '/admin/enquiries': CONTENT,
  '/admin/restaurants': OPERATIONS,
  '/admin/food-orders': OPERATIONS,
  '/staff/gate': OPERATIONS,
  '/staff': OPERATIONS,
  '/admin/bookings': ['pos', 'admin'],
  '/admin/ticket-products': ['admin'],
  '/admin/revenue': ['admin'],
  '/admin/analytics': ['admin'],
  '/admin/refunds': ['admin'],
  '/admin/staff': [],
}

function isUnder(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

/** Roles that may sign in to the console at all. */
export function isStaffRole(role: unknown): role is ConsoleRole {
  return CONSOLE_ROLES.includes(role as ConsoleRole)
}

/** Whether `role` may open the console page at `path`. */
export function canAccess(role: unknown, path: string): boolean {
  if (!isStaffRole(role)) return false
  if (role === 'superadmin') return true
  const prefix = Object.keys(SECTION_ROLES)
    .filter((p) => isUnder(path, p))
    .sort((a, b) => b.length - a.length)[0]
  // Pages outside every listed section are left to the API.
  return prefix ? SECTION_ROLES[prefix].includes(role) : true
}
