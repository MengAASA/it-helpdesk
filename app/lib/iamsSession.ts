import { cookies } from "next/headers";

const IAMS_SESSION_COOKIE = "token";

export type IamsIdentity = {
  name: string;
  email: string;
  role: string;
  staffId: string;
};

export async function getIamsSession(): Promise<IamsIdentity | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(IAMS_SESSION_COOKIE)?.value;
  if (!token) return null;

  const iamsBase = process.env.IAMS_BASE_URL;
  if (!iamsBase) return null;

  try {
    const res = await fetch(`${iamsBase}/api/auth/me`, {
      headers: { Cookie: `${IAMS_SESSION_COOKIE}=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as IamsIdentity;
  } catch {
    return null;
  }
}
