"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 30_000;

export default function PresenceHeartbeat() {
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    function sendHeartbeat() {
      fetch(`${basePath}/api/presence/heartbeat`, { method: "POST" }).catch(() => {
        // Transient network hiccup — the next heartbeat will retry.
      });
    }

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
