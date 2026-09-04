import type { Metadata } from "next";
import { AppWindow, ExternalLink, AlertTriangle } from "lucide-react";
import { getExternalSystems } from "@/app/lib/externalSystems";

export const metadata: Metadata = {
  title: "Others · Admin",
};

export default function AdminOthers() {
  const systems = getExternalSystems();

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-[4.5px]">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Other systems</h1>
        <p className="text-[10.5px] text-muted">
          Quick links to other PHN systems you have access to. Click a card to open it in a new tab.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-3">
        {systems.map((system) => (
          <a
            key={system.name}
            href={system.url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!system.url}
            className={`group flex flex-col gap-[13.5px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all ${
              system.url
                ? "hover:-translate-y-[1.5px] hover:border-primary/30 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                : "pointer-events-none opacity-60"
            }`}
          >
            <div className="flex items-center justify-between gap-[9px]">
              <span className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-result-bg text-primary">
                <AppWindow size={17} strokeWidth={2.25} />
              </span>
              {system.url ? (
                <ExternalLink
                  size={13}
                  strokeWidth={2.25}
                  className="text-faint transition-colors group-hover:text-primary"
                />
              ) : (
                <AlertTriangle size={13} strokeWidth={2.25} className="text-amber-text-strong" />
              )}
            </div>
            <div className="flex flex-col gap-[3px]">
              <span className="font-heading text-[13.5px] font-semibold text-ink">{system.name}</span>
              <p className="text-[10.5px] leading-[1.5] text-muted">{system.description}</p>
              {!system.url && (
                <span className="mt-[3px] text-[9px] font-semibold text-amber-text-strong">
                  Not configured on this server.
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
