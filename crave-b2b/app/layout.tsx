import type { Metadata } from "next";
import { Geist, Geist_Mono, Josefin_Sans } from "next/font/google";
import { SiteNavbar } from "@/components/layout/site-navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const josefinSans = Josefin_Sans({
  subsets: ["latin"],
  variable: "--font-josefin-sans",
});

export const metadata: Metadata = {
  title: "CRAVE for Restaurants",
  description:
    "Real-time bookings, AI analytics, and one-prompt ad generation for CRAVE partner venues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${josefinSans.className} h-full antialiased`}
    >
      <body className="flex min-h-svh flex-col font-sans">
        <SiteNavbar />
        {children}
      </body>
    </html>
  );
}
