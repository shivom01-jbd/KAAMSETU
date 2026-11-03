import { z } from "zod";

const empty = (v: unknown) => (v === "" || v == null ? undefined : v);

// sender_id and reviewer_id are never read from the form: the database uses the signed-in user.
export const sendMessageSchema = z.object({
  booking_id: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

export const reviewSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.preprocess(empty, z.string().trim().max(1000).optional()),
});

export const reportSchema = z.object({
  target_type: z.enum(["review", "message", "profile"]),
  target_id: z.string().trim().min(1).max(64),
  reason: z.string().trim().min(5).max(500),
});
