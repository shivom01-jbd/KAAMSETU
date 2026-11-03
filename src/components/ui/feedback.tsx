import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-brand-100", className)} />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-(--radius-card) border border-dashed border-line bg-white p-8 text-center">
      <p className="text-lg font-semibold text-navy-900">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

type Tone = "verified" | "pending" | "neutral";
const badge: Record<Tone, string> = {
  verified: "bg-leaf-100 text-leaf-700",
  pending: "bg-amber-100 text-amber-800",
  neutral: "bg-brand-100 text-navy-900",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        badge[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Alert({ kind, children }: { kind: "error" | "info"; children: ReactNode }) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        kind === "error"
          ? "border-danger/30 bg-red-50 text-danger"
          : "border-brand-100 bg-brand-50 text-navy-900",
      )}
    >
      {children}
    </div>
  );
}
