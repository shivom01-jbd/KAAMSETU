import { z } from "zod";

// Only these roles can be chosen at signup. "admin" can never be requested from the client.
export const signupRoles = ["customer", "professional", "business"] as const;

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8).max(72);

export const signUpSchema = z.object({
  full_name: z.string().trim().min(1).max(100),
  email,
  password,
  role: z.enum(signupRoles),
});
export const signInSchema = z.object({ email, password: z.string().min(1).max(72) });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ password });

const emptyToUndef = (v: unknown) => (v === "" || v == null ? undefined : v);
const optInt = (min: number, max: number) =>
  z.preprocess(emptyToUndef, z.coerce.number().int().min(min).max(max).optional());
const optText = (max: number) => z.preprocess(emptyToUndef, z.string().trim().max(max).optional());

const round2 = (n: number | undefined) => (n == null ? undefined : Math.round(n * 100) / 100);

export const professionalSchema = z
  .object({
    category_id: z.string().uuid(),
    experience_years: optInt(0, 60),
    bio: optText(1000),
    price_min_inr: optInt(0, 1_000_000),
    price_max_inr: optInt(0, 1_000_000),
    city: optText(80),
    area_label: optText(80),
    service_radius_km: z.coerce.number().int().min(1).max(100),
    is_available: z.boolean(),
    is_listed: z.boolean(),
    // Coarse point only: rounded to 0.01 degree (~1 km) on the server, whatever the client sends.
    approx_lat: z
      .preprocess(emptyToUndef, z.coerce.number().min(6).max(38).optional())
      .transform(round2),
    approx_lng: z
      .preprocess(emptyToUndef, z.coerce.number().min(68).max(98).optional())
      .transform(round2),
  })
  .refine((v) => (v.approx_lat == null) === (v.approx_lng == null), { path: ["approx_lat"] })
  .refine(
    (v) => v.price_min_inr == null || v.price_max_inr == null || v.price_max_inr >= v.price_min_inr,
    {
      path: ["price_max_inr"],
    },
  );

export const businessSchema = z.object({
  company_name: z.string().trim().min(1).max(120),
  city: optText(80),
  description: optText(1000),
});

/** Maps zod issues to { field: "invalid" } so the UI can show a localized message. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "form")] = "invalid";
  return out;
}
