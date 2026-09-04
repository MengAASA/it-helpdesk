import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My tickets",
};

export default function TicketsLayout({ children }: LayoutProps<"/tickets">) {
  return children;
}
