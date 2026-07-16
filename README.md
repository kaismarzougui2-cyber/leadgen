# LeadVibe

SaaS de génération de leads B2B pour le marché français : recherche de prospects
par métier + ville (Google Places), enrichissement SIRENE (INSEE), CRM intégré
(statuts, dossiers, rappels, Kanban), Mode Booster multi-villes, analytics et
abonnements Stripe.

## Stack

- **Next.js 15** (App Router) + React 19 + Tailwind CSS 4
- **Supabase** — auth (email + Google OAuth), Postgres avec RLS
- **Stripe** — abonnements Starter / Pro, webhook de synchronisation
- **Google Places API (v1)** — source des prospects
- **INSEE SIRENE V3.11** — enrichissement SIREN/SIRET (optionnel)

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis remplir les variables
npm run download-communes    # télécharge public/communes.json (geo.api.gouv.fr)
npm run dev
```

Sans `GOOGLE_PLACES_API_KEY`, l'app tourne en **mode démo** (résultats fictifs,
aucun crédit consommé).

## Variables d'environnement

Voir [`.env.example`](.env.example). Les clés critiques :

| Variable | Rôle |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Écritures serveur (quotas, abonnements, cache). Jamais côté client. |
| `STRIPE_WEBHOOK_SECRET` | Vérification de signature du webhook `/api/stripe/webhook` |
| `CRON_SECRET` | Protège `/api/cron/reset-quotas` (cron Vercel quotidien) |
| `NEXT_PUBLIC_SITE_URL` | URL publique, utilisée pour les redirections Stripe |

## Base de données

Exécuter les fichiers `supabase/migrations/*.sql` dans le SQL editor Supabase.
`harden_security.sql` doit être exécuté en dernier : il active la RLS sur
`subscriptions` (lecture seule pour les utilisateurs), `search_cache` (accès
service role uniquement) et `searches`.

Tables : `profiles`, `subscriptions`, `prospects`, `prospect_folders`,
`call_logs`, `searches`, `search_cache`, `boost_search_history`.

## Stripe

1. Créer les produits Starter (25 €/mois) et Pro (59 €/mois), reporter les
   `price_...` dans les variables d'env.
2. Configurer le webhook → `https://<domaine>/api/stripe/webhook` avec les
   événements : `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
3. (Optionnel) Créer un coupon « 1er mois » et renseigner
   `STRIPE_STARTER_FIRST_MONTH_COUPON`.

## Quotas

- Réservation **atomique** des crédits (verrou optimiste sur `searches_used`),
  remboursement automatique si l'appel Google échoue.
- Reset : inline après 30 jours, aligné sur le cycle Stripe (`invoice.paid`),
  filet de sécurité via le cron quotidien (`vercel.json`).
- Comptes staff (`subscriptions.is_staff = true`) : illimités.

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Télécharge les communes puis build de production |
| `npm run lint` | ESLint |
| `npm run download-communes` | Regénère `public/communes.json` |
