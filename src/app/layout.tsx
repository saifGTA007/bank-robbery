// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MTA br cracker",
  description: "Secure math functions with biometrics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* This "children" is where your page.tsx content will appear */}
        {children}
      </body>
    </html>
  );
}