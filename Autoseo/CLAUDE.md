# AutoSEO

## Description
Outil d'analyse et d'automatisation SEO complet : crawling, recherche de mots-clés, audit technique, génération d'articles, rapports PDF.

## Stack
- **Framework** : Next.js 14 (App Router)
- **ORM** : Prisma + PostgreSQL
- **Queue** : BullMQ + Redis
- **Scraping** : Puppeteer
- **LLM** : OpenAI API
- **UI** : Tailwind CSS, Radix UI, Recharts
- **Déploiement** : Docker Compose

## Commandes
```bash
npm run dev          # Dev server
npm run build        # Build production
npm run start        # Start production
npm run db:push      # Push schema Prisma
npm run db:seed      # Seed la base
npm run workers      # Démarrer les workers BullMQ
```

## Structure clé
- `src/services/` — Logique métier (crawler, keyword-researcher, article-generator, etc.)
- `src/workers/` — Workers BullMQ (article, crawl, publish, email)
- `src/app/api/` — API routes Next.js
- `src/app/dashboard/` — Interface utilisateur
- `prisma/` — Schema et migrations

## Conventions
- Workers dans `src/workers/`, services dans `src/services/`
- API routes dans `src/app/api/`
- Rapports nommés `RAPPORT-{site}-{date}.md`
