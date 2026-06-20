import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Razor",
  description: "Personal study tracker for exams, lectures, revision, and daily workload.",
  icons: {
    icon: "/razor-icon-transparent.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
