# Park Vega Admin

Staff console for Park Vega: CMS (homepage, blog, events, attractions, ticket
products, restaurants, pages & media), admin-only bookings, and the gate
scanner. Extracted from `parkvega-web` so it can be built, deployed and
secured on its own (e.g. `admin.parkvega.com`).

API conventions, auth and the endpoint list are in the API repo:
`park-vega-services/docs/frontend-integration-guide.md` (§3.1 covers this
app). Why and how it was split out, and the road to microservices, are in
`park-vega-services/docs/admin-frontend-extraction-guide.md`.

## Running

```bash
cp .env.local.example .env.local   # then fill in the values
npm install
npm run dev                        # http://localhost:3001
```

The public site runs on port 3000, the console on 3001, the API wherever
`PARK_VEGA_API_URL` points.

## How it fits together

```
browser ──► parkvega-admin (Next.js BFF) ──► park-vega-services (REST API)
                     │
                     └─ POST /api/revalidate ──► parkvega-web (purges ISR cache)
```

- **Auth** — `/login` posts to `/api/auth/login`, which only issues a session
  for `staff` and `admin` accounts. Tokens live in httpOnly cookies
  (`pv_admin_access`, `pv_admin_refresh`) that are separate from the public
  site's `pv_access`, so a staff session never leaks into the visitor site.
- **Sessions** — `src/proxy.ts` is the only place that refreshes tokens, once
  per refresh token even when requests arrive together
  (`src/lib/session-cookies.ts`). Server Components and the BFF proxy treat a
  401 as the end of the session.
- **Guards** — `src/proxy.ts` sends anyone without a staff/admin JWT to
  `/login`, and keeps the `ADMIN_ONLY` screens admin-only. Layouts re-check as
  defence-in-depth; the REST API enforces roles on every call regardless.
- **Data** — browser code calls `/api/*`, the catch-all route forwards to the
  REST API with the bearer token and an `X-Correlation-ID`. Server Components use
  `serverFetch` from `src/lib/api.server.ts`.
- **Public cache** — after a successful write to public content
  (`content`, `events`, `attractions`, `ticket-products`, `restaurants`,
  `menu-items`) the BFF calls the public site's `/api/revalidate` with
  `REVALIDATE_SECRET`.

## Routes

| Path | Who |
| --- | --- |
| `/admin` … `/admin/content`, `/admin/page-images`, `/admin/food-orders`, `/admin/enquiries` | staff, admin |
| `/admin/bookings`, `/admin/revenue`, `/admin/refunds`, `/admin/staff` | admin |
| `/staff/gate` | staff, admin |
| `/login`, `/accept-invite` | everyone |

## Code shared with parkvega-web

These files were copied from `parkvega-web` and must stay in step with it
until they move into a shared package:

- `src/types/api.ts` — API types
- `src/lib/{blog,events,attractions,site,public-data,home-content,utils,forwarded,api.client,api.server}.ts`
- `src/components/ui/*`, `src/components/parkvega/{logo,rich-text,event-calendar}.tsx`
- `src/app/globals.css` — brand theme

When the apps move into one monorepo, lift these into e.g. `packages/shared`
and `packages/ui`.
