/**
 * Visitor IP headers to pass on to the REST API.
 *
 * Every BFF request reaches the API from this server, so without these the
 * API's per-IP rate limits (e.g. 30/min on guest booking lookups) would be
 * shared by all visitors. The incoming `X-Forwarded-For` chain is passed
 * through unchanged: its last entry is the address our host saw, which the
 * API reads with `TRUST_PROXY_HOPS=1`.
 */
export function forwardedFor(incoming: Headers): Record<string, string> {
  const chain = incoming.get('x-forwarded-for') ?? incoming.get('x-real-ip')
  return chain ? { 'X-Forwarded-For': chain } : {}
}

/**
 * Headers for every call to the REST API: the visitor's IP chain plus an
 * `X-Correlation-ID`. The incoming ID is reused when the browser sent one, so
 * one ID follows a request from the BFF into the API logs.
 */
export function apiHeaders(incoming: Headers): Record<string, string> {
  return {
    ...forwardedFor(incoming),
    'X-Correlation-ID': incoming.get('x-correlation-id') ?? crypto.randomUUID(),
  }
}
