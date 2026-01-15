# RolHack - Checklist Go Live

Checklist para verificar que RolHack esta listo para produccion.

## Pre-requisitos

- [ ] Raspberry Pi accesible via SSH
- [ ] Docker instalado en la Pi
- [ ] Cloudflare Tunnel configurado
- [ ] nginx configurado como reverse proxy
- [ ] Dominio `rolhack.euforiateclog.cloud` apuntando al tunnel

## Google OAuth

- [ ] Proyecto creado en Google Cloud Console
- [ ] OAuth consent screen configurado
- [ ] Credenciales OAuth 2.0 creadas
- [ ] URI de redireccion configurado:
  ```
  https://rolhack.euforiateclog.cloud/api/auth/callback/google
  ```
- [ ] Client ID copiado a `.env.production`
- [ ] Client Secret copiado a `.env.production`

## Variables de Entorno

Verificar en `.env.production`:

- [ ] `AUTH_SECRET` - Generado con `openssl rand -base64 32`
- [ ] `AUTH_TRUST_HOST=true`
- [ ] `AUTH_URL=https://rolhack.euforiateclog.cloud`
- [ ] `NEXT_PUBLIC_APP_URL=https://rolhack.euforiateclog.cloud`
- [ ] `GOOGLE_CLIENT_ID` - Configurado
- [ ] `GOOGLE_CLIENT_SECRET` - Configurado
- [ ] `SUPERADMIN_EMAILS=euforiateclog@gmail.com`

## Deploy

- [ ] Ejecutar deploy:
  ```bash
  ./scripts/deploy-to-pi.sh --build --seed
  ```

## Verificaciones Post-Deploy

### Healthcheck

```bash
curl https://rolhack.euforiateclog.cloud/api/health
# Debe responder: {"status":"ok"}
```
- [ ] Healthcheck responde OK

### Container

```bash
ssh malcomito@100.119.40.15 "docker ps -f name=rolhack"
```
- [ ] Container `rolhack` esta `running`
- [ ] Container esta `healthy`

### Logs

```bash
ssh malcomito@100.119.40.15 "docker logs rolhack --tail 20"
```
- [ ] No hay errores en los logs
- [ ] Migraciones ejecutadas correctamente

### Autenticacion

1. Abrir https://rolhack.euforiateclog.cloud
2. Click "Sign in with Google"
3. Autenticar con `euforiateclog@gmail.com`

- [ ] Login funciona correctamente
- [ ] Usuario tiene rol SUPERADMIN
- [ ] Link "Admin" visible en home

### Funcionalidad Basica

- [ ] Pagina de proyectos carga
- [ ] Proyecto Demo visible (si `SEED_DEMO=true`)
- [ ] Se puede crear una run
- [ ] Pantalla de juego funciona:
  - [ ] Mapa de nodos visible
  - [ ] Se puede hackear un nodo
  - [ ] Icono "A" funciona para buscar accesos
  - [ ] Se puede mover entre nodos

### Admin

- [ ] Panel admin accesible en `/admin`
- [ ] Lista de proyectos visible
- [ ] Gestion de miembros funciona

## Backups

- [ ] Script de backup configurado
- [ ] Cron job activo para backups automaticos
- [ ] Primer backup manual realizado

## Documentacion

- [ ] `docs/production.md` actualizado
- [ ] Credenciales guardadas de forma segura
- [ ] Accesos SSH documentados

## Monitoreo (Opcional)

- [ ] Alertas de Cloudflare configuradas
- [ ] Logs siendo monitoreados
- [ ] Healthcheck externo configurado

---

## Comandos Utiles

```bash
# Estado del servicio
ssh malcomito@100.119.40.15 "docker ps -f name=rolhack"

# Logs en tiempo real
ssh malcomito@100.119.40.15 "docker logs rolhack -f"

# Reiniciar servicio
ssh malcomito@100.119.40.15 "cd /mnt/ssd/projects/rolhack && docker compose restart"

# Backup manual
ssh malcomito@100.119.40.15 "docker cp rolhack:/app/data/rolhack.db /mnt/ssd/backups/rolhack/rolhack-manual.db"

# Ver migraciones
ssh malcomito@100.119.40.15 "docker exec rolhack npx prisma migrate status --schema=packages/database/prisma/schema.prisma"
```

---

**Fecha de Go Live:** _______________

**Responsable:** _______________

**Notas:**

---
