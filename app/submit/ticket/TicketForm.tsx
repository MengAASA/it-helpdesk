"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Search,
  User,
  ListChecks,
  MessageSquareText,
  Paperclip,
  ShieldCheck,
  X,
} from "lucide-react";
import RocketLaunch, { type RocketOrigin } from "./RocketLaunch";

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

const LOCATIONS = [
  "PHN Shah Alam",
  "PHN Shah Alam 2",
  "PHN Bukit Beruntung",
  "PHN Pegoh",
  "PHN Pekan",
  "PHN Rasa",
  "PHN Fif",
  "DHMSB",
  "OSI Shah Alam",
  "OSI Tanjung Malim",
];

const DEPARTMENTS = [
  "-",
  "BUSINESS DEVELOPMENT",
  "CEO OFFICE",
  "COSTING AND COMMERCIAL",
  "CULTURE AND TALENT MANAGEMENT",
  "ENERGY MGMT AUTHORITY LIASON",
  "ENERGY SOLUTION",
  "ENGINEERING MANAGEMENT I",
  "ENGINEERING MANAGEMENT II",
  "EQUIPMENT MAINT I - SA 1, SA 2, DHMSB, PEGOH",
  "EQUIPMENT MAINT II - BB, RASA, TM1, TM2",
  "ESG HEALTH AND SAFETY",
  "FACILITY AND ENERGY MANAGEMENT",
  "FINANCE",
  "INVENTORY MGMT AND PLANNING",
  "IT AND DIGITALISATION",
  "MANUFACTURING AND SCM - BB/RASA",
  "MANUFACTURING AND SCM - PEGOH",
  "MANUFACTURING AND SCM - PEKAN",
  "MANUFACTURING AND SCM - SA1",
  "MANUFACTURING AND SCM - SA 2",
  "MANUFACTURING AND SCM - TM 1",
  "MANUFACTURING AND SCM - TM 2",
  "OPERATION I AND IMP",
  "OPERATION II",
  "OPERATION III",
  "OPERATION IV",
  "OPERATIONS",
  "PROCESS ENGINEERING",
  "PROCUREMENT & VENDOR DEV",
  "PROGRAM MANAGEMENT",
  "PROGRAM MANAGEMENT I",
  "PROGRAM MANAGEMENT II",
  "PROGRAM MANAGEMENT III",
  "QMS & SQ",
  "QUALITY ASSURANCE & CONTROL - BB, RASA, TM 1 AND TM 2",
  "QUALITY ASSURANCE & CONTROL SA 1",
  "QUALITY ASSURANCE & CONTROL SA 2",
  "QUALITY ASSURANCE & CONTROL-DEV - MLK PKN",
  "QUALITY DEVELOPMENT",
  "QUALITY MANAGEMENT",
  "QUALITY OPERATIONS",
  "RESEARCH AND DEVELOPMENT",
  "REWARDS AND ADMIN",
  "STRATEGIC BUSINESS PERFORMANCE",
  "TOOLING DESIGN AND DEVELOPMENT",
];

const USER_REQUEST_OPTIONS = ["Email - Active Directory", "BAAN Account"];

const MAX_FILES = 2;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,image/*";

const PRIORITY_BADGE: Record<string, string> = {
  High: "border-[color:var(--color-rose)]/25 bg-[color:var(--color-rose-light)] text-[color:var(--color-rose-text)]",
  Normal: "border-pill-border bg-pill-bg text-pill-text",
  Low: "border-[color:var(--color-emerald)]/25 bg-[color:var(--color-emerald-light)] text-[color:var(--color-emerald-text)]",
};

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const floatingLabelClass = (floated: boolean) =>
  `pointer-events-none absolute left-[12px] transition-all duration-150 ${
    floated
      ? "top-[6px] text-[8.5px] font-semibold uppercase tracking-[0.12em] text-primary"
      : "top-[14px] text-[12px] text-faint"
  }`;

const fieldChromeClass =
  "w-full rounded-[9px] border border-card-border bg-paper px-[12px] pb-[8.25px] pt-[19.5px] font-body text-[12px] text-ink outline-none transition-colors focus:border-primary focus:ring-[3px] focus:ring-primary/10";

function FloatingInput({
  id,
  label,
  type = "text",
  value,
  onChange,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={fieldChromeClass}
      />
      <label htmlFor={id} className={floatingLabelClass(floated)}>
        {label}
      </label>
    </div>
  );
}

function Dropdown({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
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
        className={`${fieldChromeClass} flex items-center justify-between gap-[9px] text-left`}
      >
        <span className={`truncate ${value ? "text-ink" : "text-faint"}`}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={2.25}
          className={`shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <label htmlFor={id} className={floatingLabelClass(true)}>
        {label}
      </label>

      {open && (
        <div className="animate-phn-rise absolute z-20 mt-[6px] w-full overflow-hidden rounded-[10px] border border-card-border bg-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]">
          {searchable && (
            <div className="flex items-center gap-[7.5px] border-b border-divider px-[10.5px] py-[7.5px]">
              <Search size={12} strokeWidth={2.25} className="shrink-0 text-faint" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlighted(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search…"
                className="w-full bg-transparent text-[11.5px] text-ink outline-none placeholder:text-faint"
              />
            </div>
          )}
          <ul role="listbox" tabIndex={-1} className="max-h-[228px] overflow-y-auto py-[4.5px]">
            {filtered.length === 0 && (
              <li className="px-[12px] py-[10.5px] text-[11px] text-faint">No matches</li>
            )}
            {filtered.map((opt, i) => (
              <li
                key={opt}
                role="option"
                aria-selected={opt === value}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => select(opt)}
                className={`flex cursor-pointer items-center justify-between gap-[9px] px-[12px] py-[8px] text-[11.5px] ${
                  i === highlighted ? "bg-result-bg text-primary" : "text-ink"
                }`}
              >
                <span className="truncate">{opt}</span>
                {opt === value && (
                  <Check size={13} strokeWidth={2.5} className="shrink-0 text-primary" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FloatingTextarea({
  id,
  label,
  value,
  onChange,
  rows = 4,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;
  return (
    <div className="relative">
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`${fieldChromeClass} resize-y leading-[1.6]`}
      />
      <label htmlFor={id} className={floatingLabelClass(floated)}>
        {label}
      </label>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-[7.5px] text-[12px] font-semibold text-ink">
      <Icon size={13} strokeWidth={2.25} className="text-primary" />
      {children}
    </div>
  );
}

function TicketForm({
  initialName,
  initialEmail,
  initialStaffNo,
}: {
  initialName: string;
  initialEmail: string;
  initialStaffNo: string;
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
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState(description);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    setVerifyError(null);
    if (missing.length > 0) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      <main className="mx-auto flex w-full flex-1 flex-col gap-[15px] px-[42px] pb-[67.5px] pt-[42px]">
        <p className="text-[12.75px] leading-[1.6] text-muted">
          No category was selected.{" "}
          <Link href="/submit" className="font-semibold text-primary">
            Go back and describe your issue
          </Link>
          .
        </p>
      </main>
    );
  }

  if (ticketId && launched) {
    return (
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center px-[42px] py-[67.5px]">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full overflow-hidden rounded-[18px] border border-card-border bg-white shadow-[0_20px_44px_rgba(15,23,42,0.14)]"
        >
          <div className="flex flex-col items-center gap-[10.5px] bg-admin-gradient px-[27px] py-[28.5px] text-center text-paper">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex h-[48px] w-[48px] items-center justify-center rounded-full border border-paper/30 bg-paper/15"
            >
              <CheckCircle2 size={24} strokeWidth={2} />
            </motion.span>
            <div className="flex flex-col gap-[3px]">
              <h1 className="font-heading text-[19.5px] font-semibold tracking-[-0.01em]">
                Ticket submitted
              </h1>
              <p className="max-w-[300px] text-[11.25px] leading-[1.6] text-paper/80">
                Routed to {team}. Updates go to {email}
              </p>
            </div>
          </div>

          <div className="relative border-t-2 border-dashed border-card-border">
            <span className="absolute -left-[10.5px] top-1/2 h-[21px] w-[21px] -translate-y-1/2 rounded-full bg-paper" />
            <span className="absolute -right-[10.5px] top-1/2 h-[21px] w-[21px] -translate-y-1/2 rounded-full bg-paper" />
          </div>

          <div className="flex flex-col gap-[16.5px] px-[27px] py-[22.5px]">
            <div className="flex flex-col items-center gap-[3px] text-center">
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-faint">
                Ticket number
              </span>
              <span className="font-mono-plex text-[19.5px] font-semibold tracking-[0.02em] text-ink">
                {ticketId}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-[12px] gap-y-[13.5px] border-t border-divider pt-[16.5px] text-[11.25px]">
              <div className="flex flex-col gap-[1.5px]">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">
                  Category
                </span>
                <span className="font-medium text-ink">{category}</span>
              </div>
              <div className="flex flex-col gap-[1.5px]">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">
                  Priority
                </span>
                <span
                  className={`inline-flex w-fit rounded-full border px-[8.25px] py-[2.25px] text-[9px] font-semibold ${
                    PRIORITY_BADGE[priority] ?? PRIORITY_BADGE.Normal
                  }`}
                >
                  {priority}
                </span>
              </div>
              <div className="flex flex-col gap-[1.5px]">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">
                  Assigned team
                </span>
                <span className="font-medium text-ink">{team}</span>
              </div>
              <div className="flex flex-col gap-[1.5px]">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">
                  Submitted
                </span>
                <span className="font-medium text-ink">{submittedAt}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-[10.5px] border-t border-divider bg-paper px-[27px] py-[16.5px]">
            <Link
              href="/submit"
              className="inline-flex flex-1 items-center justify-center gap-[7.5px] whitespace-nowrap rounded-full bg-admin-gradient px-[16.5px] py-[9.75px] text-[10.5px] font-semibold text-paper shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
            >
              Submit another
            </Link>
            <Link
              href="/tickets"
              className="inline-flex flex-1 items-center justify-center gap-[7.5px] whitespace-nowrap rounded-full border border-card-border bg-white px-[16.5px] py-[9.75px] text-[10.5px] font-semibold text-ink hover:border-primary/40 hover:text-primary"
            >
              Track this ticket
            </Link>
          </div>
        </motion.div>
      </main>
    );
  }

  const inFlight = Boolean(ticketId) && !launched;

  return (
    <>
    <main
      aria-hidden={inFlight}
      className={`mx-auto flex w-full flex-1 flex-col gap-[24px] px-[42px] pb-[67.5px] pt-[42px] transition-opacity duration-300 ${
        inFlight ? "pointer-events-none select-none opacity-90" : ""
      }`}
    >
      <div className="flex flex-col gap-[10.5px]">
        <h1 className="font-heading text-[27px] font-semibold tracking-[-0.02em]">
          Complete your ticket
        </h1>
        <p className="max-w-[495px] text-[12.75px] leading-[1.6] text-muted">
          Fill in your details below so the team can reach you and start working on this ticket.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[21px] lg:grid-cols-[1fr_300px] lg:items-start">

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col divide-y divide-divider overflow-hidden rounded-[10.5px] border border-card-border bg-white"
      >
        {attempted && missing.length > 0 && (
          <div className="border-b border-[color:var(--color-rose)]/25 bg-[color:var(--color-rose-light)] px-[21px] py-[10.5px] text-[9.75px] font-medium text-[color:var(--color-rose-text)]">
            Please complete: {missing.join(", ")}.
          </div>
        )}

        <div className="flex flex-col gap-[15px] px-[21px] py-[19.5px]">
          <SectionHeading icon={User}>Your details</SectionHeading>
          <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 xl:grid-cols-3">
            <FloatingInput id="name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <FloatingInput
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FloatingInput
              id="staffNo"
              label="Staff No"
              value={staffNo}
              onChange={(e) => setStaffNo(e.target.value)}
            />
            <FloatingInput
              id="phone"
              label="Phone No / Ext"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Dropdown
              id="location"
              label="Location / Plant"
              placeholder="Select location"
              value={location}
              onChange={setLocation}
              options={LOCATIONS}
            />
            <Dropdown
              id="department"
              label="Department"
              placeholder="Select department"
              value={department}
              onChange={setDepartment}
              options={DEPARTMENTS}
            />
          </div>
        </div>

        <div className="flex flex-col gap-[12px] px-[21px] py-[19.5px]">
          <SectionHeading icon={ListChecks}>
            Request type <span className="font-normal text-faint">(optional)</span>
          </SectionHeading>
          <div className="flex flex-wrap items-center gap-[15px]">
            {USER_REQUEST_OPTIONS.map((option) => (
              <label
                key={option}
                className="inline-flex items-center gap-[6px] text-[10.5px] font-medium text-ink"
              >
                <input
                  type="checkbox"
                  checked={userRequestTypes.includes(option)}
                  onChange={() => toggleUserRequest(option)}
                  className="h-[10.5px] w-[10.5px] accent-[color:var(--color-blue)]"
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[15px] px-[21px] py-[19.5px]">
          <SectionHeading icon={MessageSquareText}>Describe the issue</SectionHeading>
          <FloatingInput id="subject" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <FloatingTextarea id="message" label="Message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>

        <div className="flex flex-col gap-[9px] px-[21px] py-[19.5px]">
          <SectionHeading icon={Paperclip}>Attachments</SectionHeading>
          <input
            id="attachment"
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
            className="text-[10.5px] text-ink file:mr-[9px] file:rounded-[6px] file:border-0 file:bg-ink file:px-[10.5px] file:py-[6px] file:text-[9.75px] file:font-semibold file:text-paper hover:file:bg-primary"
          />
          <span className="text-[9px] text-faint">
            PDF, Word, Excel, images, text or zip (up to {MAX_FILES} files, 5MB each).
          </span>
          {fileError && (
            <span className="text-[9px] font-semibold text-amber-text-strong">{fileError}</span>
          )}
          {files.length > 0 && (
            <ul className="flex flex-wrap gap-[7.5px]">
              {files.map((file, i) => (
                <li
                  key={`${file.name}-${i}`}
                  className="inline-flex items-center gap-[7.5px] rounded-full border border-card-border bg-white px-[10.5px] py-[6px] text-[9.75px] text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                >
                  <Paperclip size={11} strokeWidth={2.25} className="text-faint" />
                  <span className="truncate">
                    {file.name} <span className="text-faint">({formatBytes(file.size)})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-faint hover:text-[color:var(--color-rose)]"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-[9px] px-[21px] py-[19.5px]">
          <SectionHeading icon={ShieldCheck}>Verify you&apos;re human</SectionHeading>
          <div ref={turnstileContainerRef} />
          {verifyError && (
            <span className="text-[9px] font-semibold text-amber-text-strong">{verifyError}</span>
          )}
        </div>

        <div className="px-[21px] py-[19.5px]">
          <button
            ref={submitButtonRef}
            type="submit"
            disabled={verifying}
            className="inline-flex w-fit items-center gap-[7.5px] whitespace-nowrap rounded-full bg-admin-gradient px-[19.5px] py-[9.75px] text-[10.5px] font-semibold text-paper shadow-[0_4px_12px_rgba(37,99,235,0.25)] transition-transform hover:-translate-y-[1px] disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {verifying ? "Verifying…" : "Submit ticket"} <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-[16.5px] rounded-[14px] border border-card-border bg-white px-[21px] py-[19.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:sticky lg:top-[84px]">
        <div className="flex items-start gap-[10.5px]">
          <span className="flex h-[33px] w-[33px] shrink-0 items-center justify-center rounded-[9px] bg-result-bg text-primary">
            <ListChecks size={15} strokeWidth={2} />
          </span>
          <div className="flex flex-col gap-[1.5px]">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">
              Category
            </span>
            <span className="font-heading text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink">
              {category}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-[9px] border-t border-divider pt-[13.5px] text-[11.25px]">
          <div className="flex items-center justify-between gap-[9px]">
            <span className="text-muted">Priority</span>
            <span
              className={`rounded-full border px-[8.25px] py-[3px] text-[9px] font-semibold ${
                PRIORITY_BADGE[priority] ?? PRIORITY_BADGE.Normal
              }`}
            >
              {priority}
            </span>
          </div>
          <div className="flex items-center justify-between gap-[9px]">
            <span className="text-muted">Assigned team</span>
            <span className="font-medium text-ink">{team}</span>
          </div>
        </div>
        <p className="border-t border-divider pt-[13.5px] text-[10.5px] leading-[1.6] text-muted">
          Not the right category?{" "}
          <Link href="/submit" className="font-semibold text-primary hover:underline">
            Go back and choose again
          </Link>
          .
        </p>
      </div>
      </div>
    </main>
    {inFlight && (
      <RocketLaunch team={team} originRect={originRect} onComplete={() => setLaunched(true)} />
    )}
    </>
  );
}

export default function SubmitTicketForm({
  initialName = "",
  initialEmail = "",
  initialStaffNo = "",
}: {
  initialName?: string;
  initialEmail?: string;
  initialStaffNo?: string;
}) {
  return (
    <Suspense fallback={null}>
      <TicketForm
        initialName={initialName}
        initialEmail={initialEmail}
        initialStaffNo={initialStaffNo}
      />
    </Suspense>
  );
}
