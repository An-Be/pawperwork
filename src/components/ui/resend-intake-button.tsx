"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/api-client";

/** Re-sends the public intake link to an existing client (spec §3). */
export function ResendIntakeButton({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const result = await postJson(`/api/clients/${clientId}/invite`);
      if (result.ok) {
        toast.success("Intake link sent");
        return;
      }
      toast.error(result.error || "Could not send intake link");
    });
  }

  return (
    <Button type="button" variant="outline" onClick={send} disabled={pending}>
      {pending ? "Sending…" : "Resend intake link"}
    </Button>
  );
}
