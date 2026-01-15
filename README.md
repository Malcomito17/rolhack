# RolHack

Framework de simulacion de hacking en entornos ciberpunk.

## Como Jugar una Run

### 1. Iniciar sesion

1. Ve a la pagina principal
2. Haz clic en "Sign in with Google"
3. Autoriza el acceso con tu cuenta de Google

### 2. Seleccionar un proyecto

1. Despues de iniciar sesion, haz clic en "Mis Proyectos"
2. Veras la lista de proyectos a los que tienes acceso
3. Haz clic en "Abrir" en el proyecto que quieras jugar

### 3. Crear o continuar una run

- **Continuar ultima run**: Si ya tienes una run activa, aparecera el boton "Continuar ultima run"
- **Nueva run**: Haz clic en "Nueva run" para crear una partida nueva

### 4. Pantalla de juego

La pantalla de juego tiene tres areas principales:

#### Header (superior)
- Nombre del proyecto y circuito actual
- Ultimas alertas/warnings generadas

#### Mapa del circuito (izquierda)
- Nodos organizados por nivel
- Estados visuales:
  - **Verde brillante**: Nodo actual (donde estas)
  - **Verde claro**: Nodos hackeados
  - **Gris**: Nodos descubiertos pero no hackeados
  - **???**: Nodos no descubiertos
  - **Rojo**: Nodos bloqueados
- Haz clic en un nodo para seleccionarlo

#### Panel de acciones (derecha)

**Hackear Nodo**
- Ingresa un valor numerico
- Haz clic en "Ejecutar"
- Si el valor es >= CD del nodo, hackeo exitoso
- Si falla:
  - Modo WARNING: Puedes reintentar
  - Modo BLOQUEO: Nodo bloqueado permanentemente

**Buscar Accesos (icono A)**
- El icono "A" se ilumina cuando hay enlaces ocultos desde tu posicion
- Haz clic en "Buscar" para descubrir nuevos caminos
- Los nodos conectados por enlaces ocultos se revelaran

**Moverse**
- Selecciona un nodo conectado en el mapa
- Aparecera el boton "Ir a [nombre]"
- Solo puedes moverte por enlaces descubiertos

## Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# Build de produccion
npm run build

# Base de datos
npm run db:push     # Sincronizar schema
npm run db:studio   # Abrir Prisma Studio
npm run db:seed     # Seed de usuarios SUPERADMIN
```

## Stack Tecnico

- Next.js 14 (App Router)
- TypeScript
- Prisma + SQLite
- NextAuth v5 (Google OAuth)
- Tailwind CSS
- Turborepo

## Estructura

```
apps/
  web/                 # Aplicacion Next.js
    src/
      app/             # Paginas (App Router)
      components/      # Componentes reutilizables
      lib/
        auth.ts        # Configuracion NextAuth
        rbac.ts        # Permisos y roles
        engine/        # Motor de juego
packages/
  database/            # Prisma schema y cliente
```

## Variables de entorno

```env
DATABASE_URL="file:../../packages/database/dev.db"
AUTH_SECRET="<openssl rand -base64 32>"
AUTH_URL="http://localhost:3002"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
SUPERADMIN_EMAILS="tu@email.com"
```

## Licencia

Privado - Todos los derechos reservados
