import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { LayoutGrid, PawPrint, Settings as SettingsIcon, Users } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { isClerkConfigured } from "@/lib/env";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  // Redirects to sign-in, or to onboarding if there is no business row yet.
  const business = await requireBusiness();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <PawPrint className="size-4" aria-hidden />
            </span>
            <span className="font-heading font-bold">{business.name}</span>
          </Link>
          <nav className="flex flex-1 items-center gap-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            ))}
          </nav>
          {isClerkConfigured() ? <UserButton /> : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
