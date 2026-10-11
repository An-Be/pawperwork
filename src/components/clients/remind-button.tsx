import { ActionButton } from "./action-button";

/** Manual nudge for outstanding paperwork. */
export function RemindButton({ clientId }: { clientId: string }) {
  return (
    <ActionButton
      path={`/api/clients/${clientId}/remind`}
      method="POST"
      label="Send reminder"
      pendingLabel="Sending…"
      successMessage="Reminder sent"
      failureMessage="Couldn't send the reminder"
      refresh
    />
  );
}
