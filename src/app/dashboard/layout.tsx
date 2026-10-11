import Link from "next/link";
import type { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Shell } from "@/components/ui/shell";
import { requireBusiness } from "@/lib/server/auth";
import { isClerkConfigured } from "@/lib/server/env";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Redirects to sign-in, or to onboarding if there is no business row yet.
  await requireBusiness();

  return (
    <>
      <SiteHeader
        right={
          <>
            <nav aria-label="Dashboard" className="flex items-center gap-4">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-ink">
                  {item.label}
                </Link>
              ))}
            </nav>
            {isClerkConfigured() ? <UserButton /> : null}
          </>
        }
      />
      {/* Wider than the template's columns: the client list is a table. */}
      <Shell width="wide" className="max-w-5xl">
        <main className="flex flex-1 flex-col py-8">{children}</main>
        <SiteFooter />
      </Shell>
    </>
  );
}
