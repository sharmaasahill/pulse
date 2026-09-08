import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

/**
 * Fonts are self-hosted by next/font instead of a CSS @import.
 * This removes a render-blocking request to fonts.googleapis.com and
 * eliminates layout shift, since Next inlines the font metrics.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Pulse — Real-time project boards",
  description:
    "Pulse is a real-time Kanban workspace. Move tasks, assign teammates, comment, and stay in sync — instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
