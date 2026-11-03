"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Refreshes the server-rendered chat when a new message arrives. Falls back to a slow poll if Realtime is off. */
export function ChatLive({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  useEffect(() => {
    let cleanup = () => {};
    if (isSupabaseConfigured()) {
      const supabase = createSupabaseBrowserClient();
      const channel = supabase
        .channel(`chat-${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          () => router.refresh(),
        )
        .subscribe();
      cleanup = () => void supabase.removeChannel(channel);
    }
    const timer = setInterval(
      () => document.visibilityState === "visible" && router.refresh(),
      20000,
    );
    return () => {
      clearInterval(timer);
      cleanup();
    };
  }, [conversationId, router]);
  return null;
}
