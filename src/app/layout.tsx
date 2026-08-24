import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CRMProvider } from "@/context/CRMContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartCRM - Google Sheets Lead Management & Calling Assistant",
  description: "Next.js & Firebase CRM for Amazon Seller Leads, Dynamic Client Q&A, Click-to-Call Tracking & Sales Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#f8fafc] text-slate-900 antialiased font-sans flex flex-col`}>
        <CRMProvider>
          {children}
        </CRMProvider>
      </body>
    </html>
  );
}
