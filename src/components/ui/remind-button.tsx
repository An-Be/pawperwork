"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/api-client";

/** Manual nudge for outstanding paperwork (spec §3). */
export function RemindButton({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const result = await postJson(`/api/clients/${clientId}/remind`);
      if (result.ok) {
        toast.success("Reminder sent");
        return;
      }
      toast.error(result.error || "Could not send reminder");
    });
  }

  return (
    <Button type="button" variant="outline" onClick={send} disabled={pending}>
      {pending ? "Sending…" : "Send reminder"}
    </Button>
  );
}
