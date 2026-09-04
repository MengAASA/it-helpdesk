import { AlertTriangle } from "lucide-react";

export default function RestrictedMessage({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-[10.5px] rounded-[14px] border border-dashed border-amber-border bg-amber-bg px-[18px] py-[48px] text-center">
      <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[color:var(--color-amber-solid)] text-paper shadow-[0_6px_16px_rgba(217,119,6,0.25)]">
        <AlertTriangle size={20} strokeWidth={2.25} />
      </span>
      <span className="text-[12.75px] font-semibold text-ink">{message}</span>
    </div>
  );
}
