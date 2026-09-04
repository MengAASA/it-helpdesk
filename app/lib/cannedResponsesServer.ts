import { prisma } from "@/app/lib/db";
import type { CannedResponse } from "@/app/lib/cannedResponses";

export async function getCannedResponses(): Promise<CannedResponse[]> {
  const rows = await prisma.canned_responses.findMany({
    select: { id: true, title: true, body: true, is_public: true },
    orderBy: { title: "asc" },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, body: r.body, isPublic: !!r.is_public }));
}
