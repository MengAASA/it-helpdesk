"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import SignOutButton from "./SignOutButton";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/submit", label: "Submit a ticket" },
  { href: "/tickets", label: "View my tickets" },
] as const;

export default function HeaderNav({
  adminHref,
  adminLabel,
  showSignOut,
}: {
  adminHref: string;
  adminLabel: string;
  showSignOut: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-[22.5px] md:flex">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-[10.5px] font-medium text-nav-text hover:text-white"
          >
            {l.label}
          </Link>
        ))}
        <a
          href={adminHref}
          className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-[4.5px] bg-paper px-[13.5px] py-[6.75px] text-[9.75px] font-semibold text-ink hover:bg-white hover:text-primary"
        >
          {adminLabel}
        </a>
        {showSignOut && <SignOutButton />}
      </nav>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-[33px] w-[33px] items-center justify-center rounded-[7.5px] text-paper hover:bg-white/10 md:hidden"
      >
        {open ? <X size={18} strokeWidth={2.25} /> : <Menu size={18} strokeWidth={2.25} />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full flex flex-col gap-[3px] border-b border-white/10 bg-nav-gradient px-[21px] py-[15px] shadow-[0_12px_24px_rgba(15,23,42,0.25)] md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-[7.5px] px-[10.5px] py-[9px] text-[11.25px] font-medium text-nav-text hover:bg-white/10 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={adminHref}
            onClick={() => setOpen(false)}
            className="mt-[6px] rounded-[7.5px] bg-paper px-[10.5px] py-[9px] text-center text-[11.25px] font-semibold text-ink"
          >
            {adminLabel}
          </a>
          {showSignOut && (
            <div className="mt-[3px]">
              <SignOutButton />
            </div>
          )}
        </div>
      )}
    </>
  );
}
