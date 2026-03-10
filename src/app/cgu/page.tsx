import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation – LeadVibe',
}

export default function CGUPage() {
  return (
    <main className="min-h-screen bg-[#0F172A] text-slate-200 px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-violet-400 hover:underline text-sm mb-8 inline-block">
          ← Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Conditions Générales d&apos;Utilisation</h1>
        <p className="text-slate-500 text-sm mb-10">En vigueur au 1er mars 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">1. Objet</h2>
          <p className="text-slate-400 leading-relaxed">
            Les présentes CGU régissent l&apos;utilisation de la plateforme LeadVibe, service SaaS de génération de leads B2B
            via l&apos;API Google Places. En créant un compte, vous acceptez sans réserve les présentes conditions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">2. Accès au service</h2>
          <p className="text-slate-400 leading-relaxed">
            LeadVibe est accessible à toute personne physique ou morale disposant d&apos;un compte valide.
            L&apos;accès est conditionné au respect des présentes CGU et au paiement de l&apos;abonnement le cas échéant.
            LeadVibe se réserve le droit de suspendre tout compte en cas de violation des présentes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">3. Plans et quotas</h2>
          <p className="text-slate-400 leading-relaxed">
            Chaque plan dispose d&apos;un nombre de recherches mensuelles défini (Freemium : 5, Starter : 100, Pro : 500).
            Les quotas sont réinitialisés le premier jour de chaque mois calendaire. Le dépassement du quota bloque les
            nouvelles recherches jusqu&apos;au renouvellement ou à l&apos;achat de crédits supplémentaires.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">4. Paiement et abonnement</h2>
          <p className="text-slate-400 leading-relaxed">
            Les paiements sont traités par Stripe. Les abonnements sont mensuels et se renouvellent automatiquement.
            Vous pouvez annuler à tout moment depuis votre espace client ; l&apos;accès reste actif jusqu&apos;à la fin de
            la période en cours. Aucun remboursement prorata ne sera effectué sauf obligation légale.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">5. Utilisation des données</h2>
          <p className="text-slate-400 leading-relaxed">
            Les leads générés via LeadVibe proviennent de données publiques (Google Places). Il vous appartient de vous
            assurer que votre usage de ces données respecte la réglementation applicable, notamment le RGPD.
            LeadVibe ne peut être tenu responsable de l&apos;utilisation que vous faites des leads obtenus.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text="white mb-3">6. Responsabilité</h2>
          <p className="text-slate-400 leading-relaxed">
            LeadVibe s&apos;efforce d&apos;assurer la disponibilité du service mais ne garantit pas un accès ininterrompu.
            La responsabilité de LeadVibe ne saurait être engagée en cas d&apos;indisponibilité temporaire, de perte de
            données ou de dommages indirects.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">7. Résiliation</h2>
          <p className="text-slate-400 leading-relaxed">
            Vous pouvez supprimer votre compte à tout moment. LeadVibe peut résilier votre accès en cas de non-respect
            des CGU, sans préavis ni remboursement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">8. Droit applicable</h2>
          <p className="text-slate-400 leading-relaxed">
            Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux compétents sont ceux
            du ressort du siège social de LeadVibe.
          </p>
        </section>

        <p className="text-slate-500 text-sm mt-12">Dernière mise à jour : mars 2026</p>
      </div>
    </main>
  )
}
