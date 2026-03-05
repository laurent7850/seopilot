#!/bin/bash
set -e

# ========================================
# SEOPilot - Script de deploiement VPS
# ========================================
#
# Usage: ./deploy.sh [commande]
#   setup     - Premiere installation sur le VPS
#   deploy    - Deploiement / mise a jour
#   ssl       - Obtenir un certificat SSL Let's Encrypt
#   logs      - Voir les logs
#   status    - Statut des services
#   backup-db - Sauvegarder la base de donnees
#
# Pre-requis sur le VPS:
#   - Docker + Docker Compose
#   - Git
# ========================================

APP_NAME="seopilot"
COMPOSE_FILE="docker-compose.yml"
ENV_MODE="PRODUCTION"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[SEOPilot]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check .env exists
check_env() {
    if [ ! -f .env ]; then
        error "Fichier .env manquant. Copiez .env.example vers .env et configurez vos variables."
    fi
    # Source .env
    set -a
    source .env
    set +a

    # Check required vars
    [ -z "$DATABASE_URL" ] && error "DATABASE_URL non defini dans .env"
    [ -z "$NEXTAUTH_SECRET" ] && error "NEXTAUTH_SECRET non defini dans .env"
    [ -z "$NEXTAUTH_URL" ] && error "NEXTAUTH_URL non defini dans .env"
    [ -z "$OPENAI_API_KEY" ] && error "OPENAI_API_KEY non defini dans .env"
    [ -z "$DB_PASSWORD" ] && error "DB_PASSWORD non defini dans .env"

    if [ "$NEXTAUTH_SECRET" = "your-secret-key-here-change-in-production" ]; then
        error "Changez NEXTAUTH_SECRET dans .env (ne gardez pas la valeur par defaut)"
    fi
    if [ "$DB_PASSWORD" = "change-me-strong-password" ]; then
        error "Changez DB_PASSWORD dans .env"
    fi

    # Guard: prevent running production deploy with dev config
    if [ "${NODE_ENV:-}" = "development" ]; then
        error "NODE_ENV=development detecte. Ce script est reserve a la PRODUCTION."
    fi

    log "Environnement: $ENV_MODE"
    log "Variables d'environnement OK"
}

# First time setup
setup() {
    log "=== Installation initiale ==="
    check_env

    # Generate NEXTAUTH_SECRET if placeholder
    if grep -q "your-secret-key-here" .env 2>/dev/null; then
        SECRET=$(openssl rand -base64 32)
        sed -i "s|your-secret-key-here-change-in-production|$SECRET|g" .env
        log "NEXTAUTH_SECRET genere automatiquement"
    fi

    # Create nginx ssl directory
    mkdir -p nginx/ssl

    # Use initial nginx config (HTTP only, before SSL)
    cp nginx/default-initial.conf nginx/default.conf
    log "Configuration nginx initiale (HTTP) appliquee"

    # Build and start
    log "Construction des images Docker..."
    docker compose -f $COMPOSE_FILE build --no-cache

    log "Demarrage des services..."
    docker compose -f $COMPOSE_FILE up -d

    # Wait for postgres
    log "Attente de PostgreSQL..."
    sleep 10

    # Run migrations
    log "Application des migrations Prisma..."
    docker compose -f $COMPOSE_FILE exec app npx prisma db push

    log "=== Installation terminee ==="
    log "Application accessible sur http://$(hostname -I | awk '{print $1}'):80"
    log ""
    log "Prochaine etape: ./deploy.sh ssl pour obtenir un certificat SSL"
}

# Deploy / update
deploy() {
    log "=== Deploiement ==="
    check_env

    log "Pull des derniers changements..."
    git pull origin main 2>/dev/null || warn "Git pull ignore (pas de remote ou pas de changements)"

    log "Construction des images..."
    docker compose -f $COMPOSE_FILE build

    log "Arret des anciens containers..."
    docker compose -f $COMPOSE_FILE down

    log "Demarrage des nouveaux containers..."
    docker compose -f $COMPOSE_FILE up -d

    # Wait for DB
    sleep 8

    log "Application des migrations..."
    docker compose -f $COMPOSE_FILE exec app npx prisma db push

    # Health check
    sleep 5
    log "Verification de sante..."
    HEALTH=$(curl -s http://localhost:3000/api/health 2>/dev/null || echo '{"status":"error"}')
    STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ "$STATUS" = "healthy" ]; then
        log "Application saine et operationnelle"
    else
        warn "L'application repond mais n'est pas entierement saine: $HEALTH"
        warn "Verifiez les logs: ./deploy.sh logs"
    fi

    log "=== Deploiement termine ==="
}

# SSL setup
ssl() {
    check_env
    source .env

    if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "your-domain.com" ]; then
        error "Configurez DOMAIN dans .env avant d'obtenir un certificat SSL"
    fi
    if [ -z "$EMAIL" ] || [ "$EMAIL" = "your-email@example.com" ]; then
        error "Configurez EMAIL dans .env pour les notifications Let's Encrypt"
    fi

    log "=== Configuration SSL pour $DOMAIN ==="

    # Ensure services are running with initial config
    docker compose -f $COMPOSE_FILE up -d

    sleep 5

    # Get certificate
    log "Obtention du certificat SSL..."
    docker compose -f $COMPOSE_FILE run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN"

    # Copy certificates to nginx ssl directory
    cp nginx/ssl/live/$DOMAIN/fullchain.pem nginx/ssl/fullchain.pem
    cp nginx/ssl/live/$DOMAIN/privkey.pem nginx/ssl/privkey.pem

    # Switch to full nginx config with SSL
    log "Activation de la configuration HTTPS..."
    # Restore the full SSL config
    cat > nginx/default.conf << 'NGINX_CONF'
upstream nextjs {
    server app:3000;
}

server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name _;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    location /_next/static/ {
        proxy_pass http://nextjs;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    client_max_body_size 10M;
}
NGINX_CONF

    # Restart nginx
    docker compose -f $COMPOSE_FILE restart nginx

    log "=== SSL configure ==="
    log "Application accessible sur https://$DOMAIN"
}

# Logs
logs() {
    SERVICE=${1:-""}
    if [ -n "$SERVICE" ]; then
        docker compose -f $COMPOSE_FILE logs -f "$SERVICE"
    else
        docker compose -f $COMPOSE_FILE logs -f --tail=100
    fi
}

# Status
status() {
    log "=== Statut des services ==="
    docker compose -f $COMPOSE_FILE ps

    echo ""
    log "=== Health check ==="
    HEALTH=$(curl -s http://localhost:3000/api/health 2>/dev/null)
    if [ -n "$HEALTH" ]; then
        echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
    else
        warn "L'application ne repond pas sur le port 3000"
    fi
}

# Database backup
backup_db() {
    check_env
    source .env

    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/seopilot_${TIMESTAMP}.sql.gz"

    log "Sauvegarde de la base de donnees..."
    docker compose -f $COMPOSE_FILE exec -T postgres pg_dump -U seopilot seopilot | gzip > "$BACKUP_FILE"

    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Sauvegarde terminee: $BACKUP_FILE ($SIZE)"

    # Keep only last 10 backups
    cd "$BACKUP_DIR" && ls -t seopilot_*.sql.gz | tail -n +11 | xargs -r rm
    log "Anciennes sauvegardes nettoyees (10 max conservees)"
}

# Main
case "${1:-deploy}" in
    setup)    setup ;;
    deploy)   deploy ;;
    ssl)      ssl ;;
    logs)     logs "$2" ;;
    status)   status ;;
    backup-db) backup_db ;;
    *)
        echo "Usage: $0 {setup|deploy|ssl|logs|status|backup-db}"
        echo ""
        echo "  setup     - Premiere installation"
        echo "  deploy    - Deploiement / mise a jour"
        echo "  ssl       - Obtenir un certificat SSL"
        echo "  logs      - Voir les logs (optionnel: nom du service)"
        echo "  status    - Statut des services"
        echo "  backup-db - Sauvegarder la base PostgreSQL"
        exit 1
        ;;
esac
