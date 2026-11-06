/** Plain label/value rows under a small heading. Used by the ticket details cards (public and admin). */

export function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[10px]">
      <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      <dl className="flex flex-col gap-[8px]">{children}</dl>
    </div>
  );
}

export function Detail({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-[12px] text-[13px]">
      <dt className="text-muted-2">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children ?? value}</dd>
    </div>
  );
}
