"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard access denied — nothing sensible to do
    }
  }

  return (
    <button type="button" onClick={handleCopy} aria-label={label ?? "Copy"} className={className}>
      {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2.25} />}
    </button>
  );
}
