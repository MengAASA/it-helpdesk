"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { expandTicketInput } from "@/app/lib/ticketNumberFormat";

/** Home page box: type a ticket ID and go straight to that ticket's page. */
export default function TicketLookup() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const id = expandTicketInput(value);
    if (id) router.push(`/tickets/${encodeURIComponent(id)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[10px]">
      <label htmlFor="home-ticket-id" className="text-[12px] font-medium text-muted">
        Ticket ID
      </label>
      <div className="flex gap-[8px]">
        <input
          id="home-ticket-id"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="TCK-7K3F-9Q2M"
          autoComplete="off"
          spellCheck={false}
          className="h-[36px] min-w-0 flex-1 rounded-[8px] border border-field-border bg-surface px-[12px] text-[13px] uppercase tabular-nums tracking-[0.02em] text-ink outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-faint hover:border-field-border-hover"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="inline-flex h-[36px] shrink-0 items-center gap-[6px] rounded-[8px] bg-ink px-[14px] text-[13px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Open
          <ArrowRight size={14} strokeWidth={2} />
        </button>
      </div>
      <p className="text-[12px] text-muted-2">
        Lost the ID?{" "}
        <Link href="/tickets" className="font-medium text-primary hover:underline">
          Find your tickets with your staff ID
        </Link>
      </p>
    </form>
  );
}
