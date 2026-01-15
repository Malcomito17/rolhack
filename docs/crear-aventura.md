# Como Crear una Aventura en RolHack

Guia rapida para crear y editar aventuras usando el Editor Visual.

## Acceso al Editor

1. Navega a `/projects/[projectId]`
2. Click en el boton **Editor** (visible para OWNER y SUPERADMIN)
3. Se abre el editor con tres vistas: Visual, Tabla, JSON

## Conceptos Basicos

### Estructura de una Aventura

```
Proyecto
  └── Circuitos (sub-redes)
        ├── Nodos (sistemas a hackear)
        └── Enlaces (conexiones entre nodos)
```

### Nodos

Cada nodo representa un sistema que el jugador puede hackear:

| Campo | Descripcion |
|-------|-------------|
| **id** | Identificador unico (ej: `node-server`) |
| **name** | Nombre visible (ej: "Servidor Principal") |
| **level** | Profundidad en la red (0 = entrada) |
| **cd** | Challenge Difficulty - valor para hackear |
| **failMode** | `WARNING` o `BLOQUEO` al fallar |
| **visibleByDefault** | Si el nodo es visible al inicio |

### Enlaces

Conexiones entre nodos:

| Campo | Descripcion |
|-------|-------------|
| **id** | Identificador unico (ej: `link-1`) |
| **from** | ID del nodo origen |
| **to** | ID del nodo destino |
| **style** | `solid`, `dashed`, o `dotted` |
| **hidden** | Si requiere ser descubierto |
| **bidirectional** | Si permite ir en ambas direcciones |

## Flujo de Creacion

### 1. Crear Circuito

En la vista **Visual**:
1. Click en **+ Agregar** en la seccion Circuitos
2. Ingresa ID y nombre
3. Click **Crear**

### 2. Agregar Nodos

1. Selecciona el circuito
2. Click en **+ Nodo**
3. Completa los campos:
   - Usa `level: 0` para el punto de entrada
   - `cd: 0` para nodos que no se hackean directamente
   - `visibleByDefault: false` para nodos ocultos
4. Click **Crear**

### 3. Crear Enlaces

1. Click en **+ Enlace**
2. Selecciona nodos origen y destino
3. Marca **Oculto** si debe descubrirse con "Buscar Accesos"
4. Click **Crear**

### 4. Validar

El editor valida automaticamente:
- Al menos 1 circuito
- Al menos 1 nodo con level=0 por circuito
- Enlaces conectados a nodos existentes
- IDs unicos

Los errores aparecen en la barra superior.

### 5. Guardar

1. Verifica que no hay errores (indicador verde)
2. Click en **Guardar**
3. Se crea una nueva version

## Vistas del Editor

### Visual

- Cards de nodos agrupados por level
- Vista rapida de enlaces
- Ideal para entender la estructura

### Tabla

- Edicion inline de propiedades
- Ideal para cambios masivos
- Dos tabs: Nodos y Enlaces

### JSON

- Edicion directa del JSON
- Validacion en tiempo real
- Ideal para copiar/pegar estructuras

## Versionado

- Cada guardado crea una nueva version
- Solo una version puede estar activa
- Las runs usan la version activa al momento de creacion
- Puedes activar versiones anteriores desde el panel lateral

## Ejemplo Minimo

```json
{
  "meta": {
    "version": "1.0.0",
    "author": "Tu Nombre"
  },
  "circuits": [
    {
      "id": "circuit-main",
      "name": "Red Principal",
      "nodes": [
        {
          "id": "node-entry",
          "name": "Terminal",
          "level": 0,
          "cd": 0,
          "failMode": "WARNING",
          "visibleByDefault": true
        },
        {
          "id": "node-target",
          "name": "Servidor",
          "level": 1,
          "cd": 5,
          "failMode": "BLOQUEO",
          "visibleByDefault": true
        }
      ],
      "links": [
        {
          "id": "link-1",
          "from": "node-entry",
          "to": "node-target",
          "style": "solid",
          "hidden": false,
          "bidirectional": true
        }
      ]
    }
  ]
}
```

## Tips

1. **Nodos de entrada**: Usa `cd: 0` y `level: 0`
2. **Nodos ocultos**: `visibleByDefault: false` + enlace `hidden: true`
3. **Dificultad progresiva**: Aumenta CD con el level
4. **Caminos alternativos**: Crea enlaces ocultos a nodos con CD menor
5. **BLOQUEO**: Usa con moderacion, bloquea permanentemente el nodo

## Restricciones

- No puedes crear versiones si hay runs activas
- Las runs en progreso no se ven afectadas por cambios
- Solo OWNER y SUPERADMIN pueden editar
