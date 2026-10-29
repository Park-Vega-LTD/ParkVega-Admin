import 'server-only'

/**
 * Tell the public website (parkvega-web) to drop its ISR cache after a staff
 * edit. The public site lives in a separate deployment, so it cannot be purged
 * with `revalidatePath` from here; it exposes POST /api/revalidate guarded by
 * a shared secret instead.
 *
 * Best effort: a failure only means the change appears once the public site's
 * 60-second revalidate window passes, so it is logged and never surfaced to
 * the editor.
 */
export async function revalidatePublicSite(): Promise<void> {
  const siteUrl = process.env.PUBLIC_SITE_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!siteUrl || !secret) return

  try {
    const res = await fetch(`${siteUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'x-revalidate-secret': secret },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) console.warn(`Public site revalidation failed: ${res.status}`)
  } catch (err) {
    console.warn('Public site revalidation failed', err)
  }
}
