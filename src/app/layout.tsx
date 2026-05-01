import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Branding driven by NEXT_PUBLIC_APP_NAME so the same FE codebase can be
// deployed under either brand (FundMyCampus today, fork-based Admitverse
// later) without code changes — set the env var in the Vercel project.
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "FundMyCampus CRM";

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_NAME} — Lead management and CRM for education consultancies`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
