import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit a ticket",
};

export default function SubmitLayout({ children }: LayoutProps<"/submit">) {
  return children;
}
