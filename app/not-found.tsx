import Link from "next/link";
import type { Metadata } from "next";
import { SearchX, Home, FilePlus2, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col items-center justify-center gap-[21px] px-[42px] py-[67.5px] text-center">
      <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-result-bg text-primary">
        <SearchX size={26} strokeWidth={2} />
      </span>
      <div className="flex flex-col gap-[7.5px]">
        <h1 className="font-heading text-[24px] font-semibold tracking-[-0.02em]">
          We couldn&apos;t find that page
        </h1>
        <p className="text-[12px] leading-[1.6] text-muted">
          The page or ticket you&apos;re looking for doesn&apos;t exist, or the link may be
          out of date.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-[10.5px]">
        <Link
          href="/"
          className="inline-flex items-center gap-[7.5px] whitespace-nowrap rounded-full bg-admin-gradient px-[19.5px] py-[9.75px] text-[10.5px] font-semibold text-paper shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
        >
          <Home size={13} strokeWidth={2.25} />
          Back to home
        </Link>
        <Link
          href="/tickets"
          className="inline-flex items-center gap-[7.5px] whitespace-nowrap rounded-full border border-card-border bg-white px-[19.5px] py-[9.75px] text-[10.5px] font-semibold text-ink hover:border-primary/40 hover:text-primary"
        >
          <Search size={13} strokeWidth={2.25} />
          Find a ticket
        </Link>
        <Link
          href="/submit"
          className="inline-flex items-center gap-[7.5px] whitespace-nowrap rounded-full border border-card-border bg-white px-[19.5px] py-[9.75px] text-[10.5px] font-semibold text-ink hover:border-primary/40 hover:text-primary"
        >
          <FilePlus2 size={13} strokeWidth={2.25} />
          Submit a ticket
        </Link>
      </div>
    </main>
  );
}
