"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Loader2, RotateCcw } from "lucide-react";
import type { EmailTemplate, EmailTemplateKey } from "@/app/lib/emailTemplates";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { Field, Notice, Panel, PanelHeader, btnGhost, btnPrimary, inputClass, textareaClass } from "./settingsParts";

const EASE = [0.22, 1, 0.36, 1] as const;

const SAMPLE_VALUES: Record<string, string> = {
  ticketNumber: "TCK-7K3F-9Q2M",
  subject: "Laptop won't turn on",
  assigneeName: "Jane Tech",
  requesterName: "Ahmad Faiz",
  status: "In Progress",
  recipientName: "Jane Tech",
  message: "Still stuck at the boot screen after restarting twice.",
  ticketUrl: "#",
  linkBlock: '<p><a href="#">View ticket</a></p>',
};

function renderSample(template: string): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, token: string) =>
    Object.prototype.hasOwnProperty.call(SAMPLE_VALUES, token) ? SAMPLE_VALUES[token] : match,
  );
}

export default function EmailTemplatesManager({ initialTemplates }: { initialTemplates: EmailTemplate[] }) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [templates, setTemplates] = useState(initialTemplates);
  const [expanded, setExpanded] = useState<EmailTemplateKey | null>(null);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingReset, setPendingReset] = useState<EmailTemplate | null>(null);

  function toggle(t: EmailTemplate) {
    if (expanded === t.key) {
      setExpanded(null);
      return;
    }
    setExpanded(t.key);
    setSubjectDraft(t.subject);
    setBodyDraft(t.body);
    setPreview(false);
    setError(null);
  }

  async function handleSave(t: EmailTemplate) {
    if (!subjectDraft.trim() || !bodyDraft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/admin/settings/email-templates/${t.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subjectDraft.trim(), body: bodyDraft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save template");
      setTemplates((prev) =>
        prev.map((x) => (x.key === t.key ? { ...x, subject: subjectDraft.trim(), body: bodyDraft.trim(), isCustomized: true } : x)),
      );
      setExpanded(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!pendingReset) return;
    setResetting(true);
    try {
      const res = await fetch(`${basePath}/api/admin/settings/email-templates/${pendingReset.key}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not reset template");
      setTemplates((prev) =>
        prev.map((x) =>
          x.key === pendingReset.key ? { ...x, subject: data.subject, body: data.body, isCustomized: false, updatedAt: null, updatedBy: null } : x,
        ),
      );
      if (expanded === pendingReset.key) {
        setSubjectDraft(data.subject);
        setBodyDraft(data.body);
      }
      setPendingReset(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPendingReset(null);
    } finally {
      setResetting(false);
    }
  }

  const customizedCount = templates.filter((t) => t.isCustomized).length;

  return (
    <Panel>
      <PanelHeader
        title="Email templates"
        description={
          <>
            The automated emails PHN Helpdesk sends. Tokens like <code className="font-mono-plex text-[12px] text-muted">{"{{subject}}"}</code> are
            replaced with ticket details when the email goes out.{" "}
            <span className="tabular-nums">{customizedCount > 0 ? `${customizedCount} of ${templates.length} customized.` : "All using the default wording."}</span>
          </>
        }
      />

      {error && (
        <div className="px-[20px] pb-[16px]">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <ul className="flex flex-col border-t border-card-border/60 px-[6px] py-[6px]">
        {templates.map((t) => {
          const isOpen = expanded === t.key;
          return (
            <li key={t.key} className={`rounded-[12px] transition-colors duration-150 ${isOpen ? "bg-surface-2/50" : ""}`}>
              <button
                type="button"
                onClick={() => toggle(t)}
                aria-expanded={isOpen}
                className={`flex w-full items-center gap-[12px] rounded-[12px] px-[14px] py-[12px] text-left transition-colors duration-150 ${
                  isOpen ? "" : "hover:bg-surface-2/50"
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="flex min-w-0 items-center gap-[8px]">
                    <span className="truncate text-[13px] font-medium text-ink">{t.label}</span>
                    {t.isCustomized ? (
                      <span className="inline-flex h-[20px] shrink-0 items-center rounded-full bg-primary-soft px-[7px] text-[11px] font-medium text-primary">
                        Customized
                      </span>
                    ) : (
                      <span className="inline-flex h-[20px] shrink-0 items-center rounded-full bg-surface-2 px-[7px] text-[11px] font-medium text-muted-2">
                        Default
                      </span>
                    )}
                  </span>
                  <span className="truncate text-[12px] text-muted-2">{isOpen ? t.description : t.subject}</span>
                </div>
                <ChevronDown
                  size={16}
                  strokeWidth={1.75}
                  className={`shrink-0 text-faint transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-[14px] px-[14px] pb-[14px] pt-[2px]">
                      <Field label="Subject">
                        <input type="text" value={subjectDraft} onChange={(e) => setSubjectDraft(e.target.value)} className={inputClass} />
                      </Field>

                      <div className="flex flex-col gap-[6px]">
                        <div className="flex items-center justify-between gap-[8px]">
                          <span className="text-[12px] font-medium text-muted">Body (HTML)</span>
                          <div role="tablist" aria-label="Body view" className="inline-flex h-[28px] items-center rounded-[8px] border border-field-border bg-surface-2 p-[2px]">
                            {[
                              { label: "Edit", value: false },
                              { label: "Preview", value: true },
                            ].map((m) => {
                              const active = preview === m.value;
                              return (
                                <button
                                  key={m.label}
                                  type="button"
                                  role="tab"
                                  aria-selected={active}
                                  onClick={() => setPreview(m.value)}
                                  className={`relative h-[22px] rounded-[6px] px-[10px] text-[12px] transition-colors ${active ? "text-ink" : "text-muted-2 hover:text-ink"}`}
                                >
                                  {active && (
                                    <motion.span
                                      layoutId={`template-view-${t.key}`}
                                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                                      className="absolute inset-0 rounded-[6px] bg-surface shadow-card"
                                    />
                                  )}
                                  <span className="relative">{m.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {preview ? (
                          <div className="overflow-hidden rounded-[10px] border border-field-border bg-surface">
                            <div className="flex flex-col gap-[2px] border-b border-card-border/60 bg-surface-2/50 px-[14px] py-[10px]">
                              <span className="text-[11px] text-muted-2">Subject</span>
                              <span className="truncate text-[13px] font-medium text-ink">{renderSample(subjectDraft)}</span>
                            </div>
                            <div
                              className="min-h-[140px] px-[14px] py-[12px] text-[13px] leading-[1.6] text-ink [&_a]:text-primary [&_a]:underline [&_p]:mb-[8px]"
                              dangerouslySetInnerHTML={{ __html: renderSample(bodyDraft) }}
                            />
                          </div>
                        ) : (
                          <textarea
                            value={bodyDraft}
                            onChange={(e) => setBodyDraft(e.target.value)}
                            rows={7}
                            spellCheck={false}
                            className={`${textareaClass} font-mono-plex text-[12px] leading-[20px]`}
                          />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-[6px]">
                        <span className="text-[12px] text-muted-2">Tokens</span>
                        {t.tokens.map((token) => (
                          <code
                            key={token}
                            className="inline-flex h-[22px] items-center rounded-[6px] bg-navy px-[7px] font-mono-plex text-[11px] text-white/85"
                          >
                            {`{{${token}}}`}
                          </code>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-[8px] border-t border-card-border/60 pt-[12px]">
                        {t.isCustomized && (
                          <button type="button" onClick={() => setPendingReset(t)} className={`${btnGhost} hover:text-rose-text`}>
                            <RotateCcw size={14} strokeWidth={1.75} />
                            Reset to default
                          </button>
                        )}
                        <div className="ml-auto flex items-center gap-[8px]">
                          <button type="button" onClick={() => setExpanded(null)} className={btnGhost}>
                            Close
                          </button>
                          <button
                            type="button"
                            disabled={saving || !subjectDraft.trim() || !bodyDraft.trim()}
                            onClick={() => handleSave(t)}
                            className={btnPrimary}
                          >
                            {saving && <Loader2 size={14} strokeWidth={2} className="animate-spin" />}
                            {saving ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={!!pendingReset}
        title="Reset this template?"
        description={pendingReset ? `"${pendingReset.label}" will go back to its default subject and wording.` : undefined}
        danger
        loading={resetting}
        confirmLabel="Reset"
        onCancel={() => setPendingReset(null)}
        onConfirm={handleReset}
      />
    </Panel>
  );
}
