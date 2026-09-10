export type ExportDatasetKey = "tickets" | "status" | "team" | "priority" | "agent";

export type ExportColumn = { key: string; label: string };

export type ExportDataset = {
  key: ExportDatasetKey;
  label: string;
  description: string;
  columns: ExportColumn[];
};

export const EXPORT_DATASETS: ExportDataset[] = [
  {
    key: "tickets",
    label: "Ticket list",
    description: "Every ticket, one row each",
    columns: [
      { key: "ticket_number", label: "Ticket Number" },
      { key: "category", label: "Category" },
      { key: "team", label: "Team" },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status" },
      { key: "assigned_to", label: "Assigned To" },
      { key: "name", label: "Requester Name" },
      { key: "email", label: "Email" },
      { key: "staff_no", label: "Staff No" },
      { key: "phone", label: "Phone" },
      { key: "location", label: "Location" },
      { key: "department", label: "Department" },
      { key: "subject", label: "Subject" },
      { key: "created_at", label: "Submitted" },
    ],
  },
  {
    key: "status",
    label: "By status",
    description: "Ticket counts per status",
    columns: [
      { key: "label", label: "Status" },
      { key: "count", label: "Count" },
      { key: "percent", label: "Percent" },
    ],
  },
  {
    key: "team",
    label: "By team",
    description: "Ticket counts per team",
    columns: [
      { key: "label", label: "Team" },
      { key: "count", label: "Count" },
      { key: "percent", label: "Percent" },
    ],
  },
  {
    key: "priority",
    label: "By priority",
    description: "Ticket counts per priority",
    columns: [
      { key: "label", label: "Priority" },
      { key: "count", label: "Count" },
      { key: "percent", label: "Percent" },
    ],
  },
  {
    key: "agent",
    label: "By agent",
    description: "Workload, resolution time, CSAT per agent",
    columns: [
      { key: "name", label: "Agent" },
      { key: "assigned", label: "Assigned" },
      { key: "closed", label: "Closed" },
      { key: "avgResolutionHours", label: "Avg Resolution (hours)" },
      { key: "csatUp", label: "CSAT Up" },
      { key: "csatDown", label: "CSAT Down" },
      { key: "csatPct", label: "CSAT %" },
    ],
  },
];

export function getDataset(key: string): ExportDataset | undefined {
  return EXPORT_DATASETS.find((d) => d.key === key);
}
