#!/bin/bash
set -e

# ========================================
# SEOPilot - Script de developpement local
# ========================================
#
# Usage: ./dev.sh [commande]
#   start    - Demarre DB + Redis + Next.js dev
#   stop     - Arrete les services dev
#   services - Demarre uniquement DB + Redis (sans Next.js)
#   db       - Lance Prisma Studio
#   reset-db - Reset la DB de dev
#   status   - Statut des services dev
#   logs     - Logs des containers dev
#
# Pre-requis: Docker, Node 20+, npm
# ========================================

COMPOSE_FILE="docker-compose.dev.yml"
ENV_FILE=".env.development"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEV]${NC} $1"; }
warn() { echo -e "${YELLOW}[DEV]${NC} $1"; }
error() { echo -e "${RED}[DEV]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[DEV]${NC} $1"; }

# Load dev environment
load_env() {
    if [ ! -f "$ENV_FILE" ]; then
        error "Fichier $ENV_FILE manquant. Verifiez qu'il existe dans le projet."
    fi
    set -a
    source "$ENV_FILE"
    set +a
}

# Wait for postgres to be ready
wait_for_postgres() {
    log "Attente de PostgreSQL..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker exec seopilot-dev-postgres pg_isready -U seopilot > /dev/null 2>&1; then
            log "PostgreSQL pret"
            return 0
        fi
        retries=$((retries - 1))
        sleep 1
    done
    error "PostgreSQL n'a pas demarre a temps"
}

# Start services + app
start() {
    info "========================================="
    info "  SEOPilot - Environnement DEVELOPPEMENT"
    info "========================================="
    echo ""

    load_env

    log "Demarrage des services Docker (PostgreSQL + Redis)..."
    docker compose -f $COMPOSE_FILE up -d

    wait_for_postgres

    log "Synchronisation du schema Prisma..."
    npx prisma db push --skip-generate 2>/dev/null || npx prisma db push

    echo ""
    info "Services:"
    info "  PostgreSQL : localhost:5433"
    info "  Redis      : localhost:6380"
    info "  App        : http://localhost:3000"
    echo ""

    log "Demarrage de Next.js en mode dev..."
    npx next dev
}

# Start only infrastructure services
services() {
    load_env

    log "Demarrage des services Docker..."
    docker compose -f $COMPOSE_FILE up -d

    wait_for_postgres

    log "Synchronisation du schema Prisma..."
    npx prisma db push --skip-generate 2>/dev/null || npx prisma db push

    echo ""
    info "Services demarres:"
    info "  PostgreSQL : localhost:5433"
    info "  Redis      : localhost:6380"
    echo ""
    log "Lancez 'npm run dev' pour demarrer l'application."
}

# Stop services
stop() {
    log "Arret des services dev..."
    docker compose -f $COMPOSE_FILE down
    log "Services arretes"
}

# Prisma Studio
db_studio() {
    load_env
    log "Ouverture de Prisma Studio..."
    npx prisma studio
}

# Reset database
reset_db() {
    load_env

    warn "Cette action va SUPPRIMER toutes les donnees de la DB de dev."
    read -p "Continuer ? (y/N) " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log "Annule."
        exit 0
    fi

    log "Reset de la base de donnees dev..."
    docker exec seopilot-dev-postgres psql -U seopilot -c "DROP DATABASE IF EXISTS seopilot_dev;" 2>/dev/null || true
    docker exec seopilot-dev-postgres psql -U seopilot -c "CREATE DATABASE seopilot_dev;" 2>/dev/null || true

    log "Re-application du schema..."
    npx prisma db push

    log "Base de donnees dev reinitialisee"
}

# Status
status() {
    info "=== Statut des services dev ==="
    docker compose -f $COMPOSE_FILE ps
}

# Logs
logs() {
    local service="${1:-}"
    if [ -n "$service" ]; then
        docker compose -f $COMPOSE_FILE logs -f "$service"
    else
        docker compose -f $COMPOSE_FILE logs -f --tail=50
    fi
}

# Main
case "${1:-start}" in
    start)    start ;;
    services) services ;;
    stop)     stop ;;
    db)       db_studio ;;
    reset-db) reset_db ;;
    status)   status ;;
    logs)     logs "$2" ;;
    *)
        echo "Usage: $0 {start|services|stop|db|reset-db|status|logs}"
        echo ""
        echo "  start    - Demarre DB + Redis + Next.js dev"
        echo "  services - Demarre uniquement DB + Redis"
        echo "  stop     - Arrete les services dev"
        echo "  db       - Ouvre Prisma Studio"
        echo "  reset-db - Reset la DB de dev (DESTRUCTIF)"
        echo "  status   - Statut des containers"
        echo "  logs     - Logs (optionnel: nom du service)"
        exit 1
        ;;
esac
