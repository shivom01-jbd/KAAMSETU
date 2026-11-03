import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { socialText } from "@/lib/social-text";
import { reportSchema, reviewSchema, sendMessageSchema } from "@/lib/validation/social";

const rpc = vi.fn();
let sessionUser: unknown = null;
let conversationRow: unknown = null;
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
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
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: conversationRow }) }) }),
    }),
  }),
}));

const BID = "5a1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";
const CID = "0b9d3b6e-2f6c-4f1c-8a52-1f5d9a0c7e22";
const form = (o: Record<string, string>) =>
  Object.entries(o).reduce((f, [k, v]) => (f.append(k, v), f), new FormData());

beforeEach(() => {
  resetRateLimits();
  rpc.mockReset();
  rpc.mockResolvedValue({ error: null });
  sessionUser = { id: "u1", role: "customer", mock: false };
  conversationRow = { id: CID };
});

describe("social validation", () => {
  it("trims messages and rejects empty or oversized ones", () => {
    expect(sendMessageSchema.parse({ booking_id: BID, body: "  hello  " }).body).toBe("hello");
    expect(sendMessageSchema.safeParse({ booking_id: BID, body: "   " }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ booking_id: BID, body: "x".repeat(2001) }).success).toBe(
      false,
    );
  });
  it("accepts only ratings 1 to 5 and ignores a forged reviewer", () => {
    expect(reviewSchema.safeParse({ booking_id: BID, rating: "0" }).success).toBe(false);
    expect(reviewSchema.safeParse({ booking_id: BID, rating: "6" }).success).toBe(false);
    const r = reviewSchema.parse({
      booking_id: BID,
      rating: "4",
      reviewer_id: "forged",
      professional_id: "forged",
    }) as Record<string, unknown>;
    expect(r.rating).toBe(4);
    expect(r.reviewer_id).toBeUndefined();
    expect(r.professional_id).toBeUndefined();
  });
  it("limits what can be reported and why", () => {
    expect(
      reportSchema.safeParse({ target_type: "booking", target_id: "x", reason: "bad words" })
        .success,
    ).toBe(false);
    expect(
      reportSchema.safeParse({ target_type: "review", target_id: "abc", reason: "no" }).success,
    ).toBe(false);
    expect(
      reportSchema.safeParse({
        target_type: "message",
        target_id: "12",
        reason: "abusive language",
      }).success,
    ).toBe(true);
  });
});

describe("sendMessage boundary", () => {
  it("rejects anonymous users before touching the database", async () => {
    const { sendMessage } = await import("@/app/messages/actions");
    sessionUser = null;
    expect(await sendMessage({}, form({ booking_id: BID, body: "hi" }))).toEqual({
      error: "unauthorized",
    });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("returns not_found for a conversation the user cannot see (RLS) and never calls the RPC", async () => {
    const { sendMessage } = await import("@/app/messages/actions");
    conversationRow = null;
    expect(await sendMessage({}, form({ booking_id: BID, body: "hi" }))).toEqual({
      error: "not_found",
    });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects invalid bodies without a database call", async () => {
    const { sendMessage } = await import("@/app/messages/actions");
    expect(await sendMessage({}, form({ booking_id: BID, body: "  " }))).toEqual({
      error: "invalid_message",
    });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("sends only the conversation id and trimmed body, ignoring a forged sender", async () => {
    const { sendMessage } = await import("@/app/messages/actions");
    const r = await sendMessage(
      {},
      form({ booking_id: BID, body: "  hello  ", sender_id: "forged" }),
    );
    expect(r).toEqual({ message: "sent" });
    expect(rpc).toHaveBeenCalledWith("send_message", { p_conversation: CID, p_body: "hello" });
  });
  it("maps database errors to safe codes and never leaks raw text", async () => {
    const { sendMessage } = await import("@/app/messages/actions");
    rpc.mockResolvedValue({ error: { message: "chat_closed" } });
    expect(await sendMessage({}, form({ booking_id: BID, body: "hi" }))).toEqual({
      error: "chat_closed",
    });
    rpc.mockResolvedValue({ error: { message: "password=secret host=db.internal" } });
    expect(await sendMessage({}, form({ booking_id: BID, body: "hi" }))).toEqual({
      error: "failed",
    });
  });
  it("rate limits bursts", async () => {
    const { sendMessage } = await import("@/app/messages/actions");
    let last: unknown;
    for (let i = 0; i < 31; i++)
      last = await sendMessage({}, form({ booking_id: BID, body: "hi" }));
    expect(last).toEqual({ error: "rate_limited" });
  });
});

describe("review and report boundaries", () => {
  it("createReview: anonymous is unauthorized, invalid rating returns field errors", async () => {
    const { createReview } = await import("@/app/reviews/actions");
    sessionUser = null;
    expect(await createReview({}, form({ booking_id: BID, rating: "5" }))).toEqual({
      error: "unauthorized",
    });
    sessionUser = { id: "u1", role: "customer", mock: false };
    expect(
      (await createReview({}, form({ booking_id: BID, rating: "9" }))).fieldErrors?.rating,
    ).toBe("invalid");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("createReview: passes only booking, rating and comment; maps duplicate and not-completed", async () => {
    const { createReview } = await import("@/app/reviews/actions");
    expect(
      await createReview(
        {},
        form({ booking_id: BID, rating: "5", comment: "Great", reviewer_id: "forged" }),
      ),
    ).toEqual({ message: "saved" });
    expect(rpc).toHaveBeenCalledWith("create_review", {
      p_booking: BID,
      p_rating: 5,
      p_comment: "Great",
    });
    rpc.mockResolvedValue({ error: { message: "duplicate_review" } });
    expect(await createReview({}, form({ booking_id: BID, rating: "5" }))).toEqual({
      error: "duplicate_review",
    });
    rpc.mockResolvedValue({ error: { message: "not_completed" } });
    expect(await createReview({}, form({ booking_id: BID, rating: "5" }))).toEqual({
      error: "not_completed",
    });
  });
  it("reportContent: validates input, maps duplicates", async () => {
    const { reportContent } = await import("@/app/reviews/actions");
    expect(
      (await reportContent({}, form({ target_type: "review", target_id: "x", reason: "no" })))
        .fieldErrors?.reason,
    ).toBe("invalid");
    rpc.mockResolvedValue({ error: { message: "duplicate_report" } });
    expect(
      await reportContent(
        {},
        form({ target_type: "review", target_id: "x", reason: "fake review" }),
      ),
    ).toEqual({ error: "duplicate_report" });
  });
});

describe("components", () => {
  it("ChatForm shows a closed notice instead of a form when the booking is cancelled", async () => {
    const { ChatForm } = await import("@/components/chat-form");
    render(<ChatForm bookingId={BID} text={socialText.en} closed />);
    expect(screen.getByRole("status")).toHaveTextContent(socialText.en.chatClosed);
    expect(screen.queryByRole("textbox")).toBeNull();
  });
  it("ChatForm limits message length in the browser too", async () => {
    const { ChatForm } = await import("@/components/chat-form");
    render(<ChatForm bookingId={BID} text={socialText.en} closed={false} />);
    expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", "2000");
  });
  it("ReportButton keeps the form hidden until opened and sends the right target", async () => {
    const { ReportButton } = await import("@/components/report-button");
    const { container } = render(
      <ReportButton targetType="review" targetId="abc" text={socialText.en} />,
    );
    expect((container.querySelector('input[name="target_type"]') as HTMLInputElement).value).toBe(
      "review",
    );
    fireEvent.click(screen.getByText(socialText.en.report));
    expect(screen.getByRole("button", { name: socialText.en.reportSend })).toBeInTheDocument();
  });
  it("social text has the same keys in both languages", () => {
    expect(Object.keys(socialText.hi).sort()).toEqual(Object.keys(socialText.en).sort());
  });
});

describe("migration 0004 static checks", () => {
  const sql = readFileSync("supabase/migrations/0004_messaging_reviews.sql", "utf8");
  const tables = ["conversations", "conversation_participants", "messages", "reviews", "reports"];
  it("enables RLS on every new table", () => {
    for (const t of tables)
      expect(sql).toMatch(new RegExp(`alter table public\\.${t} enable row level security`));
  });
  it("gives clients read-only access: no direct insert, update or delete on any new table", () => {
    for (const t of tables)
      expect(sql).not.toMatch(
        new RegExp(`grant[^;]*(insert|update|delete)[^;]*on public\\.${t}\\b`),
      );
  });
  it("only members can read messages, via the non-recursive helper", () => {
    expect(sql).toMatch(
      /create policy messages_read[\s\S]*?is_conversation_member\(conversation_id\)/,
    );
    expect(sql).toMatch(/is_conversation_member[\s\S]*?security definer set search_path = ''/);
  });
  it("hides the reviewer identity and enforces one review per booking", () => {
    expect(sql).toMatch(/booking_id uuid not null unique/);
    const grant = sql.match(/grant select \(([^)]*)\) on public\.reviews/)![1];
    expect(grant).not.toMatch(/reviewer_id/);
  });
  it("only the customer of a completed booking can review", () => {
    expect(sql).toMatch(/b\.customer_id <> auth\.uid\(\) then raise exception 'not_found'/);
    expect(sql).toMatch(/b\.status <> 'completed' then raise exception 'not_completed'/);
  });
  it("recomputes the rating from stored reviews instead of trusting input", () => {
    expect(sql).toMatch(/create trigger reviews_refresh_rating/);
    expect(sql).not.toMatch(/grant[^;]*rating_avg/);
  });
  it("hardens every function: fixed search_path, no anon execute", () => {
    for (const fn of [
      "is_conversation_member",
      "send_message",
      "mark_conversation_read",
      "my_conversations",
      "create_review",
      "report_content",
      "admin_set_review_hidden",
    ]) {
      expect(sql).toMatch(
        new RegExp(`revoke all on function public\\.${fn}\\([^;]*from public, anon`),
      );
    }
    const defs = sql.split("create function").slice(1);
    for (const d of defs) expect(d).toMatch(/set search_path = ''/);
  });
  it("rate limits and closes chat for cancelled bookings", () => {
    expect(sql).toMatch(/'too_fast'/);
    expect(sql).toMatch(/st = 'cancelled' then raise exception 'chat_closed'/);
  });
  it("restricts moderation to admins and writes an audit log", () => {
    expect(sql).toMatch(
      /admin_set_review_hidden[\s\S]*?not public\.is_admin\(\) then raise exception 'forbidden'/,
    );
    expect(sql).toMatch(/'set_review_hidden'/);
  });
});
