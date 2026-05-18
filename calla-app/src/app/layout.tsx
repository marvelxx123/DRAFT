import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | CALLA",
    default: "CALLA — Every call, perfectly answered.",
  },
  description:
    "CALLA is an AI-powered phone answering service that handles every call, captures leads, and helps you get more Google reviews — automatically.",
  keywords: ["AI answering service", "virtual receptionist", "call answering", "small business phone"],
  authors: [{ name: "CALLA" }],
  creator: "CALLA",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://calla.ai"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "CALLA",
    title: "CALLA — Every call, perfectly answered.",
    description:
      "AI-powered phone answering for small businesses. Never miss a call again.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CALLA — Every call, perfectly answered.",
    description:
      "AI-powered phone answering for small businesses. Never miss a call again.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0D4F3C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-cream font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
