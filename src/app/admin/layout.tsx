import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";

const links = [
  ["/admin", "Overview"],
  ["/admin/professionals", "Professionals"],
  ["/admin/reports", "Reports"],
  ["/admin/users", "Users"],
  ["/admin/categories", "Categories"],
  ["/admin/audit", "Audit log"],
] as const;

// Every /admin page passes through this check (404 for anyone who is not an admin in the database).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-5">
      <nav aria-label="Admin" className="flex flex-wrap gap-2">
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-navy-900"
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
