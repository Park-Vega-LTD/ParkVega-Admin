# Admin frontend extraction guide

How to move the staff and admin features out of the public website (`parkvega-web`) into a standalone frontend app (`parkvega-admin`), and how that sets up a later split into microservices. Read it alongside the frontend integration guide in the API repo (`park-vega-services/docs/frontend-integration-guide.md`), which covers the API's wire conventions, auth and errors. This guide only covers what is different for the staff console.

The split has been done. The console is the sibling repo `parkvega-admin`, and the matching removals are in `parkvega-web`. §4 describes how it was done; the status table below tracks what is still open.

## Status

| Item | State |
| --- | --- |
| `parkvega-admin` app: every admin page, the gate scanner, staff-only login, role guards, sign-out | Done. Builds, and the role guards were checked with test tokens |
| Public site cleanup: admin and staff code removed, `/admin` and `/staff` redirects, footer link, `/api/revalidate` | Done. Builds |
| Revalidation webhook from the console to the public site | Done |
| Committed to git | **Not yet.** `parkvega-admin` is a new repo with no commits, and the `parkvega-web` changes are uncommitted |
| Login tested against a running API | **Not yet.** Session handling was checked against a mock API that rotates tokens and detects reuse |
| Single-flight token refresh in both BFFs (§5) | Done. Proxy-only refresh, one shared call per refresh token |
| Public site's refresh cookie never reached its proxy (§5) | Done. Site-wide cookie; the old `/api/auth/` copy is cleared |
| Remove `html5-qrcode` from `parkvega-web/package.json` | Done |
| Configurable API CORS (§8) | Done: `CORS_ORIGINS`. Set it in production |
| Console screens: revenue, refunds, staff, food orders, enquiries, page images | Done. New API endpoints `GET /staff` and `GET /refunds` |
| Refund requests limited to the booking's own visitor | Done (API fix) |
| RBAC screen | Not built: permissions aren't enforced anywhere, so access is by role (integration guide §5) |
| Reactivating a deactivated staff account | Done: `PATCH /staff/:id/reactivate` and a console button |
| Staff set their own password | Done: one-time invite links (`POST /staff/:id/invite`, `POST /auth/accept-invite`) and an accept-invite page in the console |
| Email delivery | Not connected: the email worker only logs, so invite links are shared by copy or WhatsApp |
| Shared code moved into packages (§7) | Not started. Both apps have copies |

Contents

1. Why split
2. What moves and what stays
3. Target architecture
4. Step by step
5. Staff authentication
6. Keeping public pages fresh
7. Shared code
8. API changes
9. Road to microservices
10. Environment variables
11. Checklist

## 1. Why split

| Concern | One app today | Separate console |
| --- | --- | --- |
| Deploys | A CMS fix redeploys the public site | Each app ships on its own |
| Attack surface | Admin code and routes are bundled into the public origin | Admin lives on its own origin (`admin.parkvega.com`), which can be IP-restricted or put behind SSO |
| Bundle | Editors, the QR scanner (`html5-qrcode`) and dialogs sit in the public build | The public build only carries visitor code |
| Sessions | One `pv_access` cookie serves both visitors and staff | Staff sessions are separate cookies on a separate origin |
| Ownership | One codebase for marketing and operations | A clear boundary that can later line up with backend services |

## 2. What moves and what stays

All paths are under `parkvega-web/src`.

**Moves to `parkvega-admin`**

| Area | Files |
| --- | --- |
| Admin pages | `app/(dashboard)/admin/**`: overview, settings, blog, events, attractions, ticket products, restaurants, content, bookings |
| Staff pages | `app/(dashboard)/staff/**`: the gate scanner |
| Admin components | `components/parkvega/admin-*.tsx`, `components/parkvega/admin/*`, `gate-scanner.tsx`, `media-uploader.tsx` |
| Session helper | `lib/session.ts` (only the admin pages use it) |

**Shared by both apps** (copy it now, turn it into a package later, §7)

`types/api.ts`, `lib/{blog,events,attractions,site,public-data,home-content,utils,forwarded,api.client,api.server,auth}.ts`, the shadcn `components/ui/*` that the admin code imports, `components/parkvega/{logo,rich-text,event-calendar}.tsx`, `app/globals.css` and `public/brand/`.

To get the exact list, follow the imports out from the admin and staff route folders. A file that the admin code reaches but no public route reaches is admin-only, and can be deleted from the web app once it has been copied.

**Stays in `parkvega-web`**

The public pages, visitor auth (`/login`, `/register`), the visitor dashboard (`/my-bookings`, `/my-day`, `/account`, `/ticket`), checkout and the payment webhook.

**Links that cross the boundary**

| Where | Today | After |
| --- | --- | --- |
| `site-chrome.tsx` footer | `<Link href="/admin">Staff login</Link>` | `<a href={`${ADMIN_URL}/login`}>` |
| `dashboard-nav.tsx` | Hides itself on `/admin` | Remove the check |
| `proxy.ts` | Guards `/admin` and `/staff` by role | Remove those rules |
| Admin blog list | `href={`/blog/${slug}`}` | Absolute URL on the public site |
| `app/api/[...path]/route.ts` | `revalidatePath('/')` after staff writes | Replace with a webhook (§6) |

## 3. Target architecture

```
                    ┌────────────────────────┐
visitor ──────────► │ parkvega-web           │──┐
                    │ parkvega.com           │  │
                    └─────────▲──────────────┘  │
                              │ POST /api/revalidate (shared secret)
                    ┌─────────┴──────────────┐  │      ┌────────────────────┐
staff ────────────► │ parkvega-admin (BFF)   │──┼────► │ park-vega-services │
                    │ admin.parkvega.com     │  │      │ REST API           │
                    └────────────────────────┘  └────► └────────────────────┘
```

- Both apps are Next.js backends-for-frontends. Browser code only calls the app's own `/api/*`, and tokens stay in httpOnly cookies (integration guide §3).
- The REST API stays as it is. The API, not the frontend, is what enforces roles (integration guide §5). The console's own guards are only there for usability.
- The console has no public pages, so give every response `noindex` and `X-Frame-Options: DENY`.

## 4. Step by step

1. **Scaffold** `parkvega-admin` next to `parkvega-web`. Use the same Next.js version and copy `tsconfig.json`, `components.json`, `eslint.config.mjs`, `.gitignore` and the Tailwind/Turbopack setup. Run it on port 3001 locally (`next dev -p 3001`).
2. **Copy the code** listed in §2. Drop the `(dashboard)` route group, so the pages live at `app/admin/**` and `app/staff/**`. Keeping the `/admin/...` URLs means none of the internal links have to change.
3. **Add a root layout** with the brand fonts, `Providers` and `Toaster`, and `robots: { index: false }`. Add `app/page.tsx` that redirects to `/admin`.
4. **Add staff login.** Add `app/login` and the BFF routes `app/api/auth/login` and `app/api/auth/logout`. Login refuses any account that isn't staff or admin (§5).
5. **Add the guards.** Write `src/proxy.ts` so every page except `/login` needs a staff or admin JWT, and `/admin/bookings` needs admin. Re-check the role in `app/admin/layout.tsx` and `app/staff/layout.tsx`, redirecting to `/login`, not `/`.
6. **Copy the BFF proxy** `app/api/[...path]/route.ts`. Switch its cache purge to the webhook (§6).
7. **Extend the nav.** Add a "Gate scanner" link, a "View public site" link and a sign-out button.
8. **Clean up `parkvega-web`.** Delete the files that moved, then make the edits in the cross-links table (§2). Add redirects so old bookmarks keep working:
   ```ts
   // parkvega-web/next.config.ts
   async redirects() {
     const admin = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.parkvega.com';
     return [
       { source: '/admin/:path*', destination: `${admin}/admin/:path*`, permanent: false },
       { source: '/staff/:path*', destination: `${admin}/staff/:path*`, permanent: false },
     ];
   }
   ```
9. **Verify.** Run `tsc --noEmit` and `next build` in both apps. Then check access with a test login for each role (§11).

## 5. Staff authentication

The flow is the same as integration guide §4, with four differences.

**Refuse visitor accounts at login.** `POST /auth/login` succeeds for any role, so the console's login route has to check `user.role` itself. When the role is wrong, revoke the unused refresh token and return 403 without setting any cookies:

```ts
// parkvega-admin/src/app/api/auth/login/route.ts (after a successful /auth/login)
if (user.role !== 'staff' && user.role !== 'admin') {
  await fetch(`${API}/auth/logout`, { method: 'POST', headers, body: JSON.stringify({ refresh_token }) })
    .catch(() => undefined);
  return NextResponse.json({ message: 'This account does not have staff access.' }, { status: 403 });
}
```

**Use separate cookie names** (`pv_admin_access`, `pv_admin_refresh`). On different origins the cookies are host-only and can't collide. Locally, though, both apps run on `localhost`, and browsers share cookies across ports. Distinct names stop a staff login from turning into a visitor session on the public site, and the other way round.

**Make the refresh cookie site-wide.** The proxy refreshes before pages and Route Handlers run, so it has to see the refresh cookie on every path: `Path=/`. `parkvega-web` used to scope `pv_refresh` to `/api/auth/`, so its catch-all proxy never got it. Both apps now clear any copy left on the old path whenever they write new cookies, because a browser would send that stale copy first.

**Single-flight refreshes.** Refresh tokens rotate, and reuse is detected (integration guide §4). A CMS screen often sends several requests at once. If they all get a 401 and each one refreshes, the second refresh replays the old token, and the API revokes every session for that user. Both apps now refresh only in `proxy.ts`, before the request reaches the route (the pattern in `parkvega-web/docs/integration-kit/nextjs/middleware.ts`), through `lib/session-cookies.ts`, which shares one in-flight refresh per token. Server Components and the BFF proxy never refresh: a Server Component can't save the rotated token, so a refresh there would be replayed on the next request.

Other points:

- The console verifies the JWT with the same `JWT_SECRET` as the API, only to read `role` for its guards. The API still re-reads the role from the database on every call.
- Staff accounts created with `POST /staff` start without a password. The admin gets a one-time link (7 days) to send them; `/accept-invite` in the console sets the password, then they sign in. An existing website account can instead be promoted from the staff screen and keeps its password.
- Since the console has its own origin, it can later move to SSO (an OIDC provider) without touching visitor login.

## 6. Keeping public pages fresh

Public pages use ISR with `revalidate = 60`. When both apps were one, the BFF called `revalidatePath('/', 'layout')` after a staff write. A separate app can't purge another deployment's cache, so the public site needs a small webhook.

On the public site (`parkvega-web/src/app/api/revalidate/route.ts`):

```ts
export async function POST(request: NextRequest) {
  if (!secretMatches(request.headers.get('x-revalidate-secret'))) {   // timingSafeEqual
    return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
  }
  revalidatePath('/', 'layout');
  return NextResponse.json({ revalidated: true });
}
```

In the console's BFF proxy, after a non-GET request with a status under 300 to a public area (`content`, `events`, `attractions`, `ticket-products`, `restaurants`, `menu-items`):

```ts
await fetch(`${process.env.PUBLIC_SITE_URL}/api/revalidate`, {
  method: 'POST',
  headers: { 'x-revalidate-secret': process.env.REVALIDATE_SECRET! },
  signal: AbortSignal.timeout(3000),
}).catch((err) => console.warn('Public site revalidation failed', err));
```

This is best effort. If the call fails, the change still appears within 60 seconds, so never show the failure to the editor.

Later, the API can send this signal itself, for example as a `content.changed` event (§9). Then edits made by any client, including scripts and future apps, refresh the site.

## 7. Shared code

| Stage | How | When |
| --- | --- | --- |
| 1. Copy | Duplicate the shared files (§2) and list them in the console's README | Now. It's the fastest route and doesn't change the repo layout |
| 2. Monorepo | Move both apps into one repo (npm workspaces or Turborepo): `apps/web`, `apps/admin`, `packages/ui`, `packages/shared` | Once the copies start to drift |
| 3. Generated types | Generate `packages/api-types` from `docs/openapi.json` (`openapi-typescript`) rather than hand-writing `types/api.ts` | When the API is split into several services |

Rules that keep stage 2 cheap:

- Nothing in the shared files may import from `app/` or from components that only one app uses.
- Keep domain helpers (`lib/blog.ts`, `lib/events.ts`, `lib/attractions.ts`) free of Next.js imports, so they can become a plain package.
- `lib/site.ts` mixes contact constants and opening-day logic. Split it when you lift it into a package.

## 8. API changes

The API works with the console as it is. What to look at:

| Item | Change |
| --- | --- |
| CORS | Set `CORS_ORIGINS` to the real origins (`parkvega.com`, `www.parkvega.com`, `admin.parkvega.com`). Left empty, `main.ts` reflects any origin, which is meant for local development |
| New endpoints | `GET /staff?email=`, `GET /refunds?status=`, `POST /staff/:id/invite`, `PATCH /staff/:id/reactivate` (admin) and `POST /auth/accept-invite` (public) |
| `STAFF_CONSOLE_URL` | Set it to the console's origin; invitation links are built from it |
| `FRONTEND_ORIGINS` | Only payment redirects use it. The console never starts payments, so it doesn't need adding |
| `TRUST_PROXY_HOPS` | The console forwards `X-Forwarded-For` like the web app does, so nothing changes |
| Rate limits | Staff requests carry a bearer token, so the guest limits don't apply. `/auth/*` is still 10 per minute per IP, and staff at the park can share one IP |
| Swagger | Keep it off in production. The console doesn't need it |

## 9. Road to microservices

Splitting the frontend first gives each later backend split a client that is already separate.

**Phase 1: two frontends, one API.** This is the state this guide gets you to.

**Phase 2: one API, bounded contexts.** Group the existing NestJS modules into the domains they will become:

| Future service | Modules today | Main client |
| --- | --- | --- |
| Identity | `auth`, `users`, `staff`, `rbac` | both |
| Content (CMS) | `content`, `settings`, `attractions`, `events`, `restaurants` | admin writes, web reads |
| Ticketing and bookings | `ticket-products`, `bookings`, `tickets`, `refunds`, `admin` | web (buying), admin (gate, reports) |
| Payments | `payments` + adapters | web |
| Food | `food-orders` + menu items | web, kitchen board |
| Notifications | `notifications`, `queues` | internal only |

Remove direct imports between those groups (one module's service calling another's repository) and replace them with service interfaces or queue events. That decoupling is most of the work, whether or not you ever deploy the services separately.

**Phase 3: gateway, then extract.** Put an API gateway, or keep the BFFs in that role, in front of the API so clients see one base URL. Then move one domain at a time behind it. Content is usually the easiest first move: mostly CRUD, with few cross-domain writes. Each service owns its own tables. Share identities through JWT claims, not database joins.

**Phase 4: events.** Replace synchronous cross-service calls with events on the existing BullMQ/Redis setup, or on a broker: `booking.paid`, `ticket.checked_in`, `content.changed`. `content.changed` also takes over the revalidation webhook from §6.

Signs you are ready to split a service: it has its own team or release cadence, it needs different scaling (ticketing on peak days), or a failure in it shouldn't affect the rest (payments).

## 10. Environment variables

**parkvega-admin**

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | client + server | REST API base URL (same as the web app) |
| `NEXT_PUBLIC_PUBLIC_SITE_URL` | client | Public site origin, for "view on site" links |
| `JWT_SECRET` | server | Same value as the API, used to read `role` in the guards |
| `PUBLIC_SITE_URL` | server | Where to send the revalidation webhook |
| `REVALIDATE_SECRET` | server | Shared with `parkvega-web` |

**parkvega-web** (new)

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_ADMIN_URL` | client + server | Console origin, for the footer link and redirects (`http://localhost:3001` locally) |
| `REVALIDATE_SECRET` | server | Checks the console's webhook |

## 11. Checklist

- [ ] The console builds on its own (`next build`), and no admin-only file is left in `parkvega-web`
- [ ] A visitor login on the console gets 403 and no cookies
- [ ] Access by role:

  | Role | `/admin` | `/admin/bookings` | `/staff/gate` |
  | --- | --- | --- | --- |
  | none | → `/login` | → `/login` | → `/login` |
  | user | → `/login` | → `/login` | → `/login` |
  | staff | ✓ | → `/admin` | ✓ |
  | admin | ✓ | ✓ | ✓ |

- [ ] A signed-in staff member who opens `/login` is sent to `/admin`, and `?next=//evil.com` falls back to `/admin`
- [ ] A staff edit shows on the public site straight away, and a wrong secret gets 403 from `/api/revalidate`
- [ ] Old `parkvega.com/admin/...` links redirect to the console
- [ ] The console sends `X-Robots-Tag: noindex` and `X-Frame-Options: DENY`
- [ ] Refreshes are single-flight (§5) before the console goes live
- [ ] API CORS is locked to the two real origins
- [ ] `JWT_SECRET` and `REVALIDATE_SECRET` are set in both deployments
- [ ] Optional: the console origin is IP-allowlisted or behind SSO
