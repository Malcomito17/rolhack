# RolHack - Guia de Produccion

Este documento describe como operar RolHack en produccion en una Raspberry Pi.

## Arquitectura de Despliegue

```
Internet
    │
    ▼
Cloudflare (DNS + Tunnel)
    │
    ▼ (tunnel)
Raspberry Pi
    │
    ├─ cloudflared (tunnel client)
    │       │
    │       ▼
    ├─ nginx (reverse proxy, port 80/443)
    │       │
    │       ▼
    └─ Docker: rolhack (port 3002)
            │
            └─ SQLite: /app/data/rolhack.db (volumen persistente)
```

## Rutas y Ubicaciones en la Pi

| Recurso | Ruta |
|---------|------|
| Codigo fuente | `/mnt/ssd/projects/rolhack` |
| Base de datos | Volumen Docker `rolhack-data` |
| nginx config | `/home/malcomito/projects/EuforiaEvents/docker/nginx/conf.d/rolhack.conf` |
| Cloudflare tunnel | Servicio systemd `cloudflared` |

## Setup Inicial

### 1. Clonar repositorio

```bash
ssh malcomito@100.119.40.15
cd /mnt/ssd/projects
git clone https://github.com/Malcomito17/rolhack.git
cd rolhack
```

### 2. Configurar variables de entorno

```bash
cp .env.production.example .env.production
nano .env.production
```

Variables requeridas:

```env
# Autenticacion
AUTH_SECRET="<openssl rand -base64 32>"
AUTH_TRUST_HOST=true
AUTH_URL="https://rolhack.euforiateclog.cloud"
NEXT_PUBLIC_APP_URL="https://rolhack.euforiateclog.cloud"

# Google OAuth
GOOGLE_CLIENT_ID="<desde Google Cloud Console>"
GOOGLE_CLIENT_SECRET="<desde Google Cloud Console>"

# RBAC
SUPERADMIN_EMAILS="euforiateclog@gmail.com"

# Demo (opcional)
SEED_DEMO=true
```

### 3. Configurar Google OAuth

1. Ir a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crear credenciales OAuth 2.0
3. Agregar URI de redireccion autorizado:
   ```
   https://rolhack.euforiateclog.cloud/api/auth/callback/google
   ```
4. Copiar Client ID y Client Secret a `.env.production`

### 4. Primer deploy

```bash
./scripts/deploy-to-pi.sh --build --seed
```

## Comandos de Operacion

### Deploy

```bash
# Deploy normal (usa cache de Docker)
./scripts/deploy-to-pi.sh

# Deploy con rebuild completo
./scripts/deploy-to-pi.sh --build

# Deploy con seed de datos
./scripts/deploy-to-pi.sh --seed

# Deploy con logs
./scripts/deploy-to-pi.sh --logs
```

### Logs

```bash
# Ver logs en tiempo real
ssh malcomito@100.119.40.15 "docker logs rolhack -f"

# Ultimos 200 logs
ssh malcomito@100.119.40.15 "docker logs rolhack --tail 200"

# Logs con timestamps
ssh malcomito@100.119.40.15 "docker logs rolhack --timestamps"
```

### Estado del servicio

```bash
# Estado del container
ssh malcomito@100.119.40.15 "docker ps -f name=rolhack"

# Healthcheck
curl https://rolhack.euforiateclog.cloud/api/health

# Inspeccion detallada
ssh malcomito@100.119.40.15 "docker inspect rolhack"
```

### Reiniciar servicio

```bash
ssh malcomito@100.119.40.15 "cd /mnt/ssd/projects/rolhack && docker compose restart"
```

## Base de Datos

### Ubicacion

La base de datos SQLite esta en un volumen Docker persistente:

```bash
# Ver volumenes
ssh malcomito@100.119.40.15 "docker volume ls | grep rolhack"

# Ubicacion fisica
ssh malcomito@100.119.40.15 "docker volume inspect rolhack-data"
```

### Backup Manual

```bash
# 1. Conectar a la Pi
ssh malcomito@100.119.40.15

# 2. Crear directorio de backups
mkdir -p /mnt/ssd/backups/rolhack

# 3. Copiar archivo de DB
docker cp rolhack:/app/data/rolhack.db /mnt/ssd/backups/rolhack/rolhack-$(date +%Y%m%d-%H%M%S).db

# 4. Verificar
ls -la /mnt/ssd/backups/rolhack/
```

### Backup Automatico (Cron)

Crear script `/mnt/ssd/scripts/backup-rolhack.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/mnt/ssd/backups/rolhack"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR
docker cp rolhack:/app/data/rolhack.db $BACKUP_DIR/rolhack-$TIMESTAMP.db

# Mantener solo ultimos 7 dias
find $BACKUP_DIR -name "rolhack-*.db" -mtime +7 -delete

echo "Backup completed: rolhack-$TIMESTAMP.db"
```

Agregar a crontab:

```bash
crontab -e
# Agregar:
0 3 * * * /mnt/ssd/scripts/backup-rolhack.sh >> /mnt/ssd/logs/backup.log 2>&1
```

### Restaurar Backup

```bash
# 1. Detener container
ssh malcomito@100.119.40.15 "docker stop rolhack"

# 2. Copiar backup al volumen
ssh malcomito@100.119.40.15 "docker cp /mnt/ssd/backups/rolhack/rolhack-YYYYMMDD-HHMMSS.db rolhack:/app/data/rolhack.db"

# 3. Iniciar container
ssh malcomito@100.119.40.15 "docker start rolhack"
```

### Migraciones

Las migraciones se ejecutan automaticamente al iniciar el container.

Para verificar estado de migraciones:

```bash
ssh malcomito@100.119.40.15 "docker exec rolhack npx prisma migrate status --schema=packages/database/prisma/schema.prisma"
```

## Cloudflare Tunnel

### Configuracion actual

- Tunnel ID: `e10668a1-d7f8-4496-bfd3-8545ebf06cc0`
- Hostname: `rolhack.euforiateclog.cloud`
- Servicio: `http://localhost:3002`

### Verificar estado

```bash
ssh malcomito@100.119.40.15 "sudo systemctl status cloudflared"
```

### Config file

```bash
# Ver configuracion
ssh malcomito@100.119.40.15 "cat ~/.cloudflared/config.yml"
```

## nginx

### Configuracion

Archivo: `/home/malcomito/projects/EuforiaEvents/docker/nginx/conf.d/rolhack.conf`

```nginx
server {
    listen 80;
    server_name rolhack.euforiateclog.cloud;

    location / {
        proxy_pass http://host.docker.internal:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Reiniciar nginx

```bash
ssh malcomito@100.119.40.15 "cd ~/projects/EuforiaEvents && docker compose restart nginx"
```

## Rollback

### Por commit/tag

```bash
# 1. Ver historial de commits
cd /Users/malcomito/Projects/Rolhack
git log --oneline -10

# 2. Hacer checkout al commit deseado
git checkout <commit-hash>

# 3. Redesplegar
./scripts/deploy-to-pi.sh --build
```

### Por backup de DB

Ver seccion "Restaurar Backup" arriba.

## Troubleshooting

### Container no inicia

```bash
# Ver logs de inicio
ssh malcomito@100.119.40.15 "docker logs rolhack"

# Verificar variables de entorno
ssh malcomito@100.119.40.15 "docker exec rolhack env | grep -E 'AUTH|DATABASE|GOOGLE'"
```

### Error 502 Bad Gateway

1. Verificar que el container esta corriendo
2. Verificar nginx config
3. Verificar que el puerto 3002 esta expuesto

### Error de migracion

```bash
# Ver estado de migraciones
ssh malcomito@100.119.40.15 "docker exec rolhack npx prisma migrate status --schema=packages/database/prisma/schema.prisma"

# Forzar migracion
ssh malcomito@100.119.40.15 "docker exec rolhack npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma"
```

### Healthcheck fallando

```bash
# Verificar endpoint directamente
ssh malcomito@100.119.40.15 "curl -v http://localhost:3002/api/health"
```
