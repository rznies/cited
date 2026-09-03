import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "cited — AEO Visibility Audit",
  description:
    "Does Google AI + ChatGPT recommend you, and who beats you? $29 one-time audit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
