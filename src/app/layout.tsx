import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { GeistMono } from "geist/font/mono";
import { connection } from "next/server";
import { PostHogIdentify } from "@/components/site/posthog-identify";
import { Toaster } from "@/components/ui/toaster";
import { site } from "@/config/site";
import { isClerkConfigured } from "@/lib/server/env";
import "./globals.css";
import "./clerk-theme.css";

// Fonts are bundled locally so builds never depend on Google Fonts being reachable.
const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk-Variable.woff2",
  weight: "300 700",
  variable: "--font-space-grotesk",
  display: "swap",
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

export const viewport: Viewport = {
  themeColor: site.themeColor,
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The nonce-based CSP (src/proxy.ts) needs every page rendered per request;
  // a statically rendered page has no request to read the nonce from.
  await connection();

  const content = (
    <>
      {children}
      <Toaster />
    </>
  );

  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        {/*
          Conditional because ClerkProvider throws without a publishable key,
          and the public intake form must still render before credentials are
          provisioned. Every Clerk component below it is guarded the same way
          (see src/lib/server/env.ts).

          dynamic: renders per request so Clerk can tag its own <script> with
          the CSP nonce (src/lib/clerk-csp.ts). Without it, a strict CSP blocks clerk-js.
        */}
        {isClerkConfigured() ? (
          <ClerkProvider dynamic appearance={{ theme: shadcn, variables: { borderRadius: "0px" } }}>
            {content}
            <PostHogIdentify />
          </ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
