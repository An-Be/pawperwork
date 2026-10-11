"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/section-label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { toast } from "@/lib/toast";

type Waiver = {
  id: string;
  title: string;
  bodyMarkdown: string;
  version: number;
  signatureCount: number;
};

type Draft = Pick<Waiver, "title" | "bodyMarkdown">;
type SavedWaiver = Draft & { id: string; version: number; versionBumped: boolean };

/**
 * Waivers are markdown and versioned. Saving an edit bumps the version
 * server-side; signatures already collected stay pinned to the version they
 * signed, which the client detail page shows.
 */
export function WaiverEditor({ n, waivers }: { n: string; waivers: Waiver[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Partial<Draft>>>({});
  const [creating, setCreating] = useState(false);
  const [newWaiver, setNewWaiver] = useState<Draft>({ title: "", bodyMarkdown: "" });
  const [busy, setBusy] = useState<string | null>(null);

  function draftOf(waiver: Waiver): Draft {
    return { title: waiver.title, bodyMarkdown: waiver.bodyMarkdown, ...drafts[waiver.id] };
  }

  function setDraft(id: string, patch: Partial<Draft>) {
    setDrafts((previous) => ({ ...previous, [id]: { ...previous[id], ...patch } }));
  }

  function clearDraft(id: string) {
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }

  async function save(waiver: Waiver) {
    setBusy(waiver.id);
    const result = await api<SavedWaiver>(`/api/waivers/${waiver.id}`, { method: "PATCH", body: draftOf(waiver) });
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.data.versionBumped
        ? `Saved as v${result.data.version}. Existing signatures keep their version.`
        : "No changes to save",
    );
    clearDraft(waiver.id);
    router.refresh();
  }

  async function create() {
    setBusy("new");
    const result = await api("/api/waivers", { method: "POST", body: newWaiver });
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Waiver created");
    setNewWaiver({ title: "", bodyMarkdown: "" });
    setCreating(false);
    router.refresh();
  }

  async function remove(waiver: Waiver) {
    setBusy(waiver.id);
    const result = await api(`/api/waivers/${waiver.id}`, { method: "DELETE" });
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Waiver deleted");
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4">
      <SectionLabel
        n={n}
        aside={
          <button type="button" className="uppercase hover:text-ink" onClick={() => setCreating((v) => !v)}>
            {creating ? "Cancel" : "Add waiver"}
          </button>
        }
      >
        Waivers
      </SectionLabel>
      <p className="-mt-2 text-sm text-mute">Clients type their full name to sign each of these during intake.</p>

      {creating ? (
        <div className="flex flex-col gap-4 border-2 border-ink p-5">
          <p className="font-display text-lg font-medium tracking-[-0.02em]">New waiver</p>
          <Field htmlFor="new-title" label="Title">
            <Input
              id="new-title"
              value={newWaiver.title}
              onChange={(event) => setNewWaiver((w) => ({ ...w, title: event.target.value }))}
              placeholder="Grooming consent"
            />
          </Field>
          <Field htmlFor="new-body" label="Text (markdown)">
            <Textarea
              id="new-body"
              rows={10}
              value={newWaiver.bodyMarkdown}
              onChange={(event) => setNewWaiver((w) => ({ ...w, bodyMarkdown: event.target.value }))}
            />
          </Field>
          <Button
            onClick={create}
            className="self-start"
            disabled={busy === "new" || !newWaiver.title.trim() || !newWaiver.bodyMarkdown.trim()}
          >
            {busy === "new" ? "Creating…" : "Create waiver"}
          </Button>
        </div>
      ) : null}

      {waivers.length === 0 && !creating ? (
        <p className="border border-dashed border-ink p-8 text-center text-sm text-mute">
          No waivers yet. Clients skip the signing step until you add one.
        </p>
      ) : null}

      {waivers.map((waiver) => {
        const draft = draftOf(waiver);
        const dirty = draft.title !== waiver.title || draft.bodyMarkdown !== waiver.bodyMarkdown;
        return (
          <div key={waiver.id} className="flex flex-col gap-4 border border-ink p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-lg font-medium tracking-[-0.02em]">{waiver.title}</p>
              <span className="label border border-ink px-2 py-0.5">v{waiver.version}</span>
              <span className="label text-mute">
                {waiver.signatureCount} signature{waiver.signatureCount === 1 ? "" : "s"}
              </span>
            </div>
            <Field htmlFor={`title-${waiver.id}`} label="Title">
              <Input
                id={`title-${waiver.id}`}
                value={draft.title}
                onChange={(event) => setDraft(waiver.id, { title: event.target.value })}
              />
            </Field>
            <Field htmlFor={`body-${waiver.id}`} label="Text (markdown)">
              <Textarea
                id={`body-${waiver.id}`}
                rows={12}
                value={draft.bodyMarkdown}
                onChange={(event) => setDraft(waiver.id, { bodyMarkdown: event.target.value })}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => save(waiver)} disabled={!dirty || busy === waiver.id}>
                {busy === waiver.id ? "Saving…" : `Save as v${waiver.version + 1}`}
              </Button>
              {waiver.signatureCount === 0 ? (
                <Button variant="ghost" size="sm" onClick={() => remove(waiver)} disabled={busy === waiver.id}>
                  Delete
                </Button>
              ) : null}
            </div>
            {dirty ? (
              <p className="text-xs text-mute">
                Saving bumps the version. Signatures already collected stay on v{waiver.version} and keep their original
                text hash.
              </p>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
