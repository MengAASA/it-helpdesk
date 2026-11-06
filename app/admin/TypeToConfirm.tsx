"use client";

import { useId } from "react";

/** True once the typed text matches the phrase, ignoring case and surrounding spaces. */
export function confirmMatches(typed: string, phrase: string): boolean {
  return typed.trim().toLowerCase() === phrase.trim().toLowerCase();
}

/** "Type X to confirm" field for destructive actions, placed inside a ConfirmDialog. */
export default function TypeToConfirm({
  phrase,
  value,
  onChange,
  onSubmit,
}: {
  phrase: string;
  value: string;
  onChange: (value: string) => void;
  /** Called on Enter once the text matches. */
  onSubmit?: () => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-[6px]">
      <label htmlFor={id} className="text-[12px] text-muted">
        Type <span className="font-mono-plex font-medium text-ink">{phrase}</span> to confirm
      </label>
      <input
        id={id}
        autoFocus
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && confirmMatches(value, phrase)) {
            e.preventDefault();
            onSubmit?.();
          }
        }}
        className="h-[32px] rounded-[8px] border border-field-border bg-surface px-[10px] font-mono-plex text-[13px] text-ink outline-none transition-colors placeholder:text-faint hover:border-field-border-hover focus:border-rose-text"
      />
    </div>
  );
}
