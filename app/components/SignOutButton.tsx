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
      className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-[4.5px] border border-nav-text/40 px-[13.5px] py-[6.75px] text-[9.75px] font-semibold text-nav-text hover:border-paper hover:text-paper disabled:opacity-60"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
