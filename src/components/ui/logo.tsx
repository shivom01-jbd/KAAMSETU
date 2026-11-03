import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 76"
      role="img"
      aria-label="KAAMSETU"
      className={cn("h-16 w-14", className)}
    >
      <defs>
        <linearGradient id="ks-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1565e8" />
          <stop offset="1" stopColor="#3c9a1e" />
        </linearGradient>
      </defs>
      <path
        d="M32 2C16 2 4 14 4 29c0 18 28 45 28 45s28-27 28-45C60 14 48 2 32 2Z"
        fill="url(#ks-g)"
      />
      <circle cx="32" cy="28" r="20" fill="#fff" />
      <circle cx="32" cy="20" r="5" fill="#3c9a1e" />
      <circle cx="22" cy="23" r="4" fill="#0b2a7a" />
      <circle cx="42" cy="23" r="4" fill="#0b2a7a" />
      <path
        d="M14 38c6-9 30-9 36 0"
        fill="none"
        stroke="#0b2a7a"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ tagline, className }: { tagline?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <LogoMark />
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-navy-900">
        KAAM<span className="text-leaf-600">SETU</span>
      </p>
      {tagline && <p className="mt-1 text-sm text-muted">{tagline}</p>}
    </div>
  );
}
