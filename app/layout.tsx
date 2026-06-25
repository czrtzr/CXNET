import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

// Sans for body and labels.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

// Mono for tickers and IDs.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Refined serif for headings and the large balance figures.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

// Absolute base for OG/twitter image URLs and canonical links. Prefers an
// explicit override, then Vercel's production domain, then localhost for dev.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const description = "A private wealth command center.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CXNET",
    template: "%s · CXNET",
  },
  description,
  applicationName: "CXNET",
  appleWebApp: { capable: true, title: "CXNET", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: "CXNET",
    title: "CXNET",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "CXNET",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0807",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
