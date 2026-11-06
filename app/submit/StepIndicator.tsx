import { Check } from "lucide-react";

const STEPS = ["Describe it", "Your details", "Done"] as const;

/** Where the person is in the three-step submit flow. `current` is 0-based. */
export default function StepIndicator({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol aria-label="Steps" className="flex items-center gap-[8px] text-[12px]">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-[8px]" aria-current={active ? "step" : undefined}>
            <span
              className={`flex h-[22px] items-center gap-[6px] rounded-full pl-[3px] pr-[9px] font-medium transition-colors duration-300 ${
                active ? "bg-ink text-paper" : done ? "bg-surface-2 text-ink" : "text-muted-2"
              }`}
            >
              <span
                className={`flex h-[16px] w-[16px] items-center justify-center rounded-full text-[11px] tabular-nums ${
                  active ? "bg-paper/20" : done ? "bg-primary text-white" : "border border-card-border"
                }`}
              >
                {done ? <Check size={10} strokeWidth={3} /> : i + 1}
              </span>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="relative hidden h-px w-[28px] overflow-hidden bg-card-border sm:block" aria-hidden="true">
                <span
                  className={`absolute inset-y-0 left-0 bg-primary transition-[width] duration-500 ease-out ${done ? "w-full" : "w-0"}`}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
