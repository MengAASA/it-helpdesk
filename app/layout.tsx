import type { Metadata } from "next";
import Link from "next/link";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { iamsLoginUrl } from "@/app/lib/iamsLoginUrl";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getOnlineUsers } from "@/app/lib/presence";
import HeaderNav from "@/app/components/HeaderNav";
import PresenceHeartbeat from "@/app/components/PresenceHeartbeat";
import OnlineUsersBar from "@/app/components/OnlineUsersBar";
import packageJson from "@/package.json";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
      className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper font-body text-ink">
        <header className="sticky top-0 z-50 flex items-center justify-between gap-[18px] border-b border-white/10 bg-nav-gradient px-[21px] py-[16.5px] text-paper shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] md:px-[42px]">
          <Link href="/" className="flex items-center gap-[10.5px] text-paper">
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer 400s on this asset under our basePath; a plain <img> avoids it for this fixed-size header icon. */}
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo-it.jpg`}
              alt="PHN Helpdesk logo"
              width={31.5}
              height={31.5}
              className="h-[31.5px] w-[31.5px] shrink-0 rounded-full object-cover"
            />
            <div className="flex flex-col gap-[1.5px]">
              <span className="font-heading text-xs font-semibold tracking-[0.01em]">
                PHN Helpdesk
              </span>
              <span className="text-[8.25px] uppercase tracking-[0.14em] text-faint">
                IT Support Portal
              </span>
            </div>
          </Link>
          <HeaderNav adminHref={adminHref} adminLabel={adminLabel} showSignOut={!!session} />
        </header>

        {session && <PresenceHeartbeat />}
        {children}

        {session && <OnlineUsersBar initialUsers={onlineUsers} />}

        <footer className="flex flex-wrap items-center justify-between gap-[15px] border-t border-white/10 bg-nav-gradient px-[42px] py-[21px] text-[9.75px] text-faint">
          <span>
            This system is developed by{" "}
            <strong className="font-semibold text-paper">PHN IT Department</strong>.
            <span className="text-faint/70">
              {" "}
              · v{packageJson.version}
              {buildLabel && ` · updated ${buildLabel}`}
            </span>
          </span>
          <div className="flex items-center gap-[19.5px]">
            <Link href="/" className="hover:text-paper">
              Home
            </Link>
            <Link href="/submit" className="hover:text-paper">
              Submit a ticket
            </Link>
            <Link href="/tickets" className="hover:text-paper">
              View my tickets
            </Link>
            <a href={adminHref} className="hover:text-paper">
              {adminLabel}
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
