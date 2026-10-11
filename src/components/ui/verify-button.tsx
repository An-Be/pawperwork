"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { patchJson } from "@/lib/api-client";

/**
 * Marks an owner-uploaded vaccination record as checked by the business
 * (spec §3). Toggles both ways so a mistaken click is recoverable.
 */
export function VerifyButton({
  vaccinationId,
  verified,
}: {
  vaccinationId: string;
  verified: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await patchJson(
        `/api/vaccinations/${vaccinationId}/verify`,
        { verified: !verified },
      );
      if (!result.ok) {
        toast.error(result.error || "Could not update that record");
        return;
      }
      toast.success(verified ? "Marked unverified" : "Record verified");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={verified ? "ghost" : "outline"}
      onClick={toggle}
      disabled={pending}
    >
      {verified ? "Unverify" : "Verify"}
    </Button>
  );
}
