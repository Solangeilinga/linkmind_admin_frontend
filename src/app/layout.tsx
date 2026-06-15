import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkMind Admin",
  description: "Panneau d'administration LinkMind",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
