/**
 * Response shapes of the staff and admin endpoints that only the console
 * uses. Kept apart from `types/api.ts`, which is shared with parkvega-web.
 */

/** GET /admin/revenue. Money comes as decimal strings here. */
export interface RevenueReport {
  from: string;
  to: string;
  totalRevenue: string;
  totalBookings: number;
  breakdown: {
    ticketProductId: string | null;
    productName: string;
    quantitySold: number;
    revenueSubtotal: string;
  }[];
}

export type AccessRole = "user" | "staff" | "admin";

/** GET /staff, POST /staff, PATCH /staff/:id/role. */
export interface StaffMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  is_active: boolean;
  is_staff: boolean;
  role: AccessRole;
  /** False until the invitation has been accepted. */
  has_password: boolean;
  created_at: string;
}

/** POST /staff/:id/invite, and part of POST /staff. */
export interface StaffInvite {
  invite_url: string;
  invite_expires_at: string;
}

export type RefundStatus = "PENDING" | "COMPLETED" | "FAILED";

/** GET /refunds. */
export interface RefundRequest {
  id: string;
  status: RefundStatus;
  amount: number;
  booking_id: string;
  booking_code: string | null;
  visit_date: string | null;
  full_name: string | null;
  requested_by_email: string | null;
  approved_by: string | null;
  created_at: string;
}

export const FOOD_ORDER_STATUSES = ["placed", "preparing", "ready", "collected", "cancelled"] as const;
export type FoodOrderStatus = (typeof FOOD_ORDER_STATUSES)[number];

/** GET /food-orders. */
export interface FoodOrder {
  id: string;
  code: string;
  status: FoodOrderStatus;
  payment_status: "counter" | "pending" | "paid" | "failed";
  full_name: string;
  phone: string;
  whatsapp: string;
  email: string | null;
  pickup_date: string;
  pickup_time: string;
  notes: string | null;
  total: number;
  items: {
    menu_item_id: string;
    restaurant_id: string;
    restaurant_name: string;
    name: string;
    quantity: number;
    unit_price: number;
  }[];
  created_at: string;
}

/** GET /enquiries. */
export interface Enquiry {
  id: string;
  type: "birthday" | "school";
  name: string;
  whatsapp: string;
  email: string | null;
  date: string;
  guests: number | null;
  package: string | null;
  organisation: string | null;
  pupils: number | null;
  staff: number | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export type { PageImage } from "@/types/api";

/** GET /content/media. */
export interface MediaFile {
  id: string;
  filename: string | null;
  url: string | null;
  content_type: string | null;
}

/** Today's date in West Africa Time (UTC+1, no DST), as YYYY-MM-DD. */
export function todayWat(): string {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);
}
