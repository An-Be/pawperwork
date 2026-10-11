import { ActionButton } from "./action-button";

/**
 * Marks an owner-uploaded vaccination record as checked by the business.
 * Toggles both ways so a mistaken click is recoverable.
 */
export function VerifyButton({ vaccinationId, verified }: { vaccinationId: string; verified: boolean }) {
  return (
    <ActionButton
      path={`/api/vaccinations/${vaccinationId}/verify`}
      method="PATCH"
      body={{ verified: !verified }}
      label={verified ? "Unverify" : "Verify"}
      pendingLabel="Saving…"
      successMessage={verified ? "Marked unverified" : "Record verified"}
      failureMessage="Couldn't update that record"
      refresh
      variant={verified ? "ghost" : "outline"}
      size="sm"
    />
  );
}
