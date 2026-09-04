"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Hash, IdCard, AlertTriangle } from "lucide-react";
import Avatar from "@/app/components/Avatar";

type Reply = {
  authorName: string;
  message: string;
  createdAt: string;
};

type Ticket = {
  ticketNumber: string;
  category: string;
  team: string;
  priority: string;
  status: string;
  name: string;
  subject: string;
  message: string;
  createdAt: string;
  userRequestTypes: string[];
  attachments: { filename: string; size: number }[];
  replies: Reply[];
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

const STATUS_STYLES: Record<string, string> = {
  Open: "border-[color:var(--color-blue)]/25 bg-[color:var(--color-blue-light)] text-[color:var(--color-blue-text)]",
  "In Progress": "border-amber-border bg-amber-bg text-amber-text-strong",
  Closed: "border-[color:var(--color-emerald)]/25 bg-[color:var(--color-emerald-light)] text-[color:var(--color-emerald-text)]",
};

const PRIORITY_STYLES: Record<string, string> = {
  High: "border-[color:var(--color-rose)]/25 bg-[color:var(--color-rose-light)] text-[color:var(--color-rose-text)]",
  Normal: "border-pill-border bg-pill-bg text-pill-text",
  Low: "border-[color:var(--color-emerald)]/25 bg-[color:var(--color-emerald-light)] text-[color:var(--color-emerald-text)]",
};

const PRIORITY_BAR: Record<string, string> = {
  High: "border-l-[color:var(--color-rose)]",
  Normal: "border-l-[color:var(--color-blue)]/40",
  Low: "border-l-[color:var(--color-emerald)]/40",
};

const inputClass =
  "w-full rounded-[7.5px] border border-card-border bg-paper px-[12px] py-[10.5px] font-body text-xs text-ink outline-none focus:border-[color:var(--color-blue)]";
const labelClass = "text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-2";

export default function Tickets() {
  const [ticketNumber, setTicketNumber] = useState("");
  const [staffNo, setStaffNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Ticket[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketNumber.trim() && !staffNo.trim()) {
      setError("Enter a ticket number or staff ID.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (ticketNumber.trim()) params.set("ticketNumber", ticketNumber.trim());
      if (staffNo.trim()) params.set("staffNo", staffNo.trim());
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/tickets?${params.toString()}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not look up tickets");
      setResults(data);
    } catch (err) {
      setError((err as Error).message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col gap-[30px] px-[42px] pb-[67.5px] pt-[42px]">
      <div className="flex flex-col gap-[10.5px]">
        <h1 className="font-heading text-[27px] font-semibold tracking-[-0.02em]">
          View my tickets
        </h1>
        <p className="max-w-[495px] text-[12.75px] leading-[1.6] text-muted">
          Enter your ticket number or staff ID to check the status of tickets you have
          submitted.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-[15px] rounded-[14px] border border-card-border bg-white px-[21px] py-[19.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      >
        <div className="grid grid-cols-2 gap-[15px]">
          <div className="flex flex-col gap-[6px]">
            <label htmlFor="ticketNumber" className={`${labelClass} inline-flex items-center gap-[5.25px]`}>
              <Hash size={11} strokeWidth={2.25} className="text-faint" />
              Ticket Number
            </label>
            <input
              id="ticketNumber"
              type="text"
              placeholder="e.g. TCK-XXXXXXX"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label htmlFor="staffNo" className={`${labelClass} inline-flex items-center gap-[5.25px]`}>
              <IdCard size={11} strokeWidth={2.25} className="text-faint" />
              Staff No
            </label>
            <input
              id="staffNo"
              type="text"
              value={staffNo}
              onChange={(e) => setStaffNo(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-[7.5px] rounded-[7.5px] border border-amber-border bg-amber-bg px-[12px] py-[9px] text-[9.75px] text-amber-text-strong">
            <AlertTriangle size={12} strokeWidth={2.25} />
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-fit items-center gap-[7.5px] whitespace-nowrap rounded-full bg-admin-gradient px-[19.5px] py-[9.75px] text-[10.5px] font-semibold text-paper shadow-[0_4px_12px_rgba(37,99,235,0.25)] transition-transform hover:-translate-y-[1px] disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <Search size={13} strokeWidth={2.25} />
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {results && results.length === 0 && (
        <p className="text-[12.75px] text-muted">No tickets found.</p>
      )}

      {results && results.length > 0 && (
        <div className="flex flex-col gap-[9px]">
          <span className="text-[9px] text-faint">
            {results.length} ticket{results.length > 1 ? "s" : ""} found — click a ticket number for full details
          </span>
          <div className="overflow-x-auto rounded-[14px] border border-card-border shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <table className="w-full min-w-[760px] border-collapse text-left text-[10.5px]">
              <thead>
                <tr className="border-b border-card-border bg-result-bg/50 text-[9px] uppercase tracking-[0.06em] text-muted-2">
                  <th className="px-[15px] py-[10.5px] font-semibold">Ticket #</th>
                  <th className="px-[15px] py-[10.5px] font-semibold">Subject</th>
                  <th className="px-[15px] py-[10.5px] font-semibold">Requester</th>
                  <th className="px-[15px] py-[10.5px] font-semibold">Category</th>
                  <th className="px-[15px] py-[10.5px] font-semibold">Status</th>
                  <th className="px-[15px] py-[10.5px] font-semibold">Submitted</th>
                  <th className="px-[15px] py-[10.5px] font-semibold">Priority</th>
                </tr>
              </thead>
              <tbody>
                {results.map((t, i) => (
                  <tr
                    key={t.ticketNumber}
                    className={`border-b border-divider transition-colors last:border-b-0 hover:bg-result-bg/40 ${
                      i % 2 === 1 ? "bg-result-bg/20" : ""
                    }`}
                  >
                    <td
                      className={`whitespace-nowrap border-l-[3px] px-[15px] py-[12px] font-mono-plex ${
                        PRIORITY_BAR[t.priority] ?? PRIORITY_BAR.Normal
                      }`}
                    >
                      <Link
                        href={`/tickets/${t.ticketNumber}`}
                        className="inline-flex items-center gap-[4.5px] rounded-full border border-[color:var(--color-blue)]/25 bg-[color:var(--color-blue-light)] px-[9px] py-[4.5px] text-[9.75px] font-semibold text-[color:var(--color-blue-text)] transition-colors hover:bg-[color:var(--color-blue)] hover:text-paper"
                      >
                        {t.ticketNumber}
                      </Link>
                    </td>
                    <td className="px-[15px] py-[12px]">
                      <span className="font-medium text-ink">{t.subject}</span>
                      {t.replies.length > 0 && (
                        <span className="ml-[7.5px] inline-flex items-center rounded-full border border-[color:var(--color-emerald)]/25 bg-[color:var(--color-emerald-light)] px-[6px] py-[1.5px] text-[8px] font-semibold text-[color:var(--color-emerald-text)]">
                          {t.replies.length} update{t.replies.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-[15px] py-[12px] text-muted">
                      <div className="flex items-center gap-[7.5px]">
                        <Avatar name={t.name} size={22} />
                        <span className="text-ink">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-[15px] py-[12px] text-muted">{t.category}</td>
                    <td className="whitespace-nowrap px-[15px] py-[12px]">
                      <span
                        className={`rounded-full border px-[8.25px] py-[3.75px] text-[9px] font-semibold ${
                          STATUS_STYLES[t.status] ?? STATUS_STYLES.Open
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-[15px] py-[12px] text-[9px] text-faint">
                      {formatTimestamp(t.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-[15px] py-[12px]">
                      <span
                        className={`rounded-full border px-[8.25px] py-[3.75px] text-[9px] font-semibold ${
                          PRIORITY_STYLES[t.priority] ?? PRIORITY_STYLES.Normal
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
