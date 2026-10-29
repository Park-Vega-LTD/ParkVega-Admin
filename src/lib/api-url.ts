/**
 * Base URL of the Park Vega REST API, for server code only (Route Handlers,
 * Server Components, the proxy). Browser code calls this app's /api/* routes
 * instead, so the API origin never needs to reach the client bundle.
 *
 * PARK_VEGA_API_URL is preferred; NEXT_PUBLIC_API_URL is still read so
 * existing environments keep working.
 */
export const API_URL = (process.env.PARK_VEGA_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')
