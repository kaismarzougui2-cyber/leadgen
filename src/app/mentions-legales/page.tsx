import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Mentions légales – LeadVibe',
}

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-[#0F172A] text-slate-200 px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-violet-400 hover:underline text-sm mb-8 inline-block">
          ← Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-bold text-white mb-10">Mentions légales</h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">Éditeur du site</h2>
          <p className="text-slate-400 leading-relaxed">
            LeadVibe – [Nom de votre société ou nom du porteur de projet]<br />
            Forme juridique : [ex. SAS, auto-entrepreneur…]<br />
            SIRET : [À compléter]<br />
            Siège social : [Adresse complète]<br />
            Email : contact@leadvibe.fr
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">Directeur de publication</h2>
          <p className="text-slate-400 leading-relaxed">
            [Prénom Nom] – [Qualité]
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">Hébergement</h2>
          <p className="text-slate-400 leading-relaxed">
            Vercel Inc.<br />
            340 Pine Street, Suite 900, San Francisco, CA 94104 – USA<br />
            <a href="https://vercel.com" className="text-violet-400 hover:underline" target="_blank" rel="noopener noreferrer">vercel.com</a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">Propriété intellectuelle</h2>
          <p className="text-slate-400 leading-relaxed">
            L&apos;ensemble du contenu de ce site (textes, graphismes, logiciels) est la propriété exclusive de LeadVibe,
            sauf mentions contraires. Toute reproduction, même partielle, est interdite sans autorisation préalable.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">Données personnelles</h2>
          <p className="text-slate-400 leading-relaxed">
            Pour toute question relative à vos données personnelles, consultez notre{' '}
            <Link href="/confidentialite" className="text-violet-400 hover:underline">
              politique de confidentialité
            </Link>.
          </p>
        </section>

        <p className="text-slate-500 text-sm mt-12">Dernière mise à jour : mars 2026</p>
      </div>
    </main>
  )
}
