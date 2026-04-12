import type { Metadata } from "next";
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
  title: "Kelvi — AI Learning for Kids",
  description:
    "An AI thinking partner that never gives answers — only better questions. For schools and families.",
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
