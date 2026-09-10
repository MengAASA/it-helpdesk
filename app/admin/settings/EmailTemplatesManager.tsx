"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, RotateCcw, Save, AlertTriangle, Eye, EyeOff, Braces } from "lucide-react";
import type { EmailTemplate, EmailTemplateKey } from "@/app/lib/emailTemplates";
import ConfirmDialog from "@/app/components/ConfirmDialog";

const SAMPLE_VALUES: Record<string, string> = {
  ticketNumber: "TCK-SAMPLE1234",
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
    Object.prototype.hasOwnProperty.call(SAMPLE_VALUES, token) ? SAMPLE_VALUES[token] : match
  );
}

export default function EmailTemplatesManager({
  initialTemplates,
}: {
  initialTemplates: EmailTemplate[];
}) {
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
        prev.map((x) =>
          x.key === t.key
            ? { ...x, subject: subjectDraft.trim(), body: bodyDraft.trim(), isCustomized: true }
            : x
        )
      );
      setExpanded(null);
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
          x.key === pendingReset.key
            ? { ...x, subject: data.subject, body: data.body, isCustomized: false, updatedAt: null, updatedBy: null }
            : x
        )
      );
      if (expanded === pendingReset.key) {
        setSubjectDraft(data.subject);
        setBodyDraft(data.body);
      }
      setPendingReset(null);
    } catch (err) {
      setError((err as Error).message);
      setPendingReset(null);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex flex-col gap-[15px]">
      {error && (
        <div className="flex items-center gap-[7.5px] rounded-[7.5px] border border-amber-border bg-amber-bg px-[12px] py-[9px] text-[9.75px] text-amber-text-strong">
          <AlertTriangle size={12} strokeWidth={2.25} />
          {error}
        </div>
      )}
      <p className="text-[9.75px] leading-[1.6] text-muted">
        These are the automated emails PHN Helpdesk sends out (assignment, status changes, replies, SLA
        breaches). Use the tokens shown under each field to pull in ticket details — they&apos;re replaced when
        the email is sent.
      </p>

      <div className="flex flex-col gap-[9px]">
        {templates.map((t) => {
          const isOpen = expanded === t.key;
          return (
            <div
              key={t.key}
              className="flex flex-col overflow-hidden rounded-[12px] border border-card-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <button
                type="button"
                onClick={() => toggle(t)}
                className="flex w-full items-center justify-between gap-[9px] px-[15px] py-[12px] text-left"
              >
                <div className="flex items-center gap-[9px]">
                  <span className="text-[10.5px] font-semibold text-ink">{t.label}</span>
                  {t.isCustomized && (
                    <span className="inline-flex items-center rounded-full border border-[color:var(--color-blue)]/30 bg-white px-[6px] py-[1.5px] text-[8px] font-semibold uppercase tracking-[0.04em] text-[color:var(--color-blue-text)]">
                      Customized
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={13}
                  strokeWidth={2.25}
                  className={`shrink-0 text-faint transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <p className="px-[15px] pb-[10.5px] text-[9.75px] text-muted">{t.description}</p>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden border-t border-divider"
                  >
                    <div className="flex flex-col gap-[10.5px] px-[15px] py-[13.5px]">
                      <div className="flex flex-col gap-[4.5px]">
                        <label className="text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={subjectDraft}
                          onChange={(e) => setSubjectDraft(e.target.value)}
                          className="w-full rounded-[7.5px] border border-card-border bg-paper px-[10.5px] py-[7.5px] text-[10.5px] text-ink outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex flex-col gap-[4.5px]">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">
                            Body (HTML)
                          </label>
                          <button
                            type="button"
                            onClick={() => setPreview((p) => !p)}
                            className="inline-flex items-center gap-[4.5px] text-[9px] font-semibold text-muted hover:text-primary"
                          >
                            {preview ? <EyeOff size={11} strokeWidth={2.25} /> : <Eye size={11} strokeWidth={2.25} />}
                            {preview ? "Edit" : "Preview"}
                          </button>
                        </div>
                        {preview ? (
                          <div
                            className="min-h-[126px] w-full rounded-[7.5px] border border-card-border bg-paper px-[12px] py-[10.5px] text-[10.5px] leading-[1.6] text-ink"
                            dangerouslySetInnerHTML={{ __html: renderSample(bodyDraft) }}
                          />
                        ) : (
                          <textarea
                            value={bodyDraft}
                            onChange={(e) => setBodyDraft(e.target.value)}
                            rows={6}
                            spellCheck={false}
                            className="w-full resize-y rounded-[7.5px] border border-card-border bg-paper px-[10.5px] py-[8px] font-mono-plex text-[10px] leading-[1.6] text-ink outline-none focus:border-primary"
                          />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-[6px]">
                        <span className="inline-flex items-center gap-[3px] text-[9px] font-semibold text-faint">
                          <Braces size={10.5} strokeWidth={2.25} />
                          Tokens:
                        </span>
                        {t.tokens.map((token) => (
                          <code
                            key={token}
                            className="rounded-[5px] border border-card-border bg-paper px-[6px] py-[1.5px] font-mono-plex text-[9px] text-muted"
                          >
                            {`{{${token}}}`}
                          </code>
                        ))}
                      </div>

                      <div className="flex items-center gap-[9px] border-t border-divider pt-[10.5px]">
                        <button
                          type="button"
                          disabled={saving || !subjectDraft.trim() || !bodyDraft.trim()}
                          onClick={() => handleSave(t)}
                          className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full bg-admin-gradient px-[13.5px] py-[7.5px] text-[9.75px] font-semibold text-paper disabled:opacity-60"
                        >
                          <Save size={11} strokeWidth={2.5} />
                          {saving ? "Saving…" : "Save"}
                        </button>
                        {t.isCustomized && (
                          <button
                            type="button"
                            onClick={() => setPendingReset(t)}
                            className="inline-flex items-center gap-[4.5px] text-[9.75px] font-semibold text-muted hover:text-[color:var(--color-rose-text)]"
                          >
                            <RotateCcw size={11} strokeWidth={2.25} />
                            Reset to default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpanded(null)}
                          className="ml-auto text-[9.75px] font-semibold text-muted hover:text-primary"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!pendingReset}
        title="Reset this template?"
        description={
          pendingReset
            ? `"${pendingReset.label}" will go back to its default subject and wording.`
            : undefined
        }
        danger
        loading={resetting}
        confirmLabel="Reset"
        onCancel={() => setPendingReset(null)}
        onConfirm={handleReset}
      />
    </div>
  );
}
