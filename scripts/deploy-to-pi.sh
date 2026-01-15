#!/bin/bash
# =============================================================================
# DEPLOY SCRIPT - RolHack to Raspberry Pi (Docker)
# =============================================================================
# USO:
#   ./scripts/deploy-to-pi.sh              # Deploy normal
#   ./scripts/deploy-to-pi.sh --build      # Force rebuild de imagen Docker
#   ./scripts/deploy-to-pi.sh --seed       # Deploy + ejecutar seed
#   ./scripts/deploy-to-pi.sh --logs       # Ver logs después del deploy
#
# IMPORTANTE: RolHack corre en Docker, no PM2.
# =============================================================================

set -e  # Exit on error

# Configuración
PI_HOST="${PI_HOST:-malcomito@100.119.40.15}"
PI_PATH="/mnt/ssd/projects/rolhack"
LOCAL_PATH="/Users/malcomito/Projects/Rolhack"
CONTAINER_NAME="rolhack"
PROD_URL="https://rolhack.euforiateclog.cloud"

# Opciones
FORCE_BUILD=false
DO_SEED=false
SHOW_LOGS=false

# Parsear argumentos
for arg in "$@"; do
  case $arg in
    --build)
      FORCE_BUILD=true
      ;;
    --seed)
      DO_SEED=true
      ;;
    --logs)
      SHOW_LOGS=true
      ;;
    --help|-h)
      echo "USO: ./scripts/deploy-to-pi.sh [opciones]"
      echo ""
      echo "Opciones:"
      echo "  --build     Force rebuild de imagen Docker"
      echo "  --seed      Ejecutar seed después del deploy"
      echo "  --logs      Ver logs después del deploy"
      echo "  --help      Mostrar esta ayuda"
      exit 0
      ;;
  esac
done

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "=============================================="
echo "  DEPLOY: RolHack → Raspberry Pi (Docker)"
echo "=============================================="
echo ""
echo -e "Host:      ${GREEN}$PI_HOST${NC}"
echo -e "Path:      ${GREEN}$PI_PATH${NC}"
echo -e "Container: ${GREEN}$CONTAINER_NAME${NC}"
echo -e "URL:       ${GREEN}$PROD_URL${NC}"
if [ "$FORCE_BUILD" = true ]; then
  echo -e "Build:     ${YELLOW}FORCE REBUILD${NC}"
fi
if [ "$DO_SEED" = true ]; then
  echo -e "Seed:      ${YELLOW}SI${NC}"
fi
echo ""

# Verificar que existe .env.production localmente
if [ ! -f "$LOCAL_PATH/.env.production" ]; then
  echo -e "${RED}ERROR: No existe .env.production${NC}"
  echo "Crea el archivo basándote en .env.production.example"
  exit 1
fi

# Paso 1: Crear directorio remoto si no existe
echo -e "${YELLOW}[1/5]${NC} Preparando directorio remoto..."
ssh $PI_HOST "mkdir -p $PI_PATH"

# Paso 2: Sincronizar archivos (excluyendo node_modules, .next, .git, .env.local)
echo -e "${YELLOW}[2/5]${NC} Sincronizando archivos..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.turbo' \
  --exclude '.git' \
  --exclude '*.db' \
  --exclude '*.db-journal' \
  --exclude '.env.local' \
  --exclude 'apps/web/.env.local' \
  --exclude 'packages/database/.env' \
  $LOCAL_PATH/ \
  $PI_HOST:$PI_PATH/

# Paso 3: Build Docker image en Pi
echo -e "${YELLOW}[3/5]${NC} Building Docker image en Pi..."
if [ "$FORCE_BUILD" = true ]; then
  ssh $PI_HOST "cd $PI_PATH && docker compose build --no-cache"
else
  ssh $PI_HOST "cd $PI_PATH && docker compose build"
fi

# Paso 4: Deploy con Docker Compose
echo -e "${YELLOW}[4/5]${NC} Iniciando container..."
ssh $PI_HOST "cd $PI_PATH && docker compose down 2>/dev/null || true && docker compose up -d"

# Paso 5: Ejecutar seed si se solicita
echo -e "${YELLOW}[5/5]${NC} Verificando base de datos..."
# Migraciones se ejecutan automaticamente en el entrypoint del container
if [ "$DO_SEED" = true ]; then
  echo -e "${BLUE}  Ejecutando seed...${NC}"
  ssh $PI_HOST "docker exec $CONTAINER_NAME sh -c 'cd /app && npx tsx packages/database/prisma/seed.ts'"
fi

# Esperar a que el container esté healthy
echo ""
echo -e "${BLUE}Esperando a que el servicio esté listo...${NC}"
sleep 5

# Verificar estado
CONTAINER_STATUS=$(ssh $PI_HOST "docker inspect -f '{{.State.Status}}' $CONTAINER_NAME 2>/dev/null || echo 'not_found'")

if [ "$CONTAINER_STATUS" = "running" ]; then
  echo ""
  echo -e "${GREEN}=============================================="
  echo "  ✅ DEPLOY EXITOSO"
  echo "=============================================="
  echo -e "  Container: $CONTAINER_NAME ($CONTAINER_STATUS)"
  echo -e "  URL: $PROD_URL${NC}"
  echo ""

  # Mostrar logs si se solicitó
  if [ "$SHOW_LOGS" = true ]; then
    echo -e "${BLUE}Últimos logs:${NC}"
    ssh $PI_HOST "docker logs $CONTAINER_NAME --tail 30"
  fi
else
  echo ""
  echo -e "${RED}=============================================="
  echo "  ⚠️  VERIFICAR - Container status: $CONTAINER_STATUS"
  echo "=============================================="
  echo -e "  Ver logs: ssh $PI_HOST 'docker logs $CONTAINER_NAME'${NC}"
  echo ""

  # Mostrar logs de error
  ssh $PI_HOST "docker logs $CONTAINER_NAME --tail 50" 2>&1 || true
  exit 1
fi
