"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { useUploadThing } from "@/lib/uploadthing";

/**
 * Photo of a vaccination certificate, taken on the owner's phone.
 * `capture="environment"` opens the rear camera app directly, which works with
 * `Permissions-Policy: camera=()` since the page never touches the camera itself.
 */
export function VaxUpload({
  slug,
  documentUrl,
  onUploaded,
}: {
  slug: string;
  documentUrl?: string;
  onUploaded: (url: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const { startUpload, isUploading } = useUploadThing("vaxRecord", {
    onUploadProgress: setProgress,
    onClientUploadComplete: (results) => {
      setProgress(null);
      const url = results?.[0]?.serverData?.url;
      if (url) {
        onUploaded(url);
        toast.success("Record attached");
      }
    },
    onUploadError: (error) => {
      setProgress(null);
      toast.error(error.message || "Upload failed");
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) startUpload([file], { slug });
          // Reset so picking the same file twice still fires onChange.
          event.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading
            ? `Uploading${progress !== null ? ` ${progress}%` : "…"}`
            : documentUrl
              ? "Replace photo"
              : "Add photo of record"}
        </Button>
        {documentUrl ? (
          <>
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="label underline underline-offset-4"
            >
              View
            </a>
            <Button type="button" variant="ghost" size="sm" onClick={() => onUploaded(undefined)}>
              Remove
            </Button>
          </>
        ) : null}
      </div>
      <p className="text-xs text-mute">Optional, but it saves a phone call to your vet.</p>
    </div>
  );
}
