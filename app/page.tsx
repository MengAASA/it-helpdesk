import Link from "next/link";
import { FilePlus2, Search, ShieldCheck, ArrowRight } from "lucide-react";
import { iamsLoginUrl } from "@/app/lib/iamsLoginUrl";
import { getIamsSession } from "@/app/lib/iamsSession";

export default async function Home() {
  const session = await getIamsSession();
  const adminHref = session ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/admin` : iamsLoginUrl();
  const adminLabel = session ? "Go to admin dashboard" : "Administrator login";

  return (
    <main className="flex flex-1 flex-col gap-12 px-[42px] pb-[67.5px] pt-[57px]">
      <section className="flex flex-col gap-[18px]">
        <div className="flex max-w-[510px] flex-col gap-[18px]">
          <span className="inline-flex w-fit items-center gap-[7.5px] rounded-full border border-result-border bg-result-bg px-[10.5px] py-[5.25px] text-[9px] font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="h-[5.25px] w-[5.25px] rounded-full bg-primary" />
            Service desk online
          </span>
          <h1 className="font-heading text-[45px] font-semibold leading-[1.05] tracking-[-0.02em] text-pretty">
            Report an IT issue.
            <br />
            Track it to resolution.
          </h1>
          <p className="max-w-[420px] text-[13.5px] leading-[1.6] text-muted text-pretty">
            One place to raise hardware, software, network and account requests
            with the PHN IT Department, and to follow the status of everything
            you have already submitted.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-[19.5px]">
        <Link
          href="/submit"
          className="group flex min-h-[195px] flex-col justify-between gap-[33px] rounded-[14px] border border-ink bg-ink px-[27px] py-[25.5px] text-paper shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-[2px] hover:bg-ink-2 hover:shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
        >
          <div className="flex flex-col gap-[9px]">
            <span className="flex h-[33px] w-[33px] items-center justify-center rounded-[10px] bg-primary text-paper">
              <FilePlus2 size={16} strokeWidth={2.25} />
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-primary-light">
              Step 1
            </span>
            <h2 className="font-heading text-[22.5px] font-semibold tracking-[-0.01em]">
              Submit a new ticket
            </h2>
            <p className="max-w-[285px] text-[11.25px] leading-[1.6] text-nav-text">
              Describe the problem in your own words. The assistant reads it
              and picks the right category for you.
            </p>
          </div>
          <span className="inline-flex items-center gap-[7.5px] text-[10.5px] font-semibold text-paper">
            Describe your issue{" "}
            <ArrowRight size={14} strokeWidth={2.5} className="transition-transform group-hover:translate-x-[3px]" />
          </span>
        </Link>

        <Link
          href="/tickets"
          className="group flex min-h-[195px] flex-col justify-between gap-[33px] rounded-[14px] border border-card-border bg-white px-[27px] py-[25.5px] text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-[2px] hover:border-[color:var(--color-blue)]/40 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)]"
        >
          <div className="flex flex-col gap-[9px]">
            <span className="flex h-[33px] w-[33px] items-center justify-center rounded-[10px] bg-[color:var(--color-blue-light)] text-[color:var(--color-blue-text)]">
              <Search size={16} strokeWidth={2.25} />
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-blue-text)]">
              Step 2
            </span>
            <h2 className="font-heading text-[22.5px] font-semibold tracking-[-0.01em]">
              View existing tickets
            </h2>
            <p className="max-w-[285px] text-[11.25px] leading-[1.6] text-muted">
              Enter your ticket number or staff ID to check status, read
              technician replies and add more information.
            </p>
          </div>
          <span className="inline-flex items-center gap-[7.5px] text-[10.5px] font-semibold text-[color:var(--color-blue-text)]">
            Check a ticket{" "}
            <ArrowRight size={14} strokeWidth={2.5} className="transition-transform group-hover:translate-x-[3px]" />
          </span>
        </Link>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-[21px] rounded-[16px] bg-admin-gradient px-[27px] py-[22.5px] text-paper shadow-[0_10px_28px_rgba(37,99,235,0.2)]">
        <div className="flex max-w-[465px] items-start gap-[13.5px]">
          <span className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px] border border-paper/30 bg-paper/15">
            <ShieldCheck size={17} strokeWidth={2.25} />
          </span>
          <div className="flex flex-col gap-[4.5px]">
            <span className="font-heading text-[13.5px] font-semibold">Are you IT staff?</span>
            <p className="text-[11.25px] leading-[1.6] text-paper/80">
              Sign in to the administrator console to assign, escalate and close
              tickets, and to review queue reports.
            </p>
          </div>
        </div>
        <a
          href={adminHref}
          className="inline-flex items-center gap-[7.5px] whitespace-nowrap rounded-full border border-paper/30 bg-paper/15 px-[19.5px] py-[9.75px] text-[10.5px] font-semibold text-paper transition-colors hover:bg-paper hover:text-ink"
        >
          {adminLabel} <ArrowRight size={14} strokeWidth={2.5} />
        </a>
      </section>
    </main>
  );
}
