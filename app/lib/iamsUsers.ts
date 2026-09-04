import { cookies } from "next/headers";

const IAMS_SESSION_COOKIE = "token";

export type IamsUser = {
  id: string;
  name: string;
  email: string;
  staffId: string | null;
  role: string;
  status: string;
  createdAt: string;
};

export type IamsUsersResult =
  | { users: IamsUser[]; error: null }
  | { users: null; error: "unauthenticated" | "forbidden" | "unavailable" };

export async function getIamsUsers(): Promise<IamsUsersResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(IAMS_SESSION_COOKIE)?.value;
  if (!token) return { users: null, error: "unauthenticated" };

  const iamsBase = process.env.IAMS_BASE_URL;
  if (!iamsBase) return { users: null, error: "unavailable" };

  try {
    const res = await fetch(`${iamsBase}/api/users`, {
      headers: { Cookie: `${IAMS_SESSION_COOKIE}=${token}` },
      cache: "no-store",
    });
    if (res.status === 403) return { users: null, error: "forbidden" };
    if (!res.ok) return { users: null, error: "unavailable" };
    const users = (await res.json()) as IamsUser[];
    return { users, error: null };
  } catch {
    return { users: null, error: "unavailable" };
  }
}

export type UpdateIamsRoleResult =
  | { ok: true }
  | { ok: false; error: "unauthenticated" | "forbidden" | "unavailable" };

export async function updateIamsUserRole(
  iamsUserId: string,
  role: "admin" | "user"
): Promise<UpdateIamsRoleResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(IAMS_SESSION_COOKIE)?.value;
  if (!token) return { ok: false, error: "unauthenticated" };

  const iamsBase = process.env.IAMS_BASE_URL;
  if (!iamsBase) return { ok: false, error: "unavailable" };

  try {
    const res = await fetch(`${iamsBase}/api/users/${iamsUserId}`, {
      method: "PUT",
      headers: {
        Cookie: `${IAMS_SESSION_COOKIE}=${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role }),
    });
    if (res.status === 403) return { ok: false, error: "forbidden" };
    if (!res.ok) return { ok: false, error: "unavailable" };
    return { ok: true };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
