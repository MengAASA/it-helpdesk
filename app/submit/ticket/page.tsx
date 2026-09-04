"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  User,
  Mail,
  IdCard,
  Phone,
  MapPin,
  Building2,
  ListChecks,
  MessageSquareText,
  Paperclip,
  ShieldCheck,
  X,
} from "lucide-react";
import Avatar from "@/app/components/Avatar";

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

const labelClass = "text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-2";
const inputClass =
  "w-full rounded-[7.5px] border border-card-border bg-paper px-[12px] py-[10.5px] font-body text-xs text-ink outline-none focus:border-[color:var(--color-blue)]";

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function FieldLabel({
  icon: Icon,
  htmlFor,
  children,
}: {
  icon: typeof User;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={`${labelClass} inline-flex items-center gap-[5.25px]`}>
      <Icon size={11.5} strokeWidth={2.25} className="text-faint" />
      {children}
    </label>
  );
}

function TicketForm() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const team = searchParams.get("team") ?? "IT Department";
  const priority = searchParams.get("priority") ?? "Normal";
  const description = searchParams.get("description") ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [staffNo, setStaffNo] = useState("");
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
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

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
  if (userRequestTypes.length === 0) missing.push("User Request");
  if (!subject.trim()) missing.push("Subject");
  if (!message.trim()) missing.push("Message");
  if (!turnstileToken) missing.push("Captcha");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    setVerifyError(null);
    if (missing.length > 0) return;

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

  if (ticketId) {
    return (
      <main className="mx-auto flex w-full flex-1 flex-col gap-[15px] px-[42px] pb-[67.5px] pt-[42px]">
        <div className="animate-phn-rise flex w-full max-w-[560px] flex-col gap-[15px] rounded-[16px] bg-admin-gradient px-[27px] py-[24px] text-paper shadow-[0_10px_28px_rgba(37,99,235,0.2)]">
          <div className="flex items-center gap-[10.5px]">
            <span className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full border border-paper/30 bg-paper/15">
              <CheckCircle2 size={18} strokeWidth={2.25} />
            </span>
            <span className="font-heading text-[18px] font-semibold tracking-[-0.01em]">
              Ticket submitted
            </span>
          </div>
          <p className="text-[10.5px] leading-[1.6] text-paper/85">
            Your ticket has been logged under{" "}
            <span className="rounded-full border border-paper/30 bg-paper/15 px-[8.25px] py-[2.25px] font-mono-plex text-[10.5px]">
              {ticketId}
            </span>{" "}
            and routed to {team}. You will receive updates at {email}.
          </p>
          <div className="flex items-center gap-[9px] rounded-[10px] border border-paper/25 bg-paper/10 px-[12px] py-[9px]">
            <Avatar name={name || "?"} size={27} />
            <div className="flex flex-col gap-[1.5px]">
              <span className="text-[10.5px] font-semibold">{name}</span>
              <span className="text-[9px] text-paper/70">{email}</span>
            </div>
          </div>
          <div className="mt-[6px] flex flex-wrap items-center gap-[13.5px]">
            <Link
              href="/submit"
              className="inline-flex items-center gap-[7.5px] whitespace-nowrap rounded-full border border-paper/30 bg-paper/15 px-[19.5px] py-[9.75px] text-[10.5px] font-semibold text-paper transition-colors hover:bg-paper hover:text-ink"
            >
              Submit another ticket
            </Link>
            <Link href="/" className="text-[9.75px] font-semibold text-paper/85 hover:text-paper">
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full flex-1 flex-col gap-[24px] px-[42px] pb-[67.5px] pt-[42px]">
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
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-[21px] rounded-[10.5px] border border-card-border bg-white px-[21px] py-[19.5px]"
      >
        {attempted && missing.length > 0 && (
          <div className="rounded-[7.5px] border border-amber-border bg-amber-bg px-[12px] py-[9px] text-[9.75px] text-amber-text-strong">
            Please complete: {missing.join(", ")}.
          </div>
        )}

        <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 xl:grid-cols-3">
          <div className="flex flex-col gap-[6px]">
            <FieldLabel icon={User} htmlFor="name">
              Name
            </FieldLabel>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <FieldLabel icon={Mail} htmlFor="email">
              Email
            </FieldLabel>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <FieldLabel icon={IdCard} htmlFor="staffNo">
              Staff No
            </FieldLabel>
            <input
              id="staffNo"
              type="text"
              value={staffNo}
              onChange={(e) => setStaffNo(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <FieldLabel icon={Phone} htmlFor="phone">
              Phone No / Ext
            </FieldLabel>
            <input
              id="phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <FieldLabel icon={MapPin} htmlFor="location">
              Location / Plant
            </FieldLabel>
            <select
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputClass}
            >
              <option value="">Select location</option>
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-[6px]">
            <FieldLabel icon={Building2} htmlFor="department">
              Department
            </FieldLabel>
            <select
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className={inputClass}
            >
              <option value="">Select department</option>
              {DEPARTMENTS.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-[6px]">
          <span className={`${labelClass} inline-flex items-center gap-[5.25px]`}>
            <ListChecks size={11.5} strokeWidth={2.25} className="text-faint" />
            User Request
          </span>
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

        <div className="flex flex-col gap-[6px]">
          <FieldLabel icon={MessageSquareText} htmlFor="subject">
            Subject
          </FieldLabel>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <FieldLabel icon={MessageSquareText} htmlFor="message">
            Message
          </FieldLabel>
          <textarea
            id="message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${inputClass} resize-y leading-[1.6]`}
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <FieldLabel icon={Paperclip} htmlFor="attachment">
            Attachment
          </FieldLabel>
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
            PDF, Word, Excel, images, text or zip — up to {MAX_FILES} files, 5MB each.
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

        <div className="flex flex-col gap-[6px]">
          <span className={`${labelClass} inline-flex items-center gap-[5.25px]`}>
            <ShieldCheck size={11.5} strokeWidth={2.25} className="text-faint" />
            Verify you&apos;re human
          </span>
          <div ref={turnstileContainerRef} />
          {verifyError && (
            <span className="text-[9px] font-semibold text-amber-text-strong">{verifyError}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={verifying}
          className="inline-flex w-fit items-center gap-[7.5px] whitespace-nowrap rounded-full bg-admin-gradient px-[19.5px] py-[9.75px] text-[10.5px] font-semibold text-paper shadow-[0_4px_12px_rgba(37,99,235,0.25)] transition-transform hover:-translate-y-[1px] disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {verifying ? "Verifying…" : "Submit ticket"} <ArrowRight size={14} strokeWidth={2.5} />
        </button>
      </form>

      <div className="flex flex-col gap-[15px] rounded-[16px] bg-admin-gradient px-[21px] py-[19.5px] text-paper shadow-[0_10px_28px_rgba(37,99,235,0.2)] lg:sticky lg:top-[84px]">
        <div className="flex flex-col gap-[4.5px]">
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-paper/75">
            Category
          </span>
          <span className="font-heading text-[17px] font-semibold leading-[1.3] tracking-[-0.01em]">
            {category}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-[7.5px]">
          <span className="rounded-full border border-paper/30 bg-paper/15 px-[10.5px] py-[4.5px] text-[9px] font-semibold uppercase tracking-[0.05em]">
            {priority} priority
          </span>
          <span className="rounded-full border border-paper/30 bg-paper/15 px-[10.5px] py-[4.5px] text-[9px] font-semibold uppercase tracking-[0.05em]">
            {team}
          </span>
        </div>
        <p className="border-t border-paper/20 pt-[12px] text-[10.5px] leading-[1.6] text-paper/80">
          Not the right category?{" "}
          <Link href="/submit" className="font-semibold text-paper hover:underline">
            Go back and choose again
          </Link>
          .
        </p>
      </div>
      </div>
    </main>
  );
}

export default function TicketPage() {
  return (
    <Suspense fallback={null}>
      <TicketForm />
    </Suspense>
  );
}
