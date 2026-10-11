import Link from "next/link";
import { PawPrint, Search } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { getClientRows } from "@/lib/queries";
import { formatDate } from "@/lib/email";
import { VaxStatusBadge } from "@/components/ui/vax-status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

/** First letters of each name, for the warm little avatar circle. */
function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export default async function ClientsPage({
  searchParams,
}: PageProps<"/dashboard/clients">) {
  const business = await requireBusiness();
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : undefined;
  const clients = await getClientRows(business.id, { search });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Clients
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clients.length} {search ? "matching" : ""} client
            {clients.length === 1 ? "" : "s"}
          </p>
        </div>
        {/* GET form keeps the search in the URL, so it is shareable. */}
        <form className="flex gap-2" role="search">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={search ?? ""}
              placeholder="Search name, email or pet"
              aria-label="Search clients"
              className="w-64 pl-8"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
          {search ? (
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/dashboard/clients" />}
            >
              Clear
            </Button>
          ) : null}
        </form>
      </div>

      {clients.length === 0 ? (
        <Card className="items-center gap-3 border border-dashed py-14 text-center ring-0 shadow-none">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <PawPrint className="size-5" aria-hidden />
          </span>
          <p className="px-4 text-sm text-muted-foreground">
            {search
              ? "No clients match that search."
              : "No clients yet. Share your intake link from the overview page."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Pets</TableHead>
                <TableHead>Vaccinations</TableHead>
                <TableHead>Waivers</TableHead>
                <TableHead className="text-right">Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                        {initials(client.firstName, client.lastName)}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {client.firstName} {client.lastName}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {client.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {client.petNames.join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <VaxStatusBadge status={client.status} />
                  </TableCell>
                  <TableCell>
                    {client.unsignedWaivers > 0 ? (
                      <Badge variant="outline">
                        {client.unsignedWaivers} unsigned
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        All signed
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDate(client.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
