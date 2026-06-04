import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lost Ark Party Planner",
  description: "Private raid group planning for Lost Ark schedules.",
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
