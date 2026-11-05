import type { Metadata } from "next";
import { prisma } from "@/app/lib/db";
import { getCategories } from "@/app/lib/categoriesServer";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import RestrictedMessage from "@/app/components/RestrictedMessage";
import CategoriesManager, { type CategoryUsage } from "./CategoriesManager";

export const metadata: Metadata = {
  title: "Categories · Admin",
};

/** dd/mm/yyyy, the same date format as the tickets list. */
function ddmmyyyy(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function Header() {
  return (
    <div className="flex flex-col gap-[4px]">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Categories</h1>
      <p className="text-[13px] text-muted-2">Each category sends new tickets to a team. Add or remove them here.</p>
    </div>
  );
}

export default async function AdminCategories() {
  const session = await getIamsSession();
  const permissions = session ? await getPermissionsFor(session.staffId, session.role) : null;
  if (!permissions?.manageCategories) {
    return (
      <div className="flex flex-col gap-[16px]">
        <Header />
        <RestrictedMessage message="You don't have permission to manage categories." />
      </div>
    );
  }

  const [categories, totals, open] = await Promise.all([
    getCategories(),
    prisma.tickets.groupBy({ by: ["category"], _count: { _all: true }, _max: { created_at: true } }),
    prisma.tickets.groupBy({ by: ["category"], where: { status: { not: "Closed" } }, _count: { _all: true } }),
  ]);

  // Per category name, straight from the tickets table.
  const openCounts = new Map(open.map((o) => [o.category, o._count._all]));
  const usage: Record<string, CategoryUsage> = Object.fromEntries(
    totals.map((t) => [
      t.category,
      {
        tickets: t._count._all,
        open: openCounts.get(t.category) ?? 0,
        lastTicket: t._max.created_at ? ddmmyyyy(t._max.created_at) : null,
        lastTicketAt: t._max.created_at ? t._max.created_at.getTime() : 0,
      },
    ]),
  );

  return (
    <div className="flex flex-col gap-[16px]">
      <Header />
      <CategoriesManager initialCategories={categories} usage={usage} />
    </div>
  );
}
