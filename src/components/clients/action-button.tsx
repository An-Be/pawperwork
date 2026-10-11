"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { toast } from "@/lib/toast";

type ActionButtonProps = {
  /** Our own API route, e.g. /api/clients/<id>/remind. */
  path: string;
  method: "POST" | "PATCH";
  body?: unknown;
  label: string;
  pendingLabel: string;
  successMessage: string;
  failureMessage: string;
  /** Re-render the server page after success (when the action changes what it shows). */
  refresh?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
};

/** A button that calls one dashboard API route and reports the result as a toast. */
export function ActionButton({
  path,
  method,
  body,
  label,
  pendingLabel,
  successMessage,
  failureMessage,
  refresh = false,
  variant = "outline",
  size = "md",
}: ActionButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await api(path, { method, body });
      if (!result.ok) {
        toast.error(result.error || failureMessage);
        return;
      }
      toast.success(successMessage);
      if (refresh) router.refresh();
    });
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={run} disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}
