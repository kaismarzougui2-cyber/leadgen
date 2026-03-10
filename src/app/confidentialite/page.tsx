import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Politique de confidentialité – LeadVibe',
}

export default function ConfidentialitePage() {
  return (
    <main className="min-h-screen bg-[#0F172A] text-slate-200 px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-violet-400 hover:underline text-sm mb-8 inline-block">
          ← Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Politique de confidentialité</h1>
        <p className="text-slate-500 text-sm mb-10">Conforme au RGPD – En vigueur au 1er mars 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">1. Responsable du traitement</h2>
          <p className="text-slate-400 leading-relaxed">
            LeadVibe – [Nom/société]<br />
            Email DPO : privacy@leadvibe.fr<br />
            [Adresse postale]
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">2. Données collectées</h2>
          <div className="text-slate-400 leading-relaxed space-y-2">
            <p><strong className="text-slate-300">Données de compte :</strong> adresse email, identifiant unique (via Supabase Auth).</p>
            <p><strong className="text-slate-300">Données d&apos;utilisation :</strong> historique des recherches (métier, ville, nombre de résultats), horodatage.</p>
            <p><strong className="text-slate-300">Données de facturation :</strong> gérées exclusivement par Stripe — nous ne stockons aucune donnée bancaire.</p>
            <p><strong className="text-slate-300">Cookies :</strong> cookies de session nécessaires au fonctionnement de l&apos;authentification (pas de cookies publicitaires).</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">3. Finalités et base légale</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-400 border border-slate-700 rounded-lg overflow-hidden">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="text-left px-4 py-3">Finalité</th>
                  <th className="text-left px-4 py-3">Base légale</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-700">
                  <td className="px-4 py-3">Création et gestion du compte</td>
                  <td className="px-4 py-3">Exécution du contrat</td>
                </tr>
                <tr className="border-t border-slate-700">
                  <td className="px-4 py-3">Fourniture du service (recherches)</td>
                  <td className="px-4 py-3">Exécution du contrat</td>
                </tr>
                <tr className="border-t border-slate-700">
                  <td className="px-4 py-3">Facturation et paiements</td>
                  <td className="px-4 py-3">Obligation légale</td>
                </tr>
                <tr className="border-t border-slate-700">
                  <td className="px-4 py-3">Amélioration du service (analytics agrégés)</td>
                  <td className="px-4 py-3">Intérêt légitime</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">4. Sous-traitants</h2>
          <div className="text-slate-400 leading-relaxed space-y-2">
            <p><strong className="text-slate-300">Supabase</strong> – Authentification et base de données (hébergé AWS eu-west)</p>
            <p><strong className="text-slate-300">Stripe</strong> – Traitement des paiements</p>
            <p><strong className="text-slate-300">Vercel</strong> – Hébergement de l&apos;application</p>
            <p><strong className="text-slate-300">Google</strong> – API Places pour la génération de leads</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">5. Durée de conservation</h2>
          <div className="text-slate-400 leading-relaxed space-y-2">
            <p>Données de compte : jusqu&apos;à suppression du compte + 30 jours.</p>
            <p>Historique des recherches : 12 mois glissants.</p>
            <p>Données de facturation : 10 ans (obligation comptable).</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">6. Vos droits (RGPD)</h2>
          <p className="text-slate-400 leading-relaxed mb-3">
            Vous disposez des droits suivants sur vos données : accès, rectification, effacement, portabilité, opposition,
            limitation du traitement. Pour exercer ces droits, contactez-nous à privacy@leadvibe.fr.
          </p>
          <p className="text-slate-400 leading-relaxed">
            Vous pouvez également introduire une réclamation auprès de la{' '}
            <a
              href="https://www.cnil.fr"
              className="text-violet-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              CNIL
            </a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">7. Cookies</h2>
          <p className="text-slate-400 leading-relaxed">
            LeadVibe utilise uniquement des cookies strictement nécessaires à l&apos;authentification (session Supabase).
            Aucun cookie publicitaire ou de tracking tiers n&apos;est déposé.
          </p>
        </section>

        <p className="text-slate-500 text-sm mt-12">Dernière mise à jour : mars 2026</p>
      </div>
    </main>
  )
}
