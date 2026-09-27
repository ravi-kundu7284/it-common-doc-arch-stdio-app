import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocArch AI - Software Architecture & Technical Design Document Studio",
  description:
    "AI-powered Software Architecture & Technical Design Document (LLD/HLD) generator with interactive Mermaid diagrams, trade-off analysis, and standalone HTML bundle exporting.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-600/40 selection:text-white">
        {children}
      </body>
    </html>
  );
}
