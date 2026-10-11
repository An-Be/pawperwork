import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Toaster } from "@/components/ui/sonner";
import { isClerkConfigured } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Rounded, warm display face for headings — the body stays on Geist Sans
// (clean, highly legible for a form people fill in on their phone), while
// headings carry the "friendly neighborhood pet business" personality.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Pawperwork: Intake and Vax Tracking for Pet Care",
    template: "%s · Pawperwork",
  },
  description:
    "One branded intake link for groomers, boarders, daycares and walkers. " +
    "Collect pet profiles, vaccination records and signed waivers, and never " +
    "chase an expired rabies certificate again.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const content = (
    <>
      {children}
      <Toaster />
    </>
  );

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/*
          ClerkProvider belongs INSIDE <body>, not wrapping <html> — wrapping
          the document element is not supported and can inject markup outside
          the body.

          It is conditional because ClerkProvider throws without a publishable
          key, and the public intake form must still render before credentials
          are provisioned. Every Clerk component below it is guarded the same
          way; see src/lib/env.ts.
        */}
        {isClerkConfigured() ? (
          // shadcn theme, since this project uses shadcn/ui (components.json).
          <ClerkProvider appearance={{ theme: shadcn }}>{content}</ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
