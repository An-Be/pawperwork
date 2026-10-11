import { Resend } from "resend";
import { STATUS_LABEL, type VaxStatus } from "./vax";

/**
 * Resend wrapper. Email is never load-bearing for a request: if it is not
 * configured (local dev before provisioning) we log and report `skipped`
 * rather than failing the intake submission or the cron run.
 */
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Pet Intake <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Local development without a Resend key: set EMAIL_TRANSPORT=console to print
 * emails and treat them as delivered. Without it, unconfigured sends report
 * `skipped` and the cron deliberately does not log them, so they stay due.
 */
const useConsoleTransport =
  !resend &&
  process.env.EMAIL_TRANSPORT === "console" &&
  process.env.NODE_ENV !== "production";

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; reason: string };

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
}): Promise<SendResult> {
  if (useConsoleTransport) {
    console.log(
      `\n[email:console] To: ${message.to}\n[email:console] Subject: ${message.subject}\n${message.text}\n`,
    );
    return { ok: true, id: null };
  }
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipping "${message.subject}" to ${message.to}`,
    );
    return { ok: false, skipped: true, reason: "RESEND_API_KEY not set" };
  }
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    if (error) {
      console.error("[email] send failed", error);
      return { ok: false, skipped: false, reason: error.message };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    console.error("[email] send threw", error);
    return {
      ok: false,
      skipped: false,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function appUrl(path = ""): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

function signOff(businessName: string): string {
  return `\n\nThanks,\n${businessName}\n\n—\nSent by ${businessName} via Pet Intake.`;
}

/** Templates are plain-text-friendly (spec §10). */

export function intakeInvitationEmail(input: {
  businessName: string;
  slug: string;
  clientFirstName?: string;
}) {
  const greeting = input.clientFirstName ? `Hi ${input.clientFirstName},` : "Hi,";
  return {
    subject: `${input.businessName}: please complete your pet intake form`,
    text:
      `${greeting}\n\n` +
      `${input.businessName} needs a few details about your pet before your visit — ` +
      `profile, vaccination records, and service waivers. It takes about 5 minutes ` +
      `and works on your phone.\n\n` +
      `Start here: ${appUrl(`/intake/${input.slug}`)}` +
      signOff(input.businessName),
  };
}

export function intakeConfirmationEmail(input: {
  businessName: string;
  clientFirstName: string;
  petNames: string[];
}) {
  const pets = input.petNames.join(", ");
  return {
    subject: `${input.businessName}: we received your intake form`,
    text:
      `Hi ${input.clientFirstName},\n\n` +
      `Thanks — ${input.businessName} has received your intake form for ${pets}.\n\n` +
      `If any vaccination records were missing or undated, ${input.businessName} may ` +
      `follow up to get those on file.` +
      signOff(input.businessName),
  };
}

export function vaxExpiringEmail(input: {
  businessName: string;
  slug: string;
  clientFirstName: string;
  petName: string;
  vaxType: string;
  daysUntil: number;
  expiresAt: Date;
}) {
  const when =
    input.daysUntil === 0
      ? "today"
      : `in ${input.daysUntil} day${input.daysUntil === 1 ? "" : "s"}`;
  return {
    subject: `${input.petName}'s ${input.vaxType} vaccination expires ${when}`,
    text:
      `Hi ${input.clientFirstName},\n\n` +
      `${input.petName}'s ${input.vaxType} vaccination expires ${when} ` +
      `(${formatDate(input.expiresAt)}).\n\n` +
      `${input.businessName} needs an up-to-date record on file. You can upload the ` +
      `new one here: ${appUrl(`/intake/${input.slug}`)}` +
      signOff(input.businessName),
  };
}

export function vaxExpiredEmail(input: {
  businessName: string;
  slug: string;
  clientFirstName: string;
  petName: string;
  vaxType: string;
  expiresAt: Date;
}) {
  return {
    subject: `${input.petName}'s ${input.vaxType} vaccination has expired`,
    text:
      `Hi ${input.clientFirstName},\n\n` +
      `${input.petName}'s ${input.vaxType} vaccination expired on ` +
      `${formatDate(input.expiresAt)} and ${input.businessName} does not have a ` +
      `current record on file.\n\n` +
      `Please upload the updated record here: ${appUrl(`/intake/${input.slug}`)}` +
      signOff(input.businessName),
  };
}

/** Manual nudge from the client detail page (spec §3). */
export function manualReminderEmail(input: {
  businessName: string;
  slug: string;
  clientFirstName: string;
  outstanding: { petName: string; vaxType: string; status: VaxStatus }[];
}) {
  const lines = input.outstanding.map(
    (item) =>
      `  • ${item.petName} — ${item.vaxType}: ${STATUS_LABEL[item.status].toLowerCase()}`,
  );
  return {
    subject: `${input.businessName}: vaccination records needed`,
    text:
      `Hi ${input.clientFirstName},\n\n` +
      `${input.businessName} is missing some up-to-date paperwork:\n\n` +
      `${lines.join("\n")}\n\n` +
      `You can upload records here: ${appUrl(`/intake/${input.slug}`)}` +
      signOff(input.businessName),
  };
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
