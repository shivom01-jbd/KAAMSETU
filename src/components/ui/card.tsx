import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "plain" | "people" | "business";
const tones: Record<Tone, string> = {
  plain: "bg-white border-line",
  people: "bg-leaf-50 border-leaf-100",
  business: "bg-brand-50 border-brand-100",
};

export function Card({
  tone = "plain",
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  return (
    <div
      className={cn(
        "rounded-(--radius-card) border p-5 shadow-[0_6px_20px_-12px_rgba(11,42,122,0.35)]",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
