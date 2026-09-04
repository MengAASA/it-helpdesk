import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { token } = await req.json();

  if (typeof token !== "string" || !token) {
    return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 });
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "Server is missing TURNSTILE_SECRET_KEY" },
      { status: 500 }
    );
  }

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  const data: { success: boolean; "error-codes"?: string[] } = await res.json();

  return NextResponse.json({ success: data.success === true, errorCodes: data["error-codes"] });
}
