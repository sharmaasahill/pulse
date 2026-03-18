import type { Metadata } from "next";
import "./globals.css";
import { ThemeInitializer } from "./components/ThemeInitializer";

export const metadata: Metadata = {
  title: "Pulse - Project Management",
  description: "Pulse is a modern, real-time project management dashboard built for teams who move fast.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body suppressHydrationWarning={true}>
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
