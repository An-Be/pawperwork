"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FileSignature, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Waiver = {
  id: string;
  title: string;
  bodyMarkdown: string;
  version: number;
  signatureCount: number;
};

/**
 * Waivers are markdown and versioned (spec §3). Saving an edit bumps the
 * version server-side; signatures already collected stay pinned to the
 * version they signed, which the client detail page shows.
 */
export function WaiverEditor({ waivers }: { waivers: Waiver[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Partial<Waiver>>>({});
  const [creating, setCreating] = useState(false);
  const [newWaiver, setNewWaiver] = useState({ title: "", bodyMarkdown: "" });
  const [busy, setBusy] = useState<string | null>(null);

  function draftOf(waiver: Waiver) {
    return { ...waiver, ...drafts[waiver.id] };
  }

  function setDraft(id: string, patch: Partial<Waiver>) {
    setDrafts((previous) => ({ ...previous, [id]: { ...previous[id], ...patch } }));
  }

  async function save(waiver: Waiver) {
    const draft = draftOf(waiver);
    setBusy(waiver.id);
    const response = await fetch(`/api/waivers/${waiver.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title,
        bodyMarkdown: draft.bodyMarkdown,
      }),
    });
    setBusy(null);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(body?.error ?? "Could not save waiver");
      return;
    }
    toast.success(
      body?.versionBumped
        ? `Saved as v${body.version} — existing signatures keep their version`
        : "No changes to save",
    );
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[waiver.id];
      return next;
    });
    router.refresh();
  }

  async function create() {
    setBusy("new");
    const response = await fetch("/api/waivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newWaiver),
    });
    setBusy(null);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body?.error ?? "Could not create waiver");
      return;
    }
    toast.success("Waiver created");
    setNewWaiver({ title: "", bodyMarkdown: "" });
    setCreating(false);
    router.refresh();
  }

  async function remove(waiver: Waiver) {
    setBusy(waiver.id);
    const response = await fetch(`/api/waivers/${waiver.id}`, {
      method: "DELETE",
    });
    setBusy(null);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body?.error ?? "Could not delete waiver");
      return;
    }
    toast.success("Waiver deleted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
            <FileSignature className="size-4 text-primary" aria-hidden />
            Waivers
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Clients type their full name to sign each of these during intake.
          </p>
        </div>
        <Button variant="outline" onClick={() => setCreating((v) => !v)}>
          {creating ? null : <Plus className="size-4" aria-hidden />}
          {creating ? "Cancel" : "Add waiver"}
        </Button>
      </div>

      {creating ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New waiver</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-title">Title</Label>
              <Input
                id="new-title"
                value={newWaiver.title}
                onChange={(event) =>
                  setNewWaiver((w) => ({ ...w, title: event.target.value }))
                }
                placeholder="Grooming Consent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-body">Body (markdown)</Label>
              <Textarea
                id="new-body"
                rows={10}
                value={newWaiver.bodyMarkdown}
                onChange={(event) =>
                  setNewWaiver((w) => ({
                    ...w,
                    bodyMarkdown: event.target.value,
                  }))
                }
              />
            </div>
            <Button
              onClick={create}
              disabled={
                busy === "new" ||
                !newWaiver.title.trim() ||
                !newWaiver.bodyMarkdown.trim()
              }
            >
              {busy === "new" ? "Creating…" : "Create waiver"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {waivers.length === 0 && !creating ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No waivers yet. Clients will skip the signing step until you add one.
        </p>
      ) : null}

      {waivers.map((waiver) => {
        const draft = draftOf(waiver);
        const dirty =
          draft.title !== waiver.title ||
          draft.bodyMarkdown !== waiver.bodyMarkdown;
        return (
          <Card key={waiver.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{waiver.title}</CardTitle>
                <Badge variant="outline">v{waiver.version}</Badge>
                <span className="text-xs text-muted-foreground">
                  {waiver.signatureCount} signature
                  {waiver.signatureCount === 1 ? "" : "s"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`title-${waiver.id}`}>Title</Label>
                <Input
                  id={`title-${waiver.id}`}
                  value={draft.title}
                  onChange={(event) =>
                    setDraft(waiver.id, { title: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`body-${waiver.id}`}>Body (markdown)</Label>
                <Textarea
                  id={`body-${waiver.id}`}
                  rows={12}
                  value={draft.bodyMarkdown}
                  onChange={(event) =>
                    setDraft(waiver.id, { bodyMarkdown: event.target.value })
                  }
                  className="font-mono text-xs"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => save(waiver)}
                  disabled={!dirty || busy === waiver.id}
                >
                  {busy === waiver.id ? "Saving…" : `Save as v${waiver.version + 1}`}
                </Button>
                {dirty ? (
                  <p className="text-xs text-muted-foreground">
                    Saving bumps the version. Signatures already collected stay
                    on v{waiver.version} and keep their original text hash.
                  </p>
                ) : null}
                {waiver.signatureCount === 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(waiver)}
                    disabled={busy === waiver.id}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
