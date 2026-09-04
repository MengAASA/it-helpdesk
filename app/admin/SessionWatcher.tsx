"use client";

import { useEffect } from "react";

const POLL_INTERVAL_MS = 20_000;

export default function SessionWatcher({ loginUrl }: { loginUrl: string }) {
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/admin/session`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!data.authenticated) {
          window.location.href = loginUrl;
        }
      } catch {
        // Transient network hiccup — don't bounce the user on a fluke.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loginUrl]);

  return null;
}
