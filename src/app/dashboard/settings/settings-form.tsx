"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Store, Syringe, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  function set<K extends keyof BusinessSettings>(
    key: K,
    value: BusinessSettings[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function addType() {
    const name = newType.trim();
    if (!name) return;
    const exists = form.vaxRequirements.some(
      (requirement) => requirement.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) {
      toast.error(`"${name}" is already in the list`);
      return;
    }
    set("vaxRequirements", [...form.vaxRequirements, { name, required: true }]);
    setNewType("");
  }

  async function save() {
    setSaving(true);
    const response = await fetch("/api/business/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body?.error ?? "Could not save settings");
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="size-4 text-primary" aria-hidden />
            Business profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Contact email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(event) => set("address", event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              type="url"
              placeholder="https://…"
              value={form.logoUrl}
              onChange={(event) => set("logoUrl", event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Shown at the top of your public intake form.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Syringe className="size-4 text-primary" aria-hidden />
            Required vaccinations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Only <span className="font-medium">required</span> types drive a
            pet&apos;s status and trigger reminders. Optional types are still
            collected and shown.
          </p>

          <ul className="divide-y overflow-hidden rounded-xl border">
            {form.vaxRequirements.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground">
                No vaccination types configured.
              </li>
            ) : null}
            {form.vaxRequirements.map((requirement, index) => (
              <li
                key={requirement.name}
                className="flex items-center gap-3 bg-card p-3"
              >
                <Checkbox
                  id={`required-${index}`}
                  checked={requirement.required}
                  onCheckedChange={(checked) => {
                    const next = [...form.vaxRequirements];
                    next[index] = { ...requirement, required: checked === true };
                    set("vaxRequirements", next);
                  }}
                />
                <Label
                  htmlFor={`required-${index}`}
                  className="flex-1 font-normal"
                >
                  {requirement.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {requirement.required ? "required" : "optional"}
                  </span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
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

          <div className="flex gap-2">
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
            />
            <Button type="button" variant="outline" onClick={addType}>
              <Plus className="size-4" aria-hidden />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        <Save className="size-4" aria-hidden />
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
