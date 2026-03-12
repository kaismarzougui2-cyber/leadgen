import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadGen – Trouvez vos prospects B2B",
  description:
    "Moteur de recherche de prospects B2B alimenté par Google Places. Trouvez des leads qualifiés en quelques secondes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="bg-[#0F172A] text-white antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
