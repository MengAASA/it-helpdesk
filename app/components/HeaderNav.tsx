"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import SignOutButton from "./SignOutButton";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/submit", label: "Submit a ticket" },
  { href: "/tickets", label: "View my tickets" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export default function HeaderNav({
  adminHref,
  adminLabel,
  showSignOut,
}: {
  adminHref: string;
  adminLabel: string;
  showSignOut: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // The mobile menu closes on Escape or a tap outside it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!panelRef.current?.parentElement?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <>
      <nav aria-label="Main" className="hidden items-center gap-[2px] rounded-[10px] border border-card-border/70 bg-surface/70 p-[3px] md:flex">
        {LINKS.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-[28px] items-center rounded-[7px] px-[11px] text-[13px] font-medium transition-colors duration-150 ${
                active ? "bg-ink text-paper" : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden items-center gap-[6px] md:flex">
        {showSignOut && <SignOutButton />}
        <a
          href={adminHref}
          className="group inline-flex h-[32px] items-center gap-[6px] whitespace-nowrap rounded-[8px] border border-field-border bg-surface px-[12px] text-[13px] font-medium text-ink transition-colors hover:border-field-border-hover hover:bg-surface-2"
        >
          {adminLabel}
          <ArrowUpRight
            size={14}
            strokeWidth={2}
            className="text-muted-2 transition-transform duration-200 group-hover:-translate-y-[1px] group-hover:translate-x-[1px]"
          />
        </a>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] text-ink hover:bg-surface-2 md:hidden"
      >
        {open ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="animate-phn-rise absolute left-[12px] right-[12px] top-[calc(100%+6px)] flex flex-col gap-[2px] rounded-[14px] border border-card-border bg-surface p-[6px] shadow-pop md:hidden"
        >
          {LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex h-[40px] items-center rounded-[9px] px-[12px] text-[13px] font-medium ${
                  active ? "bg-ink text-paper" : "text-ink hover:bg-surface-2"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <div className="my-[4px] h-px bg-card-border/70" />
          <a
            href={adminHref}
            onClick={() => setOpen(false)}
            className="flex h-[40px] items-center justify-between rounded-[9px] px-[12px] text-[13px] font-medium text-ink hover:bg-surface-2"
          >
            {adminLabel}
            <ArrowUpRight size={14} strokeWidth={2} className="text-muted-2" />
          </a>
          {showSignOut && (
            <div className="px-[6px] pb-[4px] pt-[2px]">
              <SignOutButton />
            </div>
          )}
        </div>
      )}
    </>
  );
}
