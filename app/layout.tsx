import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLawback Dashboard",
  description: "Local/off-chain CLawback Pool dashboard and accountant feed"
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
