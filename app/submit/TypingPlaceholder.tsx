"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const TYPE_MS = 45;
const DELETE_MS = 22;
const HOLD_MS = 1700;
const GAP_MS = 350;

/**
 * An example that types itself out, pauses, deletes itself and moves on to the next one. Shown
 * over the empty description box while it isn't focused. It only re-renders this one line, and
 * people who prefer reduced motion see the first example, still.
 */
export default function TypingPlaceholder({ phrases, className = "" }: { phrases: string[]; className?: string }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduceMotion || phrases.length === 0) return;
    const full = phrases[index % phrases.length];
    let delay: number;
    let next: () => void;

    if (!deleting && text.length < full.length) {
      // A little jitter so it reads like someone typing, not a ticker.
      delay = TYPE_MS + Math.random() * 40 - 15;
      next = () => setText(full.slice(0, text.length + 1));
    } else if (!deleting) {
      delay = HOLD_MS;
      next = () => setDeleting(true);
    } else if (text.length > 0) {
      delay = DELETE_MS;
      next = () => setText(full.slice(0, text.length - 1));
    } else {
      delay = GAP_MS;
      next = () => {
        setDeleting(false);
        setIndex((i) => (i + 1) % phrases.length);
      };
    }

    const timer = window.setTimeout(next, delay);
    return () => window.clearTimeout(timer);
  }, [text, deleting, index, phrases, reduceMotion]);

  return (
    <span aria-hidden="true" className={`pointer-events-none select-none ${className}`}>
      {reduceMotion ? phrases[0] : text}
      <span className="typing-caret ml-[1px] inline-block h-[16px] w-[1.5px] translate-y-[3px] rounded-full bg-primary/70" />
    </span>
  );
}
