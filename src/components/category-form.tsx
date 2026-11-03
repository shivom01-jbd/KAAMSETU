"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/auth/actions";
import { saveCategory } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { adminErrors } from "@/lib/admin-text";

const initial: FormState = {};

export function CategoryForm() {
  const [state, action, pending] = useActionState(saveCategory, initial);
  const fe = (f: string) => (state.fieldErrors?.[f] ? "Check this value." : undefined);
  return (
    <form
      action={action}
      className="space-y-3 rounded-(--radius-card) border border-line bg-white p-4"
      noValidate
    >
      <h2 className="font-bold text-navy-900">Add category</h2>
      {state.error && <Alert kind="error">{adminErrors[state.error] ?? adminErrors.failed}</Alert>}
      {state.message && <Alert kind="info">{adminErrors.updated}</Alert>}
      <Input label="Slug (a-z, 0-9, -)" name="slug" required error={fe("slug")} />
      <Input label="Name (English)" name="name_en" required error={fe("name_en")} />
      <Input label="Name (Hindi)" name="name_hi" required error={fe("name_hi")} />
      <Input label="Icon (emoji)" name="icon" maxLength={8} />
      <Input label="Sort order" name="sort_order" type="number" min={0} defaultValue={0} />
      <input type="hidden" name="is_active" value="true" />
      <Button type="submit" loading={pending}>
        Add category
      </Button>
    </form>
  );
}
