"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, FileUp, Loader2, Paperclip, Search, X } from "lucide-react";
import { PriorityBadge } from "@/app/components/TicketBadges";
import { TEAM_DOT } from "@/app/admin/teamStyle";
import CopyButton from "@/app/tickets/[ticketNumber]/CopyButton";
import StepIndicator from "../StepIndicator";
import RocketLaunch, { type RocketOrigin } from "./RocketLaunch";
import { DEFAULT_FORM_OPTIONS, type FormOptions } from "@/app/lib/formOptions";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const MAX_FILES = 2;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,image/*";

const EASE = [0.22, 1, 0.36, 1] as const;

type FieldKey = "name" | "email" | "staffNo" | "phone" | "location" | "department" | "subject" | "message" | "captcha";

/** Field ids, in the order they appear, so a failed submit can jump to the first one that needs attention. */
const FIELD_ORDER: { key: FieldKey; label: string; id: string }[] = [
  { key: "name", label: "Name", id: "name" },
  { key: "email", label: "Email", id: "email" },
  { key: "staffNo", label: "Staff No", id: "staffNo" },
  { key: "phone", label: "Phone No / Ext", id: "phone" },
  { key: "location", label: "Location / Plant", id: "location" },
  { key: "department", label: "Department", id: "department" },
  { key: "subject", label: "Subject", id: "subject" },
  { key: "message", label: "Message", id: "message" },
  { key: "captcha", label: "Captcha", id: "captcha" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** A starting subject from the description: its first line, cut at a word near 80 characters. */
function suggestSubject(description: string): string {
  const firstLine = description.trim().split(/\r?\n/)[0] ?? "";
  if (firstLine.length <= 80) return firstLine;
  const cut = firstLine.slice(0, 80);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 40 ? cut.lastIndexOf(" ") : 80).trimEnd()}…`;
}

const fieldClass = (invalid: boolean, multiline = false) =>
  `${multiline ? "resize-y py-[9px] leading-[20px]" : "h-[36px]"} w-full rounded-[9px] border bg-surface px-[12px] text-[13px] text-ink outline-none transition-colors placeholder:text-faint ${
    invalid ? "border-rose/60" : "border-field-border hover:border-field-border-hover"
  }`;

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[6px]">
      <label htmlFor={id} className="flex items-baseline justify-between gap-[8px] text-[12px] font-medium text-muted">
        {label}
        {hint && <span className="font-normal text-faint">{hint}</span>}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.span
            id={`${id}-error`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16 }}
            className="overflow-hidden text-[12px] text-rose-text"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function Dropdown({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  invalid: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchable = options.length > 8;

  const filtered = searchable && query.trim()
    ? options.filter((opt) => opt.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open || !searchable) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, searchable]);

  const openMenu = () => {
    setQuery("");
    setHighlighted(Math.max(options.indexOf(value), 0));
    setOpen(true);
  };

  const select = (opt: string) => {
    onChange(opt);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) select(filtered[highlighted]);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        id={id}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={`${fieldClass(invalid)} flex items-center justify-between gap-[8px] text-left`}
      >
        <span className={`truncate ${value ? "text-ink" : "text-faint"}`}>{value || placeholder}</span>
        <ChevronDown size={14} strokeWidth={1.75} className={`shrink-0 text-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: EASE }}
            className="absolute z-20 mt-[6px] w-full overflow-hidden rounded-[12px] border border-card-border bg-surface shadow-pop"
          >
            {searchable && (
              <div className="flex items-center gap-[8px] border-b border-card-border/60 px-[12px] py-[8px]">
                <Search size={14} strokeWidth={1.75} className="shrink-0 text-faint" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlighted(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search…"
                  aria-label="Search options"
                  className="field-bare w-full border-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
                />
              </div>
            )}
            <ul role="listbox" tabIndex={-1} className="max-h-[240px] overflow-y-auto p-[4px]">
              {filtered.length === 0 && <li className="px-[10px] py-[8px] text-[13px] text-muted-2">No matches</li>}
              {filtered.map((opt, i) => (
                <li
                  key={opt}
                  role="option"
                  aria-selected={opt === value}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => select(opt)}
                  className={`flex cursor-pointer items-center justify-between gap-[8px] rounded-[8px] px-[10px] py-[7px] text-[13px] ${
                    i === highlighted ? "bg-surface-2 text-ink" : "text-ink"
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {opt === value && <Check size={14} strokeWidth={2.25} className="shrink-0 text-primary" />}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-[14px] border-t border-card-border/60 px-[20px] py-[20px] first:border-t-0 @min-[720px]:grid-cols-[180px_minmax(0,1fr)] @min-[720px]:gap-[28px]">
      <div className="flex flex-col gap-[2px]">
        <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
        {description && <p className="text-[12px] leading-[18px] text-muted-2">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-[14px]">{children}</div>
    </div>
  );
}

function TicketForm({
  initialName,
  initialEmail,
  initialStaffNo,
  options,
}: {
  initialName: string;
  initialEmail: string;
  initialStaffNo: string;
  /** Location, department and request type choices, edited in Settings → Form options. */
  options: FormOptions;
}) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const team = searchParams.get("team") ?? "IT Department";
  const priority = searchParams.get("priority") ?? "Normal";
  const description = searchParams.get("description") ?? "";

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [staffNo, setStaffNo] = useState(initialStaffNo);
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [userRequestTypes, setUserRequestTypes] = useState<string[]>([]);
  const [subject, setSubject] = useState(() => suggestSubject(description));
  const [message, setMessage] = useState(description);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [launched, setLaunched] = useState(false);
  const [originRect, setOriginRect] = useState<RocketOrigin | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const container = turnstileContainerRef.current;
    if (!siteKey || !container) return;

    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || widgetIdRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: siteKey,
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(null),
        "error-callback": () => setTurnstileToken(null),
      });
      setCaptchaReady(true);
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      let script = document.querySelector<HTMLScriptElement>(
        `script[src="${TURNSTILE_SCRIPT_SRC}"]`
      );
      if (!script) {
        script = document.createElement("script");
        script.src = TURNSTILE_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", renderWidget);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  const toggleUserRequest = (option: string) => {
    setUserRequestTypes((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handleFiles = (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const incoming = Array.from(selected);
    if (files.length + incoming.length > MAX_FILES) {
      setFileError(`You can attach up to ${MAX_FILES} files.`);
      return;
    }
    const tooBig = incoming.find((f) => f.size > MAX_FILE_SIZE);
    if (tooBig) {
      setFileError(`"${tooBig.name}" is larger than 5MB.`);
      return;
    }
    setFileError(null);
    setFiles((prev) => [...prev, ...incoming]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  };

  const missing: string[] = [];
  if (!name.trim()) missing.push("Name");
  if (!email.trim()) missing.push("Email");
  if (!staffNo.trim()) missing.push("Staff No");
  if (!phone.trim()) missing.push("Phone No / Ext");
  if (!location) missing.push("Location / Plant");
  if (!department) missing.push("Department");
  if (!subject.trim()) missing.push("Subject");
  if (!message.trim()) missing.push("Message");
  if (!turnstileToken) missing.push("Captcha");

  /** "Required" under a field once the person has tried to submit without it. */
  const errorFor = (key: FieldKey): string | null => {
    if (!attempted) return null;
    const f = FIELD_ORDER.find((x) => x.key === key)!;
    if (!missing.includes(f.label)) return null;
    if (key === "location" || key === "department") return `Choose your ${f.label.toLowerCase()}.`;
    if (key === "captcha") return "Tick the box to show you're not a robot.";
    return `${f.label} is required.`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    setVerifyError(null);
    if (missing.length > 0) {
      // Take the person straight to the first field that still needs something.
      const first = FIELD_ORDER.find((f) => missing.includes(f.label));
      const el = first ? document.getElementById(first.id) : null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (first && first.key !== "captcha") el.focus({ preventScroll: true });
      } else {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/verify-turnstile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: turnstileToken }),
      });
      const data = await res.json();
      if (!data.success) {
        setVerifyError("Captcha verification failed. Please try again.");
        if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
        setTurnstileToken(null);
        return;
      }

      const ticketForm = new FormData();
      ticketForm.set("category", category);
      ticketForm.set("team", team);
      ticketForm.set("priority", priority);
      ticketForm.set("name", name);
      ticketForm.set("email", email);
      ticketForm.set("staffNo", staffNo);
      ticketForm.set("phone", phone);
      ticketForm.set("location", location);
      ticketForm.set("department", department);
      ticketForm.set("subject", subject);
      ticketForm.set("message", message);
      userRequestTypes.forEach((t) => ticketForm.append("userRequestTypes", t));
      files.forEach((f) => ticketForm.append("attachments", f));

      const ticketRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/tickets`, {
        method: "POST",
        body: ticketForm,
      });
      const ticketData = await ticketRes.json();
      if (!ticketRes.ok) throw new Error(ticketData.error ?? "Could not submit ticket");
      const rect = submitButtonRef.current?.getBoundingClientRect();
      setOriginRect(
        rect ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height } : null
      );
      setSubmittedAt(new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }));
      setTicketId(ticketData.ticketNumber);
    } catch (err) {
      setVerifyError((err as Error).message || "Could not submit ticket. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (!category) {
    return (
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[12px] px-[16px] pb-[56px] pt-[40px] md:px-[32px]">
        <div className="rounded-[16px] border border-card-border/70 bg-surface p-[20px]">
          <h1 className="text-[15px] font-semibold text-ink">No category picked yet</h1>
          <p className="mt-[4px] text-[13px] text-muted-2">Start by describing your issue, and Boboi will suggest one.</p>
          <Link
            href="/submit"
            className="mt-[14px] inline-flex h-[34px] items-center gap-[6px] rounded-[9px] bg-primary px-[12px] text-[13px] font-medium text-white hover:bg-primary-hover"
          >
            Describe your issue <ArrowRight size={14} strokeWidth={2} />
          </Link>
        </div>
      </main>
    );
  }

  if (ticketId && launched) {
    return (
      <SubmittedCard
        ticketId={ticketId}
        category={category}
        team={team}
        priority={priority}
        email={email}
        submittedAt={submittedAt}
      />
    );
  }

  const inFlight = Boolean(ticketId) && !launched;
  const toFix = attempted ? missing.length : 0;

  return (
    <>
    <main
      aria-hidden={inFlight}
      className={`mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[20px] px-[16px] pb-[56px] pt-[28px] transition-opacity duration-300 md:px-[32px] md:pt-[40px] ${
        inFlight ? "pointer-events-none select-none opacity-90" : ""
      }`}
    >
      <StepIndicator current={1} />

      <div className="flex flex-col gap-[4px]">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Add your details</h1>
        <p className="max-w-[520px] text-[13px] leading-[20px] text-muted-2">
          So the team can reach you and start on it straight away. Everything except attachments
          {options.request_type.length > 0 ? " and request type" : ""} is required.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[20px] lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          className="@container order-2 flex min-w-0 flex-col rounded-[16px] border border-card-border/70 bg-surface lg:order-1"
        >
          <Section title="You" description="How IT can reach you about this ticket.">
            <div className="grid grid-cols-1 gap-[14px] @min-[520px]:grid-cols-2">
              <Field id="name" label="Name" error={errorFor("name")}>
                <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errorFor("name") || undefined} className={fieldClass(!!errorFor("name"))} />
              </Field>
              <Field id="email" label="Email" error={errorFor("email")}>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={!!errorFor("email") || undefined} className={fieldClass(!!errorFor("email"))} />
              </Field>
              <Field id="staffNo" label="Staff No" error={errorFor("staffNo")}>
                <input id="staffNo" value={staffNo} onChange={(e) => setStaffNo(e.target.value)} aria-invalid={!!errorFor("staffNo") || undefined} className={fieldClass(!!errorFor("staffNo"))} />
              </Field>
              <Field id="phone" label="Phone No / Ext" error={errorFor("phone")}>
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="e.g. 012-345 6789 or ext. 2104" aria-invalid={!!errorFor("phone") || undefined} className={fieldClass(!!errorFor("phone"))} />
              </Field>
            </div>
          </Section>

          <Section title="Where you are" description="So the right people on site can help.">
            <div className="grid grid-cols-1 gap-[14px] @min-[520px]:grid-cols-2">
              <Field id="location" label="Location / Plant" error={errorFor("location")}>
                <Dropdown id="location" placeholder="Select location" value={location} onChange={setLocation} options={options.location} invalid={!!errorFor("location")} />
              </Field>
              <Field id="department" label="Department" error={errorFor("department")}>
                <Dropdown id="department" placeholder="Select department" value={department} onChange={setDepartment} options={options.department} invalid={!!errorFor("department")} />
              </Field>
            </div>
          </Section>

          <Section title="The issue" description="We've filled this in from what you wrote. Change anything you like.">
            <Field id="subject" label="Subject" hint={`${subject.length}/80`} error={errorFor("subject")}>
              <input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="A short title for the problem" aria-invalid={!!errorFor("subject") || undefined} className={fieldClass(!!errorFor("subject"))} />
            </Field>
            <Field id="message" label="Message" error={errorFor("message")}>
              <textarea
                id="message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-invalid={!!errorFor("message") || undefined}
                className={fieldClass(!!errorFor("message"), true)}
              />
            </Field>
            {options.request_type.length > 0 && (
              <div className="flex flex-col gap-[8px]">
                <span className="text-[12px] font-medium text-muted">
                  Request type <span className="font-normal text-faint">· optional</span>
                </span>
                <div className="flex flex-wrap gap-[6px]">
                  {options.request_type.map((option) => {
                    const on = userRequestTypes.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleUserRequest(option)}
                        className={`inline-flex h-[32px] items-center gap-[6px] rounded-[9px] border px-[12px] text-[13px] transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] ${
                          on ? "border-ink bg-ink text-paper" : "border-card-border bg-surface text-ink hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                        }`}
                      >
                        <span className={`flex h-[14px] w-[14px] items-center justify-center rounded-[4px] border ${on ? "border-paper/40 bg-paper/15" : "border-field-border"}`}>
                          {on && <Check size={10} strokeWidth={3} />}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>

          <Section title="Attachments" description={`Optional. Up to ${MAX_FILES} files, 5MB each.`}>
            <label
              htmlFor="attachment"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              className={`flex cursor-pointer flex-col items-center gap-[6px] rounded-[12px] border border-dashed px-[16px] py-[20px] text-center transition-[background-color,border-color,transform] duration-200 ${
                dragging ? "scale-[1.01] border-primary bg-primary-soft" : "border-field-border hover:border-primary/50 hover:bg-surface-2/50"
              } ${files.length >= MAX_FILES ? "pointer-events-none opacity-50" : ""}`}
            >
              <span className={`flex h-[32px] w-[32px] items-center justify-center rounded-full transition-colors ${dragging ? "bg-primary text-white" : "bg-surface-2 text-muted"}`}>
                <FileUp size={15} strokeWidth={1.75} />
              </span>
              <span className="text-[13px] text-ink">
                <span className="font-medium text-primary">Choose files</span> or drop them here
              </span>
              <span className="text-[12px] text-muted-2">PDF, Word, Excel, images, text or zip</span>
              <input
                id="attachment"
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
                className="sr-only"
              />
            </label>
            {fileError && <span className="text-[12px] text-rose-text">{fileError}</span>}
            <AnimatePresence initial={false}>
              {files.length > 0 && (
                <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-[6px]">
                  <AnimatePresence initial={false}>
                    {files.map((file, i) => (
                      <motion.li
                        key={`${file.name}-${file.size}-${i}`}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className="flex items-center gap-[10px] rounded-[10px] border border-card-border/70 bg-surface-2/40 px-[12px] py-[8px] text-[13px]"
                      >
                        <Paperclip size={14} strokeWidth={1.75} className="shrink-0 text-muted-2" />
                        <span className="min-w-0 flex-1 truncate text-ink">{file.name}</span>
                        <span className="shrink-0 text-[12px] tabular-nums text-muted-2">{formatBytes(file.size)}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          aria-label={`Remove ${file.name}`}
                          className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[6px] text-faint transition-colors hover:bg-rose-light hover:text-rose-text"
                        >
                          <X size={13} strokeWidth={2} />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              )}
            </AnimatePresence>
          </Section>

          <Section title="Quick check" description="Confirms a person is sending this.">
            <div id="captcha" tabIndex={-1} className="flex min-h-[65px] flex-col gap-[6px] outline-none">
              {!captchaReady && (
                <span className="flex h-[65px] w-[300px] max-w-full items-center gap-[8px] rounded-[10px] border border-card-border/70 bg-surface-2/50 px-[12px] text-[12px] text-muted-2">
                  <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                  Loading the check…
                </span>
              )}
              <div ref={turnstileContainerRef} />
              {errorFor("captcha") && <span className="text-[12px] text-rose-text">{errorFor("captcha")}</span>}
            </div>
          </Section>

          <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-[12px] rounded-b-[16px] border-t border-card-border/60 bg-surface/90 px-[20px] py-[14px] backdrop-blur-md">
            <div className="flex min-h-[20px] min-w-0 flex-col text-[12px]">
              {verifyError ? (
                <span role="alert" className="text-rose-text">
                  {verifyError}
                </span>
              ) : toFix > 0 ? (
                <span role="alert" className="text-rose-text">
                  {toFix} {toFix === 1 ? "thing needs" : "things need"} your attention before sending.
                </span>
              ) : (
                <span className="inline-flex items-center gap-[6px] text-muted-2">
                  <span className={`h-[6px] w-[6px] rounded-full ${TEAM_DOT[team] ?? "bg-faint"}`} aria-hidden="true" />
                  Goes to {team} · {priority} priority
                </span>
              )}
            </div>
            <button
              ref={submitButtonRef}
              type="submit"
              disabled={verifying}
              className="group inline-flex h-[38px] items-center gap-[8px] rounded-[10px] bg-primary px-[16px] text-[13px] font-medium text-white transition-[background-color,transform] duration-150 hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
            >
              {verifying ? <Loader2 size={14} strokeWidth={2} className="animate-spin" /> : null}
              {verifying ? "Sending…" : "Submit ticket"}
              {!verifying && <ArrowRight size={14} strokeWidth={2} className="transition-transform duration-200 group-hover:translate-x-[2px]" />}
            </button>
          </footer>
        </form>

        <TicketStub category={category} team={team} priority={priority} />
      </div>
    </main>
    {inFlight && (
      <RocketLaunch team={team} originRect={originRect} onComplete={() => setLaunched(true)} />
    )}
    </>
  );
}

/** The dark "your ticket" card beside the form: what's being raised and where it goes. */
function TicketStub({ category, team, priority }: { category: string; team: string; priority: string }) {
  return (
    <aside className="order-1 lg:sticky lg:top-[76px] lg:order-2">
      <div className="tile-ink overflow-hidden rounded-[16px]">
        <div className="flex flex-col gap-[4px] p-[16px]">
          <span className="text-[12px] text-muted-2">Your ticket</span>
          <span className="text-[16px] font-semibold leading-[22px] tracking-[-0.01em] text-ink">{category}</span>
        </div>
        <div className="relative h-px border-t border-dashed border-white/15" aria-hidden="true">
          <span className="absolute -left-[8px] -top-[8px] h-[16px] w-[16px] rounded-full bg-paper" />
          <span className="absolute -right-[8px] -top-[8px] h-[16px] w-[16px] rounded-full bg-paper" />
        </div>
        <dl className="flex flex-col gap-[10px] p-[16px] text-[13px]">
          <div className="flex items-center justify-between gap-[12px]">
            <dt className="text-muted-2">Team</dt>
            <dd className="inline-flex items-center gap-[6px] text-ink">
              <span className={`h-[6px] w-[6px] rounded-full ${TEAM_DOT[team] ?? "bg-faint"}`} aria-hidden="true" />
              {team}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-[12px]">
            <dt className="text-muted-2">Priority</dt>
            <dd>
              <PriorityBadge priority={priority} />
            </dd>
          </div>
        </dl>
        <Link
          href="/submit"
          className="flex items-center justify-between border-t border-white/10 px-[16px] py-[12px] text-[12px] text-muted transition-colors hover:bg-white/[0.04] hover:text-ink"
        >
          Wrong category? Go back and choose again
          <ArrowRight size={13} strokeWidth={2} />
        </Link>
      </div>
    </aside>
  );
}

function SubmittedCard({
  ticketId,
  category,
  team,
  priority,
  email,
  submittedAt,
}: {
  ticketId: string;
  category: string;
  team: string;
  priority: string;
  email: string;
  submittedAt: string | null;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center gap-[20px] px-[16px] pb-[56px] pt-[28px] md:pt-[40px]">
      <StepIndicator current={2} />
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="w-full overflow-hidden rounded-[20px] border border-card-border/70 bg-surface shadow-pop"
      >
        <div className="tile-ink flex flex-col items-center gap-[12px] px-[24px] pb-[24px] pt-[28px] text-center">
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-lime-bright text-navy"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="draw" pathLength={1} style={{ strokeDasharray: 1, animationDelay: "250ms" }} />
            </svg>
          </motion.span>
          <div className="flex flex-col gap-[4px]">
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Ticket sent</h1>
            <p className="max-w-[320px] text-[13px] leading-[20px] text-muted">
              {team} has it now. Updates go to <span className="text-ink">{email}</span>.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-[16px] p-[20px]">
          <div className="flex items-center justify-between gap-[12px] rounded-[12px] bg-surface-2/60 px-[14px] py-[12px]">
            <div className="flex flex-col">
              <span className="text-[12px] text-muted-2">Your ticket ID</span>
              <span className="text-[18px] font-semibold tracking-[0.02em] tabular-nums text-ink">{ticketId}</span>
            </div>
            <CopyButton
              value={ticketId}
              label="Copy ticket ID"
              className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] border border-field-border bg-surface text-muted transition-colors hover:border-field-border-hover hover:text-ink"
            />
          </div>

          <dl className="grid grid-cols-2 gap-x-[16px] gap-y-[12px] text-[13px]">
            <div className="flex flex-col gap-[2px]">
              <dt className="text-[12px] text-muted-2">Category</dt>
              <dd className="text-ink">{category}</dd>
            </div>
            <div className="flex flex-col gap-[2px]">
              <dt className="text-[12px] text-muted-2">Priority</dt>
              <dd>
                <PriorityBadge priority={priority} />
              </dd>
            </div>
            <div className="flex flex-col gap-[2px]">
              <dt className="text-[12px] text-muted-2">Team</dt>
              <dd className="text-ink">{team}</dd>
            </div>
            <div className="flex flex-col gap-[2px]">
              <dt className="text-[12px] text-muted-2">Sent</dt>
              <dd className="text-ink">{submittedAt}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-wrap gap-[8px] border-t border-card-border/60 bg-surface-2/40 p-[16px]">
          <Link
            href={`/tickets/${encodeURIComponent(ticketId)}`}
            className="group inline-flex h-[36px] flex-1 items-center justify-center gap-[6px] whitespace-nowrap rounded-[9px] bg-primary px-[14px] text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Open this ticket
            <ArrowUpRight size={14} strokeWidth={2} className="transition-transform duration-200 group-hover:-translate-y-[1px] group-hover:translate-x-[1px]" />
          </Link>
          <Link
            href="/submit"
            className="inline-flex h-[36px] flex-1 items-center justify-center whitespace-nowrap rounded-[9px] border border-field-border bg-surface px-[14px] text-[13px] font-medium text-ink transition-colors hover:border-field-border-hover hover:bg-surface-2"
          >
            Submit another
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

export default function SubmitTicketForm({
  initialName = "",
  initialEmail = "",
  initialStaffNo = "",
  options = DEFAULT_FORM_OPTIONS,
}: {
  initialName?: string;
  initialEmail?: string;
  initialStaffNo?: string;
  options?: FormOptions;
}) {
  return (
    <Suspense fallback={null}>
      <TicketForm
        initialName={initialName}
        initialEmail={initialEmail}
        initialStaffNo={initialStaffNo}
        options={options}
      />
    </Suspense>
  );
}
