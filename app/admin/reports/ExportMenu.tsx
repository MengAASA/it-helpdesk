"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Check, X, ChevronDown, AlertTriangle } from "lucide-react";
import { EXPORT_DATASETS, type ExportDatasetKey } from "@/app/lib/reportsExportColumns";

function allColumnsByDataset(): Record<ExportDatasetKey, string[]> {
  const entries = EXPORT_DATASETS.map((d) => [d.key, d.columns.map((c) => c.key)] as const);
  return Object.fromEntries(entries) as Record<ExportDatasetKey, string[]>;
}

export default function ExportMenu() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [open, setOpen] = useState(false);
  const [included, setIncluded] = useState<Record<ExportDatasetKey, boolean>>(() =>
    Object.fromEntries(EXPORT_DATASETS.map((d) => [d.key, true])) as Record<ExportDatasetKey, boolean>
  );
  const [columns, setColumns] = useState<Record<ExportDatasetKey, string[]>>(allColumnsByDataset);
  const [expanded, setExpanded] = useState<ExportDatasetKey | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function toggleDataset(key: ExportDatasetKey) {
    setIncluded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleColumn(key: ExportDatasetKey, colKey: string) {
    setColumns((prev) => {
      const current = prev[key];
      const next = current.includes(colKey) ? current.filter((k) => k !== colKey) : [...current, colKey];
      return { ...prev, [key]: next };
    });
  }

  const includedCount = EXPORT_DATASETS.filter((d) => included[d.key] && columns[d.key].length > 0).length;

  async function handleExport() {
    setError(null);
    const sheets = EXPORT_DATASETS.filter((d) => included[d.key] && columns[d.key].length > 0).map((d) => ({
      dataset: d.key,
      columns: columns[d.key],
    }));
    if (sheets.length === 0) {
      setError("Select at least one dataset with at least one column.");
      return;
    }

    setExporting(true);
    try {
      const res = await fetch(`${basePath}/api/admin/reports/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheets }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not generate export");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reports-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full border border-card-border bg-white px-[13.5px] py-[8px] text-[9.75px] font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Download size={12} strokeWidth={2.25} />
        Export
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,23,42,0.45)] px-[21px]"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="flex w-full max-w-[480px] flex-col gap-[15px] rounded-[14px] border border-card-border bg-white px-[21px] py-[19.5px] shadow-[0_24px_48px_rgba(15,23,42,0.25)]"
            >
              <div className="flex items-start justify-between gap-[12px]">
                <div className="flex flex-col gap-[3px]">
                  <span className="text-[12.75px] font-semibold text-ink">Export report</span>
                  <p className="text-[10.5px] leading-[1.5] text-muted">
                    One Excel file, one sheet per dataset you include below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full text-faint hover:bg-result-bg hover:text-ink"
                >
                  <X size={14} strokeWidth={2.25} />
                </button>
              </div>

              <div className="flex max-h-[340px] flex-col gap-[7.5px] overflow-y-auto">
                {EXPORT_DATASETS.map((d) => {
                  const isIncluded = included[d.key];
                  const selectedForDataset = columns[d.key];
                  const isExpanded = expanded === d.key;
                  return (
                    <div key={d.key} className="rounded-[10px] border border-card-border bg-paper">
                      <div className="flex items-center gap-[9px] px-[10.5px] py-[9px]">
                        <label className="flex flex-1 cursor-pointer items-center gap-[9px]">
                          <span
                            onClick={() => toggleDataset(d.key)}
                            className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                              isIncluded
                                ? "border-[color:var(--color-blue)] bg-[color:var(--color-blue)] text-paper"
                                : "border-card-border bg-white"
                            }`}
                          >
                            {isIncluded && <Check size={11} strokeWidth={3} />}
                          </span>
                          <span className="flex flex-col gap-[1.5px]">
                            <span className="text-[10.5px] font-semibold text-ink">{d.label}</span>
                            <span className="text-[9px] text-faint">{d.description}</span>
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setExpanded((prev) => (prev === d.key ? null : d.key))}
                          className="inline-flex items-center gap-[3px] whitespace-nowrap text-[9px] font-semibold text-muted hover:text-primary"
                        >
                          {selectedForDataset.length}/{d.columns.length} columns
                          <ChevronDown
                            size={11}
                            strokeWidth={2.25}
                            className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
                            className="overflow-hidden border-t border-card-border"
                          >
                            <div className="grid grid-cols-2 gap-[4.5px] px-[10.5px] py-[9px]">
                              {d.columns.map((c) => {
                                const checked = selectedForDataset.includes(c.key);
                                return (
                                  <label
                                    key={c.key}
                                    className="inline-flex cursor-pointer items-center gap-[6px] rounded-[6px] px-[6px] py-[4.5px] text-[9.75px] text-ink hover:bg-white"
                                  >
                                    <span
                                      className={`flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                                        checked
                                          ? "border-[color:var(--color-blue)] bg-[color:var(--color-blue)] text-paper"
                                          : "border-card-border bg-white"
                                      }`}
                                    >
                                      {checked && <Check size={9} strokeWidth={3} />}
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleColumn(d.key, c.key)}
                                      className="sr-only"
                                    />
                                    <span className="truncate">{c.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="flex items-center gap-[6px] text-[9px] font-medium text-amber-text-strong">
                  <AlertTriangle size={11} strokeWidth={2.25} />
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between gap-[9px] pt-[3px]">
                <span className="text-[9px] text-faint">
                  {includedCount} of {EXPORT_DATASETS.length} sheets selected
                </span>
                <div className="flex items-center gap-[9px]">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-card-border bg-paper px-[15px] py-[7.5px] text-[9.75px] font-semibold text-muted hover:border-primary/40 hover:text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={exporting || includedCount === 0}
                    className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full bg-admin-gradient px-[15px] py-[7.5px] text-[9.75px] font-semibold text-paper disabled:opacity-60"
                  >
                    <Download size={12} strokeWidth={2.25} />
                    {exporting ? "Generating…" : "Export .xlsx"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
