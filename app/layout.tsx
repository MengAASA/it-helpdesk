import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { iamsLoginUrl } from "@/app/lib/iamsLoginUrl";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getOnlineUsers } from "@/app/lib/presence";
import HeaderNav from "@/app/components/HeaderNav";
import PresenceHeartbeat from "@/app/components/PresenceHeartbeat";
import OnlineUsersBar from "@/app/components/OnlineUsersBar";
import PortalChrome from "@/app/components/PortalChrome";
import { THEME_INIT_SCRIPT } from "@/app/lib/theme";
import packageJson from "@/package.json";
import "./globals.css";

// Inter is the only typeface in the system: designed for screens and very legible at the compact
// 12-13px scale. Codes such as ticket IDs use it too, with its disambiguation features (globals.css).
const interSans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PHN Helpdesk · IT Support Portal",
    template: "%s · PHN Helpdesk",
  },
  description:
    "Submit and track IT support tickets with the PHN IT Department.",
};

const buildLabel = process.env.NEXT_PUBLIC_BUILD_TIME
  ? new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })
  : null;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getIamsSession();
  const adminHref = session ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/admin` : iamsLoginUrl();
  const adminLabel = session ? "Admin dashboard" : "Administrator login";
  const onlineUsers = session ? await getOnlineUsers() : [];

  return (
    <html
      lang="en"
      className={`${interSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved theme before first paint so dark mode never flashes light. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-paper font-body text-ink">
        <PortalChrome>
        <header className="sticky top-0 z-50 border-b border-card-border/60 bg-paper/75 backdrop-blur-xl">
          <div className="relative flex h-[56px] items-center justify-between gap-[16px] px-[16px] md:px-[32px]">
            <Link href="/" className="flex min-w-0 items-center gap-[10px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer 400s on this asset under our basePath; a plain <img> avoids it for this fixed-size header icon. */}
              <img
                src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo-it.jpg`}
                alt=""
                width={28}
                height={28}
                className="h-[28px] w-[28px] shrink-0 rounded-[8px] object-cover"
              />
              <span className="truncate text-[13px] font-semibold tracking-[-0.01em] text-ink">PHN Helpdesk</span>
              <span className="hidden text-[13px] text-faint sm:inline" aria-hidden="true">
                /
              </span>
              <span className="hidden truncate text-[13px] text-muted-2 sm:inline">IT Support</span>
            </Link>
            <HeaderNav adminHref={adminHref} adminLabel={adminLabel} showSignOut={!!session} />
          </div>
        </header>
        </PortalChrome>

        {session && <PresenceHeartbeat />}
        {children}

        <PortalChrome>
        {session && <OnlineUsersBar initialUsers={onlineUsers} />}

        <footer className="tile-ink">
          <div className="flex flex-col gap-[24px] px-[16px] pb-[20px] pt-[28px] md:px-[32px]">
            <div className="flex flex-wrap items-start justify-between gap-[28px]">
              <div className="flex max-w-[320px] flex-col gap-[8px]">
                <span className="flex items-center gap-[10px]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- see the header logo. */}
                  <img
                    src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo-it.jpg`}
                    alt=""
                    width={24}
                    height={24}
                    className="h-[24px] w-[24px] shrink-0 rounded-[7px] object-cover"
                  />
                  <span className="text-[13px] font-semibold text-ink">PHN Helpdesk</span>
                </span>
                <p className="text-[13px] leading-[20px] text-muted-2">Raise and track IT requests with the PHN IT Department.</p>
              </div>
              <nav aria-label="Footer" className="grid grid-cols-2 gap-x-[48px] gap-y-[8px] text-[13px]">
                <div className="flex flex-col gap-[8px]">
                  <span className="text-[12px] text-muted-2">Get help</span>
                  <Link href="/submit" className="text-ink/85 transition-colors hover:text-ink">
                    Submit a ticket
                  </Link>
                  <Link href="/tickets" className="text-ink/85 transition-colors hover:text-ink">
                    View my tickets
                  </Link>
                </div>
                <div className="flex flex-col gap-[8px]">
                  <span className="text-[12px] text-muted-2">IT staff</span>
                  <a href={adminHref} className="text-ink/85 transition-colors hover:text-ink">
                    {adminLabel}
                  </a>
                </div>
              </nav>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-[8px] border-t border-white/10 pt-[16px] text-[12px] text-muted-2">
              <span>
                Built by the <span className="text-muted">PHN IT Department</span>
              </span>
              <span className="tabular-nums">
                v{packageJson.version}
                {buildLabel && ` · updated ${buildLabel}`}
              </span>
            </div>
          </div>
        </footer>
        </PortalChrome>
      </body>
    </html>
  );
}
