import { z } from "zod";

const empty = (v: unknown) => (v === "" || v == null ? undefined : v);
const bool = z.preprocess((v) => v === "true" || v === "on" || v === true, z.boolean());

export const verificationSchema = z.object({
  user_id: z.string().uuid(),
  status: z.enum(["unverified", "verified", "rejected"]), // "pending" is set only by the professional's own request
});
export const suspendSchema = z.object({
  user_id: z.string().uuid(),
  suspended: bool,
  note: z.preprocess(empty, z.string().trim().max(500).optional()),
});
export const resolveReportSchema = z.object({
  report_id: z.string().uuid(),
  status: z.enum(["reviewed", "dismissed"]),
  hide: bool,
  note: z.preprocess(empty, z.string().trim().max(500).optional()),
});
export const categorySchema = z.object({
  id: z.preprocess(empty, z.string().uuid().optional()),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,40}$/),
  name_hi: z.string().trim().min(1).max(80),
  name_en: z.string().trim().min(1).max(80),
  icon: z.preprocess(empty, z.string().trim().max(8).optional()),
  sort_order: z.preprocess(empty, z.coerce.number().int().min(0).max(1000).default(0)),
  is_active: bool,
});
export const availabilitySchema = z.object({ available: bool });
