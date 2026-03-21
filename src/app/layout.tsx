import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "LeadGen – Trouvez vos prospects B2B",
  description:
    "Moteur de recherche de prospects B2B alimenté par Google Places. Trouvez des leads qualifiés avec numéros de téléphone en quelques secondes.",
  metadataBase: new URL("https://leadvibe.fr"),
  openGraph: {
    title: "LeadGen – Trouvez vos prospects B2B",
    description:
      "Trouvez des leads qualifiés avec numéros de téléphone en quelques secondes. Intégration CRM incluse.",
    type: "website",
    locale: "fr_FR",
    siteName: "LeadGen",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadGen – Trouvez vos prospects B2B",
    description:
      "Moteur de recherche de prospects B2B. Leads qualifiés + numéros de téléphone.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="bg-black text-white antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
