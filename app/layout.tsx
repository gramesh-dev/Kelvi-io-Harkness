import type { Metadata, Viewport } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Harkness",
  description:
    "AI-powered Harkness discussion tools for mathematics teachers.",
};

/** Matches static pages (`public/*.html`) — avoids odd mobile scaling if the browser falls back oddly without an explicit tag. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${sourceSerif.variable}`}
    >
      <body className={`${dmSans.className} min-h-screen`}>{children}</body>
    </html>
  );
}
