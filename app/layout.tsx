import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestion des Ventes",
  description: "Plateforme de gestion des ventes avec processus de validation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
