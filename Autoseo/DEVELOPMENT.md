# SEOPilot - Guide de Developpement

## Pre-requis

- **Node.js** 20+
- **Docker** + Docker Compose
- **npm**

## Demarrage rapide

### 1. Configurer l'environnement

Le fichier `.env.development` contient les variables pre-configurees pour le dev local. Ajoutez-y vos cles API :

```bash
# Editez .env.development et ajoutez au moins une cle AI :
OPENROUTER_API_KEY="sk-or-votre-cle"
# ou
OPENAI_API_KEY="sk-votre-cle"
```

### 2. Installer les dependances

```bash
npm install
```

### 3. Demarrer l'environnement dev

```bash
# Option A : Tout en un (DB + Redis + Next.js)
./dev.sh start

# Option B : Services uniquement (vous lancez Next.js separement)
./dev.sh services
npm run dev
```

L'application est accessible sur **http://localhost:3000**.

## Commandes dev.sh

| Commande | Description |
|----------|-------------|
| `./dev.sh start` | Demarre DB + Redis + Next.js dev |
| `./dev.sh services` | Demarre uniquement DB + Redis |
| `./dev.sh stop` | Arrete les services dev |
| `./dev.sh db` | Ouvre Prisma Studio |
| `./dev.sh reset-db` | Reinitialise la DB dev (destructif) |
| `./dev.sh status` | Statut des containers |
| `./dev.sh logs` | Logs des containers dev |

## Scripts npm

| Script | Description |
|--------|-------------|
| `npm run dev` | Lance Next.js en mode dev |
| `npm run dev:services` | Demarre les containers dev |
| `npm run dev:services:stop` | Arrete les containers dev |
| `npm run dev:db:push` | Sync le schema Prisma (env dev) |
| `npm run dev:db:studio` | Ouvre Prisma Studio (env dev) |
| `npm run build` | Build de production |
| `npm test` | Lance les tests |

## Architecture des environnements

### Developpement (local)

| Service | Port | Container |
|---------|------|-----------|
| Next.js | 3000 | - (direct) |
| PostgreSQL | 5433 | seopilot-dev-postgres |
| Redis | 6380 | seopilot-dev-redis |

- Fichier compose : `docker-compose.dev.yml`
- Variables : `.env.development`
- DB : `seopilot_dev` (volumes `seopilot_dev_*`)
- Hot-reload actif

### Production (VPS)

| Service | Port | Container |
|---------|------|-----------|
| Next.js | 3000 (interne) | seopilot-web |
| Worker | - | seopilot-worker |
| PostgreSQL | 5432 (interne) | seopilot-postgres |
| Redis | 6379 (interne) | seopilot-redis |

- Fichier compose : `docker-compose.yml`
- Variables : `.env` (copie de `.env.production.example`)
- Deploiement : `./deploy.sh deploy`
- Les ports ne sont pas exposes (Traefik gere le routing)

## Deploiement en production

```bash
# Sur le VPS
./deploy.sh setup    # Premiere installation
./deploy.sh deploy   # Mise a jour
./deploy.sh ssl      # Certificat SSL
./deploy.sh status   # Verification
./deploy.sh backup-db # Sauvegarde DB
```

## Fichiers d'environnement

| Fichier | Usage | Git |
|---------|-------|-----|
| `.env.development` | Dev local (pre-configure) | ignore |
| `.env.production.example` | Template production | commite |
| `.env.example` | Template generique | commite |
| `.env` | Utilise en production | ignore |
