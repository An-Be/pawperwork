import "server-only";
import { createHash } from "node:crypto";

/**
 * Signature integrity (spec §3): hash the exact waiver text and version that
 * was presented. The version is inside the hashed payload, so re-signing an
 * edited waiver can never collide with the old signature, and a stored
 * signature can be re-verified later against the pinned text.
 */
export function waiverDocumentHash(bodyMarkdown: string, version: number): string {
  return createHash("sha256").update(`waiver:v${version}\n${bodyMarkdown}`, "utf8").digest("hex");
}
