# Plan d'Implementation - SaaS SEO Automation Platform

## Nom: Configurable (placeholder: "SEOPilot")
## Deploiement: Docker sur VPS Hostinger KVM 2 (2CPU, 8GB RAM, 100GB SSD)

---

## PHASE 1 - MVP Foundation (Ce qu'on construit maintenant)

### Stack Technique
- **Frontend + Backend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Base de donnees**: PostgreSQL (Docker)
- **ORM**: Prisma
- **Auth**: NextAuth.js (email/password + Google OAuth)
- **Queue/Jobs**: BullMQ + Redis (Docker)
- **AI**: OpenAI API (GPT-4o)
- **Paiements**: Stripe
- **CMS Integration**: WordPress REST API + Webhooks
- **Deploiement**: Docker Compose + Nginx reverse proxy

### Structure des Fichiers

```
autoseo/
├── docker-compose.yml          # PostgreSQL + Redis + App + Nginx
├── Dockerfile                  # Multi-stage build Next.js
├── nginx/
│   └── default.conf            # Reverse proxy config
├── prisma/
│   ├── schema.prisma           # Modele de donnees complet
│   └── seed.ts                 # Seed data
├── public/
│   ├── logo.svg
│   └── og-image.png
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Layout racine
│   │   ├── page.tsx            # Page d'accueil marketing
│   │   ├── globals.css         # Styles globaux Tailwind
│   │   ├── (marketing)/        # Pages publiques
│   │   │   ├── features/page.tsx
│   │   │   ├── pricing/page.tsx
│   │   │   ├── blog/page.tsx
│   │   │   └── contact/page.tsx
│   │   ├── (auth)/             # Auth pages
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   ├── dashboard/          # App protegee
│   │   │   ├── layout.tsx      # Dashboard layout + sidebar
│   │   │   ├── page.tsx        # Vue principale
│   │   │   ├── sites/page.tsx  # Gestion des sites
│   │   │   ├── articles/page.tsx
│   │   │   ├── keywords/page.tsx
│   │   │   ├── backlinks/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── onboarding/page.tsx
│   │   └── api/                # API Routes
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── sites/route.ts
│   │       ├── articles/route.ts
│   │       ├── keywords/route.ts
│   │       ├── backlinks/route.ts
│   │       ├── analytics/route.ts
│   │       ├── ai/generate/route.ts
│   │       ├── wordpress/publish/route.ts
│   │       ├── webhooks/stripe/route.ts
│   │       └── cron/route.ts
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── marketing/          # Composants pages marketing
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── Pricing.tsx
│   │   │   ├── Testimonials.tsx
│   │   │   ├── CTA.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Navbar.tsx
│   │   └── dashboard/          # Composants dashboard
│   │       ├── Sidebar.tsx
│   │       ├── StatsCards.tsx
│   │       ├── ArticlesList.tsx
│   │       ├── KeywordTable.tsx
│   │       ├── SEOScoreCard.tsx
│   │       ├── OnboardingWizard.tsx
│   │       └── SiteConnector.tsx
│   ├── lib/
│   │   ├── prisma.ts           # Client Prisma
│   │   ├── auth.ts             # Config NextAuth
│   │   ├── stripe.ts           # Client Stripe
│   │   ├── openai.ts           # Client OpenAI
│   │   ├── queue.ts            # BullMQ config
│   │   ├── wordpress.ts        # WordPress API client
│   │   └── utils.ts            # Utilitaires
│   ├── services/               # Business logic
│   │   ├── article-generator.ts
│   │   ├── keyword-researcher.ts
│   │   ├── backlink-builder.ts
│   │   ├── site-analyzer.ts
│   │   ├── seo-scorer.ts
│   │   └── publisher.ts
│   ├── workers/                # Background jobs
│   │   ├── article-worker.ts
│   │   ├── keyword-worker.ts
│   │   ├── backlink-worker.ts
│   │   └── analytics-worker.ts
│   └── config/
│       ├── site.ts             # Config site (nom, etc.)
│       └── plans.ts            # Plans tarifaires
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── PLAN.md
```

### Modele de Donnees (Prisma)

```
User -> Sites -> Articles, Keywords, Backlinks
User -> Subscription (Stripe)
Site -> AnalyticsSnapshots
Article -> Keywords (many-to-many)
```

Tables principales:
- **User**: id, email, name, password, plan, stripeCustomerId
- **Site**: id, userId, url, name, niche, language, wordpressUrl, wordpressKey
- **Article**: id, siteId, title, content, slug, status, keywords, publishedAt, wordpressPostId
- **Keyword**: id, siteId, term, volume, difficulty, position, trend
- **Backlink**: id, siteId, sourceUrl, targetUrl, anchorText, status, domain authority
- **Subscription**: id, userId, stripeSubId, plan, status, currentPeriodEnd
- **AnalyticsSnapshot**: id, siteId, date, organicTraffic, rankings, backlinksCount

### Pages Marketing - Contenu

#### Page d'Accueil
- Hero: titre accrocheur + sous-titre + CTA + illustration
- Section "Comment ca marche" (3 etapes)
- Section fonctionnalites (6 cards)
- Temoignages (3 citations)
- Comparaison SEO manuel vs autopilot
- Pricing apercu
- FAQ
- CTA final

#### Page Pricing (4 plans)
- **Free**: 1 site, 3 articles/mois, recherche mots-cles basique
- **Starter (29EUR/mois)**: 3 sites, 30 articles/mois, backlinks basiques
- **Business (79EUR/mois)**: 10 sites, 100 articles/mois, backlinks premium, API
- **Agency (199EUR/mois)**: Sites illimites, articles illimites, white-label, support prioritaire

### Workflow Utilisateur

1. **Inscription** -> email/Google
2. **Onboarding wizard** (4 etapes):
   - Ajouter URL du site
   - Choisir langue + marche cible
   - Definir niche + mots-cles seeds
   - Connecter WordPress (ou webhook)
3. **Dashboard** -> vue d'ensemble SEO
4. **IA analyse** le site + concurrents
5. **Generation automatique** d'articles planifies
6. **Publication** auto sur WordPress
7. **Suivi** rankings + trafic

### Services IA (OpenAI)

1. **Keyword Researcher**: Genere des mots-cles pertinents par niche
2. **Article Generator**: Cree des articles SEO-optimises (titre, meta, contenu, structure H2/H3)
3. **Site Analyzer**: Analyse URL et identifie opportunites SEO
4. **Backlink Suggester**: Propose des strategies de backlinks

### Docker Compose

Services:
- `app`: Next.js (port 3000)
- `postgres`: PostgreSQL 16 (port 5432)
- `redis`: Redis 7 (port 6379)
- `nginx`: Reverse proxy (ports 80/443)
- `worker`: BullMQ worker pour jobs async

---

## PHASE 2 - Ameliorations (Post-MVP)

- Blog integre avec CMS headless
- Schema JSON-LD automatique
- Sitemap XML dynamique
- Rapports PDF exportables
- Multi-langue interface (FR/EN)
- A/B testing titres
- Scoring SEO avance
- Integ. Google Search Console API
- Integ. Google Analytics API

---

## ETAPES DE CONSTRUCTION (Ordre)

### Etape 1: Setup projet + Docker
- Init Next.js + Tailwind + shadcn/ui
- Docker Compose (Postgres + Redis + Nginx)
- Prisma schema + migrations
- Config environnement

### Etape 2: Auth + Base
- NextAuth.js (email + Google)
- Pages login/register
- Middleware protection routes
- Layout dashboard

### Etape 3: Pages Marketing
- Page d'accueil complete avec copywriting
- Page features
- Page pricing
- Navbar + Footer

### Etape 4: Dashboard + Onboarding
- Onboarding wizard
- Dashboard principal
- Gestion des sites
- Vue articles/keywords

### Etape 5: Services IA
- Integration OpenAI
- Generateur d'articles
- Recherche de mots-cles
- Analyseur de site

### Etape 6: Automatisation
- BullMQ workers
- Publication WordPress
- Planification articles
- Jobs cron

### Etape 7: Paiements
- Integration Stripe
- Webhooks Stripe
- Gestion abonnements
- Plans + limites

### Etape 8: Deploiement
- Build Docker production
- Config Nginx + SSL
- Deploy sur VPS Hostinger
- CI/CD basique
