import Link from "next/link";
import { VaxStatusTag } from "@/components/vax/vax-status";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { requireBusiness } from "@/lib/server/auth";
import { getClientRows } from "@/lib/server/queries";
import { clientSearchSchema } from "@/lib/validation";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: PageProps<"/dashboard/clients">) {
  const business = await requireBusiness();
  const { q } = await searchParams;
  const parsed = clientSearchSchema.safeParse({ search: typeof q === "string" ? q : undefined });
  const search = parsed.success ? parsed.data.search : undefined;
  const clients = await getClientRows(business.id, { search });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label text-mute">
            {clients.length} {search ? "matching" : ""} client{clients.length === 1 ? "" : "s"}
          </span>
          <h1 className="display text-4xl">Clients</h1>
        </div>
        {/* GET form keeps the search in the URL, so it survives a reload. */}
        <form className="flex w-full items-stretch sm:w-auto" role="search">
          <Input
            name="q"
            type="search"
            defaultValue={search ?? ""}
            placeholder="Name, email or pet"
            aria-label="Search clients"
            className="min-w-0 flex-1 border-r-0 sm:w-64"
          />
          <Button type="submit" variant="primary">
            Search
          </Button>
          {search ? (
            <Link href="/dashboard/clients" className={buttonVariants({ variant: "ghost" })}>
              Clear
            </Link>
          ) : null}
        </form>
      </div>

      {clients.length === 0 ? (
        <p className="border border-dashed border-ink p-10 text-center text-sm text-mute">
          {search ? "No clients match that search." : "No clients yet. Share your intake link from the overview."}
        </p>
      ) : (
        <div className="overflow-x-auto border border-ink">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-ink">
              <tr className="label text-mute">
                <th scope="col" className="px-4 py-3 font-normal">
                  Client
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Pets
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Vaccinations
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Waivers
                </th>
                <th scope="col" className="px-4 py-3 text-right font-normal">
                  Submitted
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-wash">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {client.firstName} {client.lastName}
                    </Link>
                    <p className="truncate text-xs text-mute">{client.email}</p>
                  </td>
                  <td className="px-4 py-3">{client.petNames.join(", ") || "—"}</td>
                  <td className="px-4 py-3">
                    <VaxStatusTag status={client.status} />
                  </td>
                  <td className="px-4 py-3">
                    {client.unsignedWaivers > 0 ? (
                      <span className="label border border-ink px-2 py-0.5">{client.unsignedWaivers} unsigned</span>
                    ) : (
                      <span className="text-mute">All signed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-mute">{formatDate(client.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
