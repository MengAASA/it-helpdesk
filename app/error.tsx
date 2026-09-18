"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col items-center justify-center gap-[21px] px-[42px] py-[67.5px] text-center">
      <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-amber-bg text-[color:var(--color-amber-solid)]">
        <AlertTriangle size={26} strokeWidth={2} />
      </span>
      <div className="flex flex-col gap-[7.5px]">
        <h1 className="font-heading text-[24px] font-semibold tracking-[-0.02em]">
          Something went wrong
        </h1>
        <p className="text-[12px] leading-[1.6] text-muted">
          An unexpected error occurred while loading this page. You can try again, or head
          back to the homepage.
        </p>
        {error.digest && (
          <span className="font-mono-plex text-[9px] text-faint">Error ref: {error.digest}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-[10.5px]">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex items-center gap-[7.5px] whitespace-nowrap rounded-full bg-admin-gradient px-[19.5px] py-[9.75px] text-[10.5px] font-semibold text-paper shadow-[0_4px_12px_rgba(46,16,101,0.3)]"
        >
          <RotateCcw size={13} strokeWidth={2.25} />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-[7.5px] whitespace-nowrap rounded-full border border-card-border bg-white px-[19.5px] py-[9.75px] text-[10.5px] font-semibold text-ink hover:border-primary/40 hover:text-primary"
        >
          <Home size={13} strokeWidth={2.25} />
          Back to home
        </Link>
      </div>
    </main>
  );
}
