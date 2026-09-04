import { NextResponse } from "next/server";
import type { tickets } from "@prisma/client";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";

const COLUMNS: { key: keyof tickets; header: string }[] = [
  { key: "ticket_number", header: "Ticket Number" },
  { key: "category", header: "Category" },
  { key: "team", header: "Team" },
  { key: "priority", header: "Priority" },
  { key: "status", header: "Status" },
  { key: "assigned_to", header: "Assigned To" },
  { key: "name", header: "Requester Name" },
  { key: "email", header: "Email" },
  { key: "staff_no", header: "Staff No" },
  { key: "phone", header: "Phone" },
  { key: "location", header: "Location" },
  { key: "department", header: "Department" },
  { key: "subject", header: "Subject" },
  { key: "created_at", header: "Submitted" },
];

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET() {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const permissions = await getPermissionsFor(session.staffId);
  if (!permissions.viewReports) {
    return NextResponse.json({ error: "You don't have permission to view reports" }, { status: 403 });
  }

  const allTickets = await prisma.tickets.findMany({ orderBy: { created_at: "desc" } });

  const lines = [
    COLUMNS.map((c) => csvEscape(c.header)).join(","),
    ...allTickets.map((t) => COLUMNS.map((c) => csvEscape(t[c.key])).join(",")),
  ];
  const csv = lines.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tickets-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
