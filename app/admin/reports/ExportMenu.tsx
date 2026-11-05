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
        className="inline-flex h-[32px] items-center gap-[8px] whitespace-nowrap rounded-[8px] border border-field-border bg-surface px-[12px] text-[13px] font-medium text-ink transition-colors hover:border-field-border-hover hover:bg-surface-2"
      >
        <Download size={14} strokeWidth={2} />
        Export
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,23,42,0.45)] px-[16px]"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full max-w-[520px] flex-col gap-[16px] rounded-[16px] border border-card-border/60 bg-surface p-[20px] shadow-[0_24px_48px_rgba(15,23,42,0.25)]"
            >
              <div className="flex items-start justify-between gap-[12px]">
                <div className="flex flex-col gap-[3px]">
                  <span className="text-[15px] font-semibold text-ink">Export report</span>
                  <p className="text-[13px] leading-[1.5] text-muted-2">
                    One Excel file, one sheet per dataset you include below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>

              <div className="flex max-h-[380px] flex-col gap-[8px] overflow-y-auto">
                {EXPORT_DATASETS.map((d) => {
                  const isIncluded = included[d.key];
                  const selectedForDataset = columns[d.key];
                  const isExpanded = expanded === d.key;
                  return (
                    <div key={d.key} className="rounded-[12px] border border-card-border/60 bg-surface">
                      <div className="flex items-center gap-[10px] px-[12px] py-[10px]">
                        <label className="flex flex-1 cursor-pointer items-center gap-[10px]">
                          <span
                            onClick={() => toggleDataset(d.key)}
                            className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                              isIncluded
                                ? "border-primary bg-primary text-white"
                                : "border-field-border-hover bg-surface"
                            }`}
                          >
                            {isIncluded && <Check size={11} strokeWidth={3} />}
                          </span>
                          <span className="flex flex-col gap-[2px]">
                            <span className="text-[13px] font-medium text-ink">{d.label}</span>
                            <span className="text-[12px] text-muted-2">{d.description}</span>
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setExpanded((prev) => (prev === d.key ? null : d.key))}
                          className="inline-flex h-[26px] items-center gap-[4px] whitespace-nowrap rounded-[6px] px-[6px] text-[12px] text-muted-2 transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                          {selectedForDataset.length}/{d.columns.length} columns
                          <ChevronDown
                            size={14}
                            strokeWidth={1.75}
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
                            className="overflow-hidden border-t border-card-border/60"
                          >
                            <div className="grid grid-cols-2 gap-[4px] px-[10px] py-[8px]">
                              {d.columns.map((c) => {
                                const checked = selectedForDataset.includes(c.key);
                                return (
                                  <label
                                    key={c.key}
                                    className="inline-flex h-[28px] cursor-pointer items-center gap-[8px] rounded-[6px] px-[6px] text-[13px] text-ink transition-colors hover:bg-surface-2"
                                  >
                                    <span
                                      className={`flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                                        checked
                                          ? "border-primary bg-primary text-white"
                                          : "border-field-border-hover bg-surface"
                                      }`}
                                    >
                                      {checked && <Check size={10} strokeWidth={3} />}
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
                <div className="flex items-center gap-[6px] text-[13px] text-amber-text">
                  <AlertTriangle size={14} strokeWidth={2} />
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between gap-[10px] pt-[4px]">
                <span className="text-[12px] text-muted-2">
                  {includedCount} of {EXPORT_DATASETS.length} sheets selected
                </span>
                <div className="flex items-center gap-[8px]">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-[32px] rounded-[8px] border border-field-border bg-surface px-[12px] text-[13px] font-medium text-ink transition-colors hover:border-field-border-hover hover:bg-surface-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={exporting || includedCount === 0}
                    className="inline-flex h-[32px] items-center gap-[8px] whitespace-nowrap rounded-[8px] bg-primary px-[12px] text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                  >
                    <Download size={14} strokeWidth={2} />
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
