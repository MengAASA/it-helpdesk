"use client";

import { useState } from "react";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/admin/signout`, {
        method: "POST",
      });
    } finally {
      window.location.href = process.env.NEXT_PUBLIC_BASE_PATH ?? "/";
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="inline-flex h-[32px] items-center whitespace-nowrap rounded-[8px] px-[10px] text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
