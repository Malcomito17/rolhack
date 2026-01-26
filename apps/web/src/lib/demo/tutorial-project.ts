// =============================================================================
// DEMO MODE - Tutorial Project Data
// =============================================================================
// A specially designed project to teach RolHack mechanics step by step.
// CD values range from 11-20 as per game design requirements.

import type { ProjectData } from '../engine/types'

// Demo project name (separate from ProjectData meta)
export const DEMO_PROJECT_NAME = 'Tutorial RolHack'

export const TUTORIAL_PROJECT_DATA: ProjectData = {
  meta: {
    version: '1.0.0',
    author: 'RolHack Demo',
    description: 'Tutorial interactivo para aprender las mecanicas de RolHack',
  },
  circuits: [
    {
      id: 'tutorial-circuit',
      name: 'Red de Entrenamiento',
      description: 'Tu primera incursion en el sistema',
      nodes: [
        {
          id: 'node-start',
          name: 'Terminal de Acceso',
          description: 'Punto de entrada al sistema. Acceso garantizado.',
          level: 0,
          cd: 0, // Entry node - auto-accessible
          failDie: 6, // D6 for tutorial
          criticalFailMode: 'WARNING',
          rangeFailMode: 'WARNING',
          visibleByDefault: true,
        },
        {
          id: 'node-firewall',
          name: 'Firewall Basico',
          description: 'Un firewall con configuracion estandar. CD: 11',
          level: 1,
          cd: 11, // Minimum CD as per requirements
          failDie: 6, // D6 for tutorial
          criticalFailMode: 'BLOQUEO',
          rangeFailMode: 'WARNING',
          rangeErrorMessage: 'FIREWALL TRACE — CONEXION RECHAZADA',
          visibleByDefault: true,
        },
        {
          id: 'node-hidden',
          name: 'Puerto Oculto',
          description: 'Acceso alternativo descubierto mediante escaneo. CD: 12',
          level: 1,
          cd: 12,
          failDie: 6, // D6 for tutorial
          criticalFailMode: 'BLOQUEO',
          rangeFailMode: 'WARNING',
          rangeErrorMessage: 'PUERTO DETECTADO — ACCESO DENEGADO',
          visibleByDefault: false, // Hidden - teaches SCAN
        },
        {
          id: 'node-database',
          name: 'Base de Datos',
          description: 'Servidor de datos corporativos. CD: 15',
          level: 2,
          cd: 15,
          failDie: 8, // D8 - slightly harder
          criticalFailMode: 'BLOQUEO',
          rangeFailMode: 'WARNING',
          rangeErrorMessage: 'DATABASE ALERT — QUERY BLOQUEADA',
          visibleByDefault: true,
        },
        {
          id: 'node-core',
          name: 'Nucleo del Sistema',
          description: 'Objetivo final. Maxima seguridad. CD: 20',
          level: 3,
          cd: 20, // Maximum CD as per requirements
          failDie: 10, // D10 - hardest
          criticalFailMode: 'BLOQUEO',
          rangeFailMode: 'BLOQUEO', // Teaches blocking on failure
          visibleByDefault: true,
        },
      ],
      links: [
        // Main visible path
        {
          id: 'link-start-firewall',
          from: 'node-start',
          to: 'node-firewall',
          style: 'solid',
          hidden: false,
        },
        {
          id: 'link-firewall-database',
          from: 'node-firewall',
          to: 'node-database',
          style: 'solid',
          hidden: false,
        },
        {
          id: 'link-database-core',
          from: 'node-database',
          to: 'node-core',
          style: 'solid',
          hidden: false,
        },
        // Hidden path (teaches SCAN mechanic)
        {
          id: 'link-start-hidden',
          from: 'node-start',
          to: 'node-hidden',
          style: 'dashed',
          hidden: true, // Must use SCAN to discover
        },
        {
          id: 'link-hidden-database',
          from: 'node-hidden',
          to: 'node-database',
          style: 'dashed',
          hidden: false,
        },
      ],
    },
  ],
}

// Theme for demo mode
export const DEMO_THEME = {
  primaryColor: '#00ff88',
  secondaryColor: '#00ccff',
  textColor: '#e0ffe0',
  bgColor: '#0a0f0a',
}

// Effects for demo mode
export const DEMO_EFFECTS = {
  scanlines: true,
  glitch: false,
  flicker: false,
  crtCurve: false,
  matrixRain: false,
  warningPulse: false,
  radarSweep: false,
}
