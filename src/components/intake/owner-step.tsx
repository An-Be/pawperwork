import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { OwnerDraft } from "@/lib/intake-draft";

export function OwnerStep({ owner, onChange }: { owner: OwnerDraft; onChange: (owner: OwnerDraft) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="firstName" label="First name">
          <Input
            id="firstName"
            autoComplete="given-name"
            value={owner.firstName}
            onChange={(e) => onChange({ ...owner, firstName: e.target.value })}
          />
        </Field>
        <Field htmlFor="lastName" label="Last name">
          <Input
            id="lastName"
            autoComplete="family-name"
            value={owner.lastName}
            onChange={(e) => onChange({ ...owner, lastName: e.target.value })}
          />
        </Field>
      </div>
      <Field htmlFor="email" label="Email">
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={owner.email}
          onChange={(e) => onChange({ ...owner, email: e.target.value })}
        />
      </Field>
      <Field htmlFor="ownerPhone" label="Mobile number">
        <Input
          id="ownerPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={owner.phone}
          onChange={(e) => onChange({ ...owner, phone: e.target.value })}
        />
      </Field>
    </div>
  );
}
