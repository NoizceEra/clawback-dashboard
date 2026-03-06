import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "$CLAWBACK Rewards 🦞",
  description: "Your SOL refunds, every 10 minutes. Fun, simple, and automatic.",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
