export interface PaginationMeta {
  total: number
  page: number
  perPage: number
  totalPages: number
}

export interface Envelope<T> {
  data: T
  meta: PaginationMeta
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone_number: string | null
  role: 'user' | 'staff' | 'admin'
  /** System-generated customer ID, e.g. "PVC-7K3Q9X2M". */
  customer_id?: string | null
  /** True for guest customers created by a no-login ticket purchase. */
  is_guest?: boolean
  created_at: string
}

export interface AttractionSchedule {
  id: string
  day_of_week: string
  open_time: string
  close_time: string
}

export interface Attraction {
  id: string
  name: string
  description: string | null
  category: string
  thrill_level: string | null
  height_requirement: string | null
  /** Who the ride suits, e.g. "Families with kids over 120cm" (brief §10). */
  who_it_suits?: string | null
  /** Safety precautions, one per line (brief §10). */
  safety_precautions?: string | null
  image_url: string | null
  status: 'ACTIVE' | 'INACTIVE'
  sort_order: number
  schedules: AttractionSchedule[]
}

export interface EventSession {
  id: string
  event_id: string
  session_date: string
  start_time: string
  capacity: number
  seats_available: number
}

export type EventCategory = 'SEASONAL' | 'HOLIDAY_OPENING' | 'PROMO' | 'PARTY'

export interface Event {
  id: string
  title: string
  description: string | null
  /** Marketing category; HOLIDAY_OPENING session dates also open the park. */
  category?: EventCategory | null
  image_url: string | null
  status: 'PUBLISHED' | 'CANCELLED' | 'DRAFT'
  sessions: EventSession[]
}

export interface PricingTier {
  id: string
  category: 'ADULT' | 'CHILD' | 'INFANT'
  price: number
  valid_from: string
  valid_to: string | null
}

export interface TicketProduct {
  id: string
  name: string
  description: string | null
  pricing_tiers: PricingTier[]
  active: boolean
}

export interface Booking {
  id: string
  code: string
  visit_date: string
  adults: number
  children: number
  ticket_product_id: string
  ticket_name: string | null
  unit_price: number
  total: number
  status: 'reserved' | 'pending_payment' | 'paid' | 'checked_in' | 'cancelled'
  /** Internal lifecycle state behind `status`, e.g. CONFIRMED or REFUND_PENDING. */
  state?: string
  email: string | null
  full_name: string
  phone: string | null
  customer_id?: string | null
  created_at: string
}

export interface Ticket {
  id: string
  booking_id: string
  ticket_code: string
  visitor_category: 'ADULT' | 'CHILD' | 'INFANT'
  status: 'ISSUED' | 'CHECKED_IN' | 'CANCELLED'
}

/** Printed menu labels besides "Popular", which is `popular`. */
export type MenuItemBadge = 'KIDS_SPECIAL' | 'BIG_APPETITE' | 'FAMILY_FAVOURITE'

export interface MenuItem {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  price: number
  category: string
  popular: boolean
  badges: MenuItemBadge[]
  /** What a combo comes with, in order; empty for single items. */
  includes: string[]
  /** Dish photo, usually on res.cloudinary.com. */
  image_url: string | null
  allergens: string[]
  active: boolean
}

export interface Restaurant {
  id: string
  name: string
  description: string | null
  category: string
  location: string | null
  opening_hours: string | null
  dietary_info: string | null
  active: boolean
}

export interface ContentPage {
  id: string
  slug: string
  title: string
  /** Markdown-lite body: blank lines split paragraphs, "## " headings, "- " lists. */
  body: string
  excerpt?: string | null
  cover_image_url?: string | null
  status?: 'DRAFT' | 'PUBLISHED'
  published_at?: string | null
  seo_title?: string | null
  seo_description?: string | null
  updated_at: string
}

/** Staff-editable homepage and visit settings (`GET/PUT /content/settings`). */
export interface SiteSettings {
  /** Overrides the "Tickets from" price; null uses the lowest ticket price. */
  ticket_price_from: number | null
  opening_days: string
  opening_hours: string
  /** Mon–Wed public holidays (YYYY-MM-DD) when the park also opens. */
  extra_open_dates: string[]
  hero_video_url: string | null
  hero_image_url: string | null
  /** Optional announcement shown in the site's top bar. */
  notice: string | null
}

/** A visitor's itinerary for one visit date (`POST /plans`). */
export interface VisitorPlan {
  id: string
  visit_date: string
}

/** One stop on a plan (`GET /plans?visitDate=`), ordered by start time. */
export interface ItineraryItem {
  id: string
  plan_id: string
  type: 'ATTRACTION' | 'RESTAURANT' | 'EVENT'
  reference_id: string
  /** HH:MM:SS time of day. */
  start_time: string
  note: string | null
}

export interface FAQ {
  id: string
  question: string
  answer: string
  sort_order: number
}

/** GET /content/page-images?page_key=…: a photo in a named spot on a page, e.g. home/hero. */
export interface PageImage {
  id: string
  page_key: string
  slot: string
  position: number
  media_file_id: string
  url: string
  alt_text: string
  content_type: string
}
