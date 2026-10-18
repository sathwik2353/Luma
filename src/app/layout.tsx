
import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Luma — Your Money. Your Clarity.",
    template: "%s | Luma",
  },

  description:
    "Track income, manage expenses, plan budgets, and understand your money with Luma.",

  applicationName: "Luma",

  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    title: "Luma",
    statusBarStyle: "black-translucent",
  },

  icons: {
    icon: [
      {
        url: "/icons/luma.svg",
        type: "image/svg+xml",
      },
      {
        url: "/icons/luma-192.png",
        type: "image/png",
        sizes: "192x192",
      },
    ],
    apple: [
      {
        url: "/icons/luma-180.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },

  keywords: [
    "Luma",
    "personal finance",
    "expense tracker",
    "budget planner",
    "money management",
  ],

  formatDetection: {
    telephone: false,
  },

  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050608",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
