import { prisma } from "@/app/lib/db";
import type { Category } from "@/app/lib/categories";

export async function getCategories(): Promise<Category[]> {
  const rows = await prisma.categories.findMany({
    select: { id: true, name: true, team: true },
    orderBy: [{ team: "asc" }, { name: "asc" }],
  });
  return rows.map((r) => ({ id: r.id, name: r.name, team: r.team }));
}
