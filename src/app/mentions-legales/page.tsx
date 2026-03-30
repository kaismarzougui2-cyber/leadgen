import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Mentions légales – LeadVibe',
}

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-black text-[#aaaaaa] px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-[#E5000A] hover:underline text-sm mb-8 inline-block">
          ← Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-bold text-white mb-10">Mentions légales</h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">Éditeur du site</h2>
          <p className="text-[#aaaaaa] leading-relaxed">
            Alverra – Entrepreneur individuel<br />
            SIREN : 895 118 636<br />
            SIRET : 895 118 636 00037<br />
            Code APE : 7311Z – Activités des agences de publicité<br />
            Siège social : 6 bis Boulevard Berthelot, Bureau 3, 34000 Montpellier, France<br />
            Date d&apos;immatriculation RNE : 17/03/2026<br />
            Email : contact@leadvibe.fr
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">Directeur de publication</h2>
          <p className="text-[#aaaaaa] leading-relaxed">
            Le gérant d&apos;Alverra
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">Hébergement</h2>
          <p className="text-[#aaaaaa] leading-relaxed">
            Vercel Inc.<br />
            340 Pine Street, Suite 900, San Francisco, CA 94104 – USA<br />
            <a href="https://vercel.com" className="text-[#E5000A] hover:underline" target="_blank" rel="noopener noreferrer">vercel.com</a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">Propriété intellectuelle</h2>
          <p className="text-[#aaaaaa] leading-relaxed">
            L&apos;ensemble du contenu de ce site (textes, graphismes, logiciels) est la propriété exclusive de LeadVibe,
            sauf mentions contraires. Toute reproduction, même partielle, est interdite sans autorisation préalable.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">Données personnelles</h2>
          <p className="text-[#aaaaaa] leading-relaxed">
            Pour toute question relative à vos données personnelles, consultez notre{' '}
            <Link href="/confidentialite" className="text-[#E5000A] hover:underline">
              politique de confidentialité
            </Link>.
          </p>
        </section>

        <p className="text-[#666666] text-sm mt-12">Dernière mise à jour : mars 2026</p>
      </div>
    </main>
  )
}
