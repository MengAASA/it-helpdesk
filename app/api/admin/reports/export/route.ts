import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { countBy, getAgentPerformance } from "@/app/lib/reportsData";
import {
  EXPORT_DATASETS,
  getDataset,
  type ExportDataset,
  type ExportDatasetKey,
} from "@/app/lib/reportsExportColumns";

type Row = Record<string, unknown>;

async function getTicketsRows(): Promise<Row[]> {
  const allTickets = await prisma.tickets.findMany({ orderBy: { created_at: "desc" } });
  return allTickets.map((t) => ({
    ticket_number: t.ticket_number,
    category: t.category,
    team: t.team,
    priority: t.priority,
    status: t.status,
    assigned_to: t.assigned_to,
    name: t.name,
    email: t.email,
    staff_no: t.staff_no,
    phone: t.phone,
    location: t.location,
    department: t.department,
    subject: t.subject,
    created_at: t.created_at,
  }));
}

async function getCountRows(column: "status" | "team" | "priority"): Promise<Row[]> {
  const rows = await countBy(column);
  const total = rows.reduce((a, r) => a + r.count, 0);
  return rows.map((r) => ({
    label: r.label,
    count: r.count,
    percent: total > 0 ? `${Math.round((r.count / total) * 100)}%` : "0%",
  }));
}

async function getAgentRows(): Promise<Row[]> {
  const agentRows = await getAgentPerformance();
  return agentRows.map((a) => {
    const csatSample = a.csatUp + a.csatDown;
    return {
      name: a.name,
      assigned: a.assigned,
      closed: a.closed,
      avgResolutionHours: a.avgResolutionHours === null ? "" : a.avgResolutionHours.toFixed(1),
      csatUp: a.csatUp,
      csatDown: a.csatDown,
      csatPct: csatSample > 0 ? Math.round((a.csatUp / csatSample) * 100) : "",
    };
  });
}

async function getRowsFor(dataset: ExportDatasetKey): Promise<Row[]> {
  switch (dataset) {
    case "tickets":
      return getTicketsRows();
    case "status":
      return getCountRows("status");
    case "team":
      return getCountRows("team");
    case "priority":
      return getCountRows("priority");
    case "agent":
      return getAgentRows();
  }
}

type RequestedSheet = { dataset: string; columns?: unknown };

export async function POST(req: Request) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const permissions = await getPermissionsFor(session.staffId, session.role);
  if (!permissions.viewReports) {
    return NextResponse.json({ error: "You don't have permission to view reports" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const requested: RequestedSheet[] = Array.isArray(body?.sheets) ? body.sheets : [];
  if (requested.length === 0) {
    return NextResponse.json({ error: "Select at least one dataset to export" }, { status: 400 });
  }

  const sheets: { dataset: ExportDataset; columns: { key: string; label: string }[] }[] = [];
  for (const r of requested) {
    if (typeof r.dataset !== "string") continue;
    const dataset = getDataset(r.dataset);
    if (!dataset) continue;
    const requestedKeys = Array.isArray(r.columns) ? r.columns.filter((k): k is string => typeof k === "string") : [];
    const columns =
      requestedKeys.length > 0 ? dataset.columns.filter((c) => requestedKeys.includes(c.key)) : dataset.columns;
    if (columns.length === 0) continue;
    sheets.push({ dataset, columns });
  }

  if (sheets.length === 0) {
    return NextResponse.json({ error: "No valid datasets or columns selected" }, { status: 400 });
  }

  // Keep sheets in a stable, predictable order regardless of the order the client sent them in.
  sheets.sort(
    (a, b) => EXPORT_DATASETS.findIndex((d) => d.key === a.dataset.key) - EXPORT_DATASETS.findIndex((d) => d.key === b.dataset.key)
  );

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  for (const { dataset, columns } of sheets) {
    const rows = await getRowsFor(dataset.key);
    const sheet = workbook.addWorksheet(dataset.label.slice(0, 31));
    sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: Math.max(c.label.length + 4, 14) }));
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) {
      sheet.addRow(columns.map((c) => row[c.key] ?? ""));
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reports-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
