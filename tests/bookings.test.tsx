import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bookingText } from "@/lib/bookings-text";
import {
  actorKind,
  allowedTransitions,
  bookingStatuses,
  canTransition,
  transitionRules,
  type BookingStatus,
} from "@/lib/bookings/transitions";
import { resetRateLimits } from "@/lib/rate-limit";
import { createBookingSchema, transitionSchema } from "@/lib/validation/booking";

// ---- mocks for the server-action boundary ----
const rpc = vi.fn();
let sessionUser: unknown = null;
let bookingRow: unknown = null;
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: async () => sessionUser,
  MOCK_COOKIE: "m",
}));
vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
  supabaseUrl: "x",
  supabaseAnonKey: "y",
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    rpc,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: bookingRow }) }) }),
    }),
  }),
}));

const PRO = "7d3f7c4e-1c1a-4a6e-9d5a-6c1f2f2f1a11";
const CUS = "0b9d3b6e-2f6c-4f1c-8a52-1f5d9a0c7e22";
const BID = "5a1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";
const future = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 16);
const form = (o: Record<string, string>) =>
  Object.assign(new FormData(), {}) &&
  Object.entries(o).reduce((f, [k, v]) => (f.append(k, v), f), new FormData());
const valid = {
  professional_id: PRO,
  description: "Fridge is not cooling properly",
  preferred_at: future,
};

beforeEach(() => {
  resetRateLimits();
  rpc.mockReset();
  rpc.mockResolvedValue({ error: null });
  sessionUser = null;
  bookingRow = null;
});

describe("transition rules", () => {
  it("allows the happy path in order", () => {
    expect(canTransition("requested", "accepted", "professional")).toBe(true);
    expect(canTransition("accepted", "in_progress", "professional")).toBe(true);
    expect(canTransition("in_progress", "completed", "professional")).toBe(true);
  });
  it("lets a customer cancel early but never accept, start or complete", () => {
    expect(canTransition("requested", "cancelled", "customer")).toBe(true);
    for (const to of ["accepted", "in_progress", "completed"] as const)
      expect(canTransition("requested", to, "customer")).toBe(false);
    expect(canTransition("in_progress", "completed", "customer")).toBe(false);
    expect(canTransition("in_progress", "cancelled", "customer")).toBe(false);
  });
  it("blocks skipping steps and leaving terminal states for everyone", () => {
    expect(canTransition("requested", "completed", "professional")).toBe(false);
    expect(canTransition("requested", "in_progress", "professional")).toBe(false);
    for (const from of ["completed", "cancelled"] as const)
      for (const to of bookingStatuses)
        for (const a of ["customer", "professional", "admin"] as const)
          expect(canTransition(from, to, a)).toBe(false);
  });
  it("lists the actions a professional sees", () => {
    expect(allowedTransitions("requested", "professional").sort()).toEqual([
      "accepted",
      "cancelled",
    ]);
  });
  it("finds the actor kind from the booking, and nothing for strangers", () => {
    const b = { customer_id: CUS, professional_id: PRO };
    expect(actorKind(PRO, b)).toBe("professional");
    expect(actorKind(CUS, b)).toBe("customer");
    expect(actorKind("stranger", b)).toBeNull();
    expect(actorKind("stranger", b, "admin")).toBe("admin");
  });
});

describe("booking validation", () => {
  it("accepts a good request and treats the form time as India time", () => {
    const r = createBookingSchema.parse(valid);
    expect(r.preferred_at.endsWith("+05:30")).toBe(true);
  });
  it("rejects past dates, far-future dates, short descriptions and bad ids", () => {
    expect(
      createBookingSchema.safeParse({ ...valid, preferred_at: "2020-01-01T10:00" }).success,
    ).toBe(false);
    expect(
      createBookingSchema.safeParse({ ...valid, preferred_at: "2099-01-01T10:00" }).success,
    ).toBe(false);
    expect(createBookingSchema.safeParse({ ...valid, description: "short" }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...valid, professional_id: "x" }).success).toBe(false);
  });
  it("ignores a forged customer_id or status and rounds coordinates", () => {
    const r = createBookingSchema.parse({
      ...valid,
      customer_id: CUS,
      status: "completed",
      approx_lat: "26.854321",
      approx_lng: "80.949876",
    }) as Record<string, unknown>;
    expect(r.customer_id).toBeUndefined();
    expect(r.status).toBeUndefined();
    expect(r.approx_lat).toBe(26.85);
  });
  it("only accepts real statuses for transitions", () => {
    expect(transitionSchema.safeParse({ booking_id: BID, to: "paid" }).success).toBe(false);
  });
});

describe("server action boundaries", () => {
  it("createBooking: no session is unauthorized and never reaches the database", async () => {
    const { createBooking } = await import("@/app/bookings/actions");
    expect(await createBooking({}, form(valid))).toEqual({ error: "unauthorized" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("createBooking: a professional or admin cannot create bookings", async () => {
    const { createBooking } = await import("@/app/bookings/actions");
    for (const role of ["professional", "admin"]) {
      sessionUser = { id: PRO, role, mock: false };
      expect(await createBooking({}, form(valid))).toEqual({ error: "forbidden" });
    }
    expect(rpc).not.toHaveBeenCalled();
  });
  it("createBooking: invalid input returns field errors without a database call", async () => {
    const { createBooking } = await import("@/app/bookings/actions");
    sessionUser = { id: CUS, role: "customer", mock: false };
    const r = await createBooking({}, form({ ...valid, description: "no" }));
    expect(r.fieldErrors?.description).toBe("invalid");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("createBooking: valid request calls the RPC with the form data only, then redirects", async () => {
    const { createBooking } = await import("@/app/bookings/actions");
    sessionUser = { id: CUS, role: "customer", mock: false };
    await expect(createBooking({}, form({ ...valid, customer_id: "forged" }))).rejects.toThrow(
      "REDIRECT:/bookings",
    );
    const args = rpc.mock.calls[0][1];
    expect(args.p_professional).toBe(PRO);
    expect(JSON.stringify(args)).not.toContain("forged");
  });
  it("createBooking: maps database errors to safe codes", async () => {
    const { createBooking } = await import("@/app/bookings/actions");
    sessionUser = { id: CUS, role: "customer", mock: false };
    rpc.mockResolvedValue({
      error: {
        code: "23505",
        message: "duplicate key value violates unique constraint bookings_one_open_idx",
      },
    });
    expect(await createBooking({}, form(valid))).toEqual({ error: "duplicate_open" });
    rpc.mockResolvedValue({ error: { message: "connection string postgres://secret" } });
    expect(await createBooking({}, form(valid))).toEqual({ error: "failed" }); // raw message never leaks
  });
  it("transitionBooking: a non-participant sees not_found and cannot reach the RPC", async () => {
    const { transitionBooking } = await import("@/app/bookings/actions");
    sessionUser = { id: "stranger", role: "customer", mock: false };
    bookingRow = null; // RLS hides it
    expect(await transitionBooking({}, form({ booking_id: BID, to: "accepted" }))).toEqual({
      error: "not_found",
    });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("transitionBooking: a customer cannot accept their own request", async () => {
    const { transitionBooking } = await import("@/app/bookings/actions");
    sessionUser = { id: CUS, role: "customer", mock: false };
    bookingRow = { status: "requested", customer_id: CUS, professional_id: PRO };
    expect(await transitionBooking({}, form({ booking_id: BID, to: "accepted" }))).toEqual({
      error: "invalid_transition",
    });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("transitionBooking: the professional can accept, and the RPC gets only ids and status", async () => {
    const { transitionBooking } = await import("@/app/bookings/actions");
    sessionUser = { id: PRO, role: "professional", mock: false };
    bookingRow = { status: "requested", customer_id: CUS, professional_id: PRO };
    expect(await transitionBooking({}, form({ booking_id: BID, to: "accepted" }))).toEqual({
      message: "updated",
    });
    expect(rpc).toHaveBeenCalledWith("transition_booking", {
      p_booking: BID,
      p_to: "accepted",
      p_reason: null,
    });
  });
  it("transitionBooking: rate limits bursts", async () => {
    const { transitionBooking } = await import("@/app/bookings/actions");
    sessionUser = { id: PRO, role: "professional", mock: false };
    let last: unknown;
    for (let i = 0; i < 31; i++)
      last = await transitionBooking({}, form({ booking_id: BID, to: "accepted" }));
    expect(last).toEqual({ error: "rate_limited" });
  });
});

describe("ConfirmActionForm", () => {
  it("opens a dialog first and only submits after confirming; Escape cancels", async () => {
    const { ConfirmActionForm } = await import("@/components/confirm-action-form");
    const t = bookingText.en;
    render(<ConfirmActionForm bookingId={BID} to="cancelled" label="Cancel job" text={t} danger />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel job" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(t.confirmTitle);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel job" }));
    expect(screen.getByRole("button", { name: t.confirm })).toHaveAttribute("type", "submit");
  });
});

describe("migration 0003 static checks", () => {
  const sql = readFileSync("supabase/migrations/0003_bookings.sql", "utf8");
  it("SQL transition table equals the TypeScript one", () => {
    const fnSql = sql.slice(
      sql.indexOf("create function public.booking_transition_allowed"),
      sql.indexOf("create function public.create_booking"),
    );
    const rows = [
      ...fnSql.matchAll(
        /\('(\w+)'(?:::public\.booking_status)?, '(\w+)'(?:::public\.booking_status)?, '(\w+)'\)/g,
      ),
    ].map((m) => m.slice(1, 4).join(">"));
    expect(rows.sort()).toEqual(transitionRules.map((r) => r.join(">")).sort());
  });
  it("statuses in SQL match TypeScript", () => {
    const m = sql
      .match(/create type public\.booking_status as enum \(([^)]*)\)/)![1]
      .replace(/[' ]/g, "")
      .split(",");
    expect(m).toEqual([...bookingStatuses] as BookingStatus[]);
  });
  it("gives users read-only table access and no direct writes", () => {
    expect(sql).toMatch(/alter table public\.bookings enable row level security/);
    expect(sql).toMatch(/alter table public\.booking_events enable row level security/);
    expect(sql).toMatch(
      /grant select on public\.bookings, public\.booking_events to authenticated/,
    );
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]*on public\.bookings/);
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]*on public\.booking_events/);
  });
  it("hardens both functions: definer, fixed search_path, no anon access, row lock", () => {
    for (const fn of ["create_booking", "transition_booking"]) {
      expect(sql).toMatch(
        new RegExp(`revoke all on function public\\.${fn}\\([^;]+from public, anon`),
      );
      expect(sql).toMatch(
        new RegExp(`grant execute on function public\\.${fn}\\([^;]+to authenticated`),
      );
    }
    expect(sql.match(/security definer set search_path = ''/g)!.length).toBe(2);
    expect(sql).toMatch(/for update/);
  });
  it("hides booking existence from strangers and limits who can create", () => {
    expect(sql).toMatch(/actor is null then raise exception 'not_found'/);
    expect(sql).toMatch(/me\.role not in \('customer', 'business'\)/);
  });
});
