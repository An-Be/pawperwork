"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import { Panel } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import type { VaxRequirement } from "@/lib/vax";

type BusinessSettings = {
  name: string;
  email: string;
  phone: string;
  address: string;
  logoUrl: string;
  vaxRequirements: VaxRequirement[];
};

export function SettingsForm({ business }: { business: BusinessSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(business);
  const [newType, setNewType] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function addType() {
    const name = newType.trim();
    if (!name) return;
    const exists = form.vaxRequirements.some((requirement) => requirement.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      toast.error(`"${name}" is already in the list`);
      return;
    }
    set("vaxRequirements", [...form.vaxRequirements, { name, required: true }]);
    setNewType("");
  }

  async function save() {
    setSaving(true);
    const result = await api("/api/business/settings", { method: "PATCH", body: form });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-10">
      <Panel n="01" title="Business profile" className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="name" label="Business name">
          <Input id="name" value={form.name} onChange={(event) => set("name", event.target.value)} />
        </Field>
        <Field htmlFor="email" label="Contact email">
          <Input id="email" type="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
        </Field>
        <Field htmlFor="phone" label="Phone">
          <Input id="phone" type="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} />
        </Field>
        <Field htmlFor="address" label="Address">
          <Input id="address" value={form.address} onChange={(event) => set("address", event.target.value)} />
        </Field>
        <Field
          htmlFor="logoUrl"
          label="Logo URL"
          hint="An https link to your logo. Shown at the top of your intake form."
          className="sm:col-span-2"
        >
          <Input
            id="logoUrl"
            type="url"
            placeholder="https://…"
            aria-describedby="logoUrl-desc"
            value={form.logoUrl}
            onChange={(event) => set("logoUrl", event.target.value)}
          />
        </Field>
      </Panel>

      <Panel n="02" title="Vaccinations you require" className="flex flex-col gap-4">
        <p className="text-sm text-mute">
          Only required types drive a pet&apos;s status and trigger reminders. Optional types are still collected and
          shown.
        </p>

        <ul className="divide-y divide-rule border border-ink">
          {form.vaxRequirements.length === 0 ? (
            <li className="p-4 text-sm text-mute">No vaccination types yet.</li>
          ) : null}
          {form.vaxRequirements.map((requirement, index) => (
            <li key={requirement.name} className="flex items-center gap-3 px-3 py-2">
              <input
                id={`required-${index}`}
                type="checkbox"
                className="size-5 accent-ink"
                checked={requirement.required}
                onChange={(event) => {
                  const next = [...form.vaxRequirements];
                  next[index] = { ...requirement, required: event.target.checked };
                  set("vaxRequirements", next);
                }}
              />
              <label htmlFor={`required-${index}`} className="flex-1 text-sm">
                {requirement.name}
                <span className="label ml-2 text-mute">{requirement.required ? "required" : "optional"}</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${requirement.name}`}
                onClick={() =>
                  set(
                    "vaxRequirements",
                    form.vaxRequirements.filter((_, i) => i !== index),
                  )
                }
              >
                <X className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>

        <div className="flex items-stretch">
          <Input
            value={newType}
            onChange={(event) => setNewType(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addType();
              }
            }}
            placeholder="Add a type, e.g. Leptospirosis"
            aria-label="New vaccination type"
            className="min-w-0 flex-1 border-r-0"
          />
          <Button type="button" variant="outline" onClick={addType}>
            Add
          </Button>
        </div>
      </Panel>

      <Button onClick={save} disabled={saving} size="lg" className="self-start">
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
