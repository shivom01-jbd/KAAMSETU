import type { Metadata } from "next";
import { saveCategory } from "@/app/admin/actions";
import { CategoryForm } from "@/components/category-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/feedback";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin: categories" };

export default async function AdminCategories() {
  await requireAdmin(); // pages render in parallel with the layout, so each page checks too
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name_hi, name_en, icon, sort_order, is_active")
    .order("sort_order");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-navy-900">Categories</h1>
      <CategoryForm />
      {(data ?? []).map((c) => (
        <Card key={c.id} className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">
            {c.icon} {c.name_en}{" "}
            <span className="text-muted">
              / {c.name_hi} · {c.slug}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <Badge tone={c.is_active ? "verified" : "neutral"}>
              {c.is_active ? "active" : "hidden"}
            </Badge>
            <ConfirmSubmit
              action={saveCategory}
              label={c.is_active ? "Hide" : "Show"}
              danger={c.is_active}
              fields={{
                id: c.id,
                slug: c.slug,
                name_hi: c.name_hi,
                name_en: c.name_en,
                icon: c.icon ?? "",
                sort_order: String(c.sort_order),
                is_active: String(!c.is_active),
              }}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
