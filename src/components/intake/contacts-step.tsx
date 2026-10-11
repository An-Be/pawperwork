import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ContactsDraft } from "@/lib/intake-draft";

export function ContactsStep({
  businessName,
  contacts,
  onChange,
}: {
  businessName: string;
  contacts: ContactsDraft;
  onChange: (contacts: ContactsDraft) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-mute">
        Who should {businessName} call if something happens while your pet is in their care?
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="vetName" label="Vet practice">
          <Input
            id="vetName"
            value={contacts.vetName}
            onChange={(e) => onChange({ ...contacts, vetName: e.target.value })}
          />
        </Field>
        <Field htmlFor="vetPhone" label="Vet phone">
          <Input
            id="vetPhone"
            type="tel"
            inputMode="tel"
            value={contacts.vetPhone}
            onChange={(e) => onChange({ ...contacts, vetPhone: e.target.value })}
          />
        </Field>
        <Field htmlFor="emergencyName" label="Emergency contact (not you)">
          <Input
            id="emergencyName"
            value={contacts.emergencyName}
            onChange={(e) => onChange({ ...contacts, emergencyName: e.target.value })}
          />
        </Field>
        <Field htmlFor="emergencyPhone" label="Emergency phone">
          <Input
            id="emergencyPhone"
            type="tel"
            inputMode="tel"
            value={contacts.emergencyPhone}
            onChange={(e) => onChange({ ...contacts, emergencyPhone: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
