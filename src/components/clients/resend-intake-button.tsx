import { ActionButton } from "./action-button";

/** Re-sends the public intake link to an existing client. */
export function ResendIntakeButton({ clientId, size }: { clientId: string; size?: "sm" | "md" }) {
  return (
    <ActionButton
      path={`/api/clients/${clientId}/invite`}
      method="POST"
      label="Resend intake link"
      pendingLabel="Sending…"
      successMessage="Intake link sent"
      failureMessage="Couldn't send the intake link"
      refresh
      size={size}
    />
  );
}
