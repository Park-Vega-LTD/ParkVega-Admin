"use client"

/**
 * Client-side fetch utility for calling BFF Route Handlers only.
 *
 * IMPORTANT: `clientFetch` must ONLY be called with `/api/...` BFF paths.
 * It must NEVER be used to call the REST API at (`API_URL`) directly.
 * All REST API communication from the browser must go through the BFF layer.
 */
export async function clientFetch<T>(
  bffPath: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(bffPath, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'same-origin', // sends cookies automatically
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `Request failed ${res.status}`)
  }

  // 204 responses (logout, staff deactivation) have no body at all.
  if (res.status === 204) return undefined as T

  // The data proxy passes REST responses through as `{ data, meta }`
  // envelopes; custom BFF routes (auth, payments) return plain objects.
  // Unwrap the envelope so callers always receive `T`.
  const body = await res.json()
  return (body !== null && typeof body === 'object' && 'data' in body ? body.data : body) as T
}
