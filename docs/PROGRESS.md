# Progreso del Proyecto RolHack

## Última sesión: 2026-01-26

### v1.3.0 - Sistema de Hack en Dos Fases

**Estado:** Completado y desplegado

#### Implementado

1. **Sistema de Hack en Dos Fases (Engine)**
   - Fase 1: Valor vs CD. Si >= CD = éxito inmediato. Si < CD = requiere fase 2
   - Fase 2: Dado de fallo (failDie D3-D20). Rolls 1-2 = fallo crítico, 3-D = fallo de rango
   - Nuevo campo `failDie` en NodeDefinition (D3-D20, default D4)
   - Campos `criticalFailMode` y `rangeFailMode` para determinar WARNING vs BLOQUEO
   - Respuesta API con `needsPhase2: true` y `failDie: number` cuando se requiere fase 2

2. **UI de Fase 2 en Vista Inmersiva**
   - Panel destacado naranja con pulso al fallar CD
   - Muestra rango permitido: "INGRESA VALOR: 1 - D{failDie}"
   - Input con validación del rango del dado
   - Botón de submit "D{failDie}" y botón de cancelar
   - Oculta botones de scan/move durante fase 2
   - Mensajes de terminal informativos

3. **Terminología de Fase 2 en Temas**
   - `phase2Required`: Mensaje de alerta al fallar fase 1
   - `phase2Instruction`: Instrucción para el dado de fallo
   - `phase2Title`: Título del input de fase 2
   - `phase2Range`: Etiqueta del rango
   - Implementado en Cyber, Medieval y Cthulhu

4. **Editor de Nodos**
   - Listbox D3-D20 para seleccionar `failDie`
   - Validación opcional (default D4 para nodos legacy)
   - Disponible en editor de tabla y editor visual

5. **Corrección de Modales**
   - z-index aumentado de z-50 a z-[200] en QR, Network Map y Audit
   - Agregado `type="button"` a botones de cierre
   - Agregado `cursor-pointer` y efectos hover

6. **Demo Mode**
   - Soporte completo de fase 2 en demo-immersive-view
   - Tutorial funciona con el nuevo sistema de hack

#### Archivos Principales

```
apps/web/src/
├── lib/engine/
│   ├── types.ts      # failDie, needsPhase2, criticalFailMode, rangeFailMode
│   ├── schemas.ts    # Validación failDie con transform para legacy
│   └── engine.ts     # attemptHack con lógica de dos fases
├── lib/theme/types.ts  # Terminología phase2*
├── app/runs/[runId]/
│   ├── immersive-view.tsx  # UI fase 2, estados pendingPhase2
│   ├── audit-view.tsx      # z-index fix
│   └── network-map-modal.tsx  # z-index fix
├── app/demo/
│   ├── demo-immersive-view.tsx  # UI fase 2 para demo
│   └── page.tsx  # handleHack con failDieRoll
├── components/
│   └── share-panel.tsx  # z-index fix en QR modal
└── app/projects/[projectId]/editor/
    ├── table-editor.tsx  # Listbox failDie D3-D20
    └── visual-editor.tsx  # Listbox failDie D3-D20
```

#### Commits

- `2b18355` feat: Implement two-phase hack system with fail die
- `8f1e71a` fix: Add default failDie (D4) for legacy nodes compatibility
- `5f50caf` feat: Add phase 2 UI and fix modal close buttons

---

### v1.2.0 - Sistema de Nodo Final y Mapa de Red

**Estado:** Completado y desplegado

#### Implementado

1. **Sistema de Nodo Final**
   - Campo `isFinal` en `NodeDefinition` para marcar objetivos de circuito
   - Tracking de `completedCircuits` en `RunState`
   - Validación: solo 1 nodo final por circuito
   - Al hackear nodo final: circuito marcado como completado (no bloqueado)

2. **Modal de Circuito Completado**
   - Modal de éxito con terminología temática
   - Opción de continuar a siguiente circuito o seguir explorando
   - Mensaje especial cuando todos los circuitos están completados

3. **Mapa de Red Visual**
   - Modal accesible con botón `[M] MAP` en header
   - SVG con posicionamiento manual (`mapX`, `mapY`) o auto-layout por nivel
   - Colores semánticos: actual, hackeado, pendiente, bloqueado
   - Estilos de enlaces: solid, dashed, dotted
   - Indicador especial para nodos finales (anillo + etiqueta)
   - Leyenda completa

4. **Destacado de Nodo Final**
   - Badge pulsante "FINAL" en barra de estado
   - Mensajes de terminal al llegar al nodo final
   - Input de hack con borde verde brillante y efecto de pulso

5. **Terminología de Completado**
   - Cyber: "CIRCUIT COMPLETE", "SYSTEM FULLY COMPROMISED"
   - Medieval: "NIVEL CONQUISTADO", "LA MAZMORRA HA CAIDO"
   - Cthulhu: "DIMENSION CORROMPIDA", "LOS ANTIGUOS TE RECONOCEN"

6. **Editor Visual**
   - Checkbox "Nodo FINAL" con lógica de cambio automático
   - Badge "FINAL" visible en modo vista
   - Campos `mapX` y `mapY` para posicionamiento en mapa

#### Archivos Principales

```
apps/web/src/
├── lib/engine/
│   ├── types.ts      # isFinal, completedCircuits, circuitCompleted
│   ├── schemas.ts    # Validación 1 final por circuito
│   └── engine.ts     # isCircuitCompleted, attemptHack con final
├── lib/theme/types.ts  # Terminología de completion
├── app/runs/[runId]/
│   ├── immersive-view.tsx  # Modal completado, highlighting
│   └── network-map-modal.tsx  # NUEVO: Mapa visual de circuito
└── app/projects/[projectId]/editor/
    └── visual-editor.tsx  # isFinal checkbox, mapX/mapY
```

#### Commits

- `ad50f8e` feat: Add Final Node system with circuit completion

---

### v1.1.0 - Sistema de Temas Visuales

**Estado:** Completado y desplegado

#### Implementado

1. **Infraestructura de Temas**
   - `ThemeContext` para gestión de tema activo
   - `ThemeDefinition` con colores, efectos y fondos
   - `ThemeTerminology` con 30+ campos de texto personalizable

2. **Componentes Visuales**
   - `BackgroundLayer`: Patrones CSS (grid cyber, piedra medieval, eldritch)
   - `ThemedEffects`: Efectos CSS (fog, dust, fireEmbers, tentacles, candleFlicker)
   - `ThemeSelector`: Dropdown para selección de plantilla

3. **Terminología Dinámica**
   - Labels de mapa: HACKED, PENDING, BLOCKED, HIDDEN
   - Acciones: HACK, SCAN, MOVE
   - Pantalla lockdown: icono, subtítulo, mensajes
   - Pantalla game over: icono, subtítulo, mensajes
   - Mensajes de boot, éxito y fallo

4. **Plantillas Temáticas**
   - `dungeon-classic`: Mazmorra medieval clásica
   - `castle-siege`: Asedio al castillo
   - `eldritch-depths`: Profundidades lovecraftianas
   - `madness-asylum`: Asilo de la locura

5. **Validaciones**
   - CD: rango 1-20 (editor + interfaz de juego)
   - Level: rango 0-10 (editores tabla y visual)

6. **UX**
   - Botón @ siempre visible para descubrir enlaces
   - Funciona silenciosamente cuando no hay enlaces ocultos

#### Archivos Principales

```
apps/web/src/
├── lib/theme/
│   ├── types.ts           # ThemeDefinition, ThemeTerminology
│   ├── theme-context.tsx  # React Context
│   ├── theme-utils.ts     # DEFAULT, MEDIEVAL, CTHULHU terminologies
│   └── index.ts
├── components/theme/
│   ├── background-layer.tsx
│   ├── themed-effects.tsx
│   ├── theme-selector.tsx
│   └── index.ts
└── app/
    ├── runs/[runId]/
    │   ├── immersive-view.tsx  # Usa ThemeContext
    │   └── circuit-map.tsx     # Acepta terminology prop
    └── demo/
        └── demo-immersive-view.tsx
```

#### Commits

- `3a9d4a7` feat: Add visual theme system with Medieval and Cthulhu themes
- `a40595e` feat: Add circuit-level blocking and visual circuit map

---

## Próximos pasos potenciales

- [ ] Assets de imágenes para fondos (stone-wall.jpg, eldritch-pattern.jpg)
- [ ] Más temas (Sci-Fi retro, Steampunk, Noir)
- [ ] Sonidos temáticos opcionales
- [ ] Editor visual de temas personalizados

---

## Versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.3.0 | 2026-01-26 | Sistema de Hack en Dos Fases |
| 1.2.0 | 2026-01-19 | Sistema de Nodo Final y Mapa de Red |
| 1.1.0 | 2026-01-16 | Sistema de temas visuales |
| 1.0.0 | 2026-01-15 | Primera versión estable |

---

**Producción:** https://rolhack.euforiateclog.cloud
**Demo:** https://rolhack.euforiateclog.cloud/demo
