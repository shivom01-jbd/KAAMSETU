import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Design system" };

export default function DesignSystem() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="space-y-6">
      <Logo />
      <h1 className="text-2xl font-bold text-navy-900">Design system</h1>
      <div className="grid grid-cols-2 gap-3">
        <Card tone="people">
          <p className="font-bold text-leaf-700">People</p>
          <Button variant="people" className="mt-3">
            मैं People हूं
          </Button>
        </Card>
        <Card tone="business">
          <p className="font-bold text-navy-900">Business</p>
          <Button variant="business" className="mt-3">
            मैं Business हूं
          </Button>
        </Card>
      </div>
      <Card className="space-y-3">
        <Input
          label="Mobile number"
          placeholder="98765 43210"
          hint="We will send a 6-digit code."
        />
        <Input label="Email" defaultValue="abc" error="Enter a valid email address." />
        <Button>Send OTP</Button>
        <Button variant="outline">Cancel</Button>
        <Button loading>Saving</Button>
      </Card>
      <div className="flex gap-2">
        <Badge tone="verified">Verified</Badge>
        <Badge tone="pending">Pending review</Badge>
        <Badge>Electrician</Badge>
      </div>
      <Alert kind="info">Mock mode is on. OTP codes are not real.</Alert>
      <Skeleton className="h-16" />
      <EmptyState title="No requests yet" body="New service requests will appear here." />
    </div>
  );
}
