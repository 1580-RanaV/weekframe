import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const atlassianSans = localFont({
  src: "../public/fonts/AtlassianSans.v3.ttf",
  display: "swap",
  variable: "--font-atlassian-sans",
});

const atlassianMono = localFont({
  src: "../public/fonts/AtlassianMono.v2.ttf",
  display: "swap",
  variable: "--font-atlassian-mono",
});

export const metadata: Metadata = {
  title: "Weekframe",
  description:
    "Weekframe is a weekly execution planner for software teams that turns assigned work into realistic Monday to Friday commitments.",
  icons: {
    icon: "/weekframe-icon.svg",
    shortcut: "/weekframe-icon.svg",
    apple: "/weekframe-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${atlassianSans.variable} ${atlassianMono.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
