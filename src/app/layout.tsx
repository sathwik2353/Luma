
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luma — Your money. Your clarity.",
  description:
    "A personal finance dashboard to track income, manage expenses, set budgets, and understand your money.",
  applicationName: "Luma",
  keywords: [
    "Luma",
    "personal finance",
    "expense tracker",
    "budget planner",
    "money management",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
