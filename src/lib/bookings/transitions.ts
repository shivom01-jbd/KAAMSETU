export const bookingStatuses = [
  "requested",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type BookingStatus = (typeof bookingStatuses)[number];
export type ActorKind = "customer" | "professional" | "admin";

/** Mirrors public.booking_transition_allowed in 0003_bookings.sql (a test compares them). The DB is the authority. */
export const transitionRules: readonly (readonly [BookingStatus, BookingStatus, ActorKind])[] = [
  ["requested", "accepted", "professional"],
  ["requested", "cancelled", "professional"],
  ["requested", "cancelled", "customer"],
  ["requested", "cancelled", "admin"],
  ["accepted", "in_progress", "professional"],
  ["accepted", "cancelled", "professional"],
  ["accepted", "cancelled", "customer"],
  ["accepted", "cancelled", "admin"],
  ["in_progress", "completed", "professional"],
  ["in_progress", "cancelled", "professional"],
  ["in_progress", "cancelled", "admin"],
];

export const canTransition = (from: BookingStatus, to: BookingStatus, actor: ActorKind) =>
  transitionRules.some(([f, t, a]) => f === from && t === to && a === actor);

export const allowedTransitions = (from: BookingStatus, actor: ActorKind): BookingStatus[] =>
  transitionRules.filter(([f, , a]) => f === from && a === actor).map(([, t]) => t);

export const isOpen = (s: BookingStatus) =>
  s === "requested" || s === "accepted" || s === "in_progress";

export function actorKind(
  userId: string,
  b: { customer_id: string; professional_id: string },
  role?: string,
): ActorKind | null {
  if (userId === b.professional_id) return "professional";
  if (userId === b.customer_id) return "customer";
  return role === "admin" ? "admin" : null;
}
