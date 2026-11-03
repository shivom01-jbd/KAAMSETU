import { z } from "zod";
import { bookingStatuses } from "@/lib/bookings/transitions";

const empty = (v: unknown) => (v === "" || v == null ? undefined : v);
const round2 = (n: number | undefined) => (n == null ? undefined : Math.round(n * 100) / 100);

/** <input type="datetime-local"> has no zone: treat it as India time (IST, +05:30). */
const preferredAt = z
  .preprocess(
    (v) =>
      typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? `${v}:00+05:30` : v,
    z.string().datetime({ offset: true }),
  )
  .refine((v) => {
    const t = Date.parse(v);
    return t > Date.now() && t < Date.now() + 365 * 24 * 3600 * 1000;
  });

// customer_id is never read from the form: the database uses the signed-in user.
export const createBookingSchema = z
  .object({
    professional_id: z.string().uuid(),
    description: z.string().trim().min(10).max(1000),
    preferred_at: preferredAt,
    area_label: z.preprocess(empty, z.string().trim().max(80).optional()),
    approx_lat: z.preprocess(empty, z.coerce.number().min(6).max(38).optional()).transform(round2),
    approx_lng: z.preprocess(empty, z.coerce.number().min(68).max(98).optional()).transform(round2),
  })
  .refine((v) => (v.approx_lat == null) === (v.approx_lng == null), { path: ["approx_lat"] });

export const transitionSchema = z.object({
  booking_id: z.string().uuid(),
  to: z.enum(bookingStatuses),
  reason: z.preprocess(empty, z.string().trim().max(300).optional()),
});
