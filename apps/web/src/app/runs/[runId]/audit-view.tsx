'use client'

import { useState, useMemo } from 'react'
import type {
  ProjectData,
  RunState,
  RunAuditData,
  TimelineEvent,
  StateSnapshot,
  ExportFormat,
} from '@/lib/engine'
import { generateAuditData, exportTimeline, exportAuditSummary } from '@/lib/engine'

// =============================================================================
// AuditView Component - Comprehensive read-only audit of a RUN
// =============================================================================
// IMPORTANT: This is a pure observation view. It does NOT modify any data.
// All information displayed is derived from existing state.

interface AuditViewProps {
  runId: string
  runName: string | null
  projectName: string
  state: RunState
  projectData: ProjectData
  createdAt: string
  // Permission checks
  canExport: boolean
  isSuperAdmin: boolean
  // Callbacks
  onClose: () => void
  onEnterReplay: (snapshot: StateSnapshot, eventIndex: number) => void
  // Visual variant
  variant: 'TECH' | 'IMMERSIVE'
  theme?: {
    primaryColor: string
    secondaryColor: string
    textColor: string
    bgColor: string
  }
}

// Status colors for display
const STATUS_COLORS = {
  NOT_STARTED: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  IN_PROGRESS: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  ADVANCED: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  COMPLETED: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  BLOCKED: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
}

const STATUS_LABELS = {
  NOT_STARTED: 'Sin iniciar',
  IN_PROGRESS: 'En progreso',
  ADVANCED: 'Avanzado',
  COMPLETED: 'Completado',
  BLOCKED: 'Bloqueado',
}

export function AuditView({
  runId,
  runName,
  projectName,
  state,
  projectData,
  createdAt,
  canExport,
  isSuperAdmin,
  onClose,
  onEnterReplay,
  variant,
  theme,
}: AuditViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'circuits' | 'timeline'>('overview')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('markdown')
  const [showExportModal, setShowExportModal] = useState(false)

  // Generate audit data (memoized for performance)
  const auditData = useMemo(
    () => generateAuditData(runId, runName, projectName, state, projectData, createdAt),
    [runId, runName, projectName, state, projectData, createdAt]
  )

  // Calculate overall progress
  const overallProgress = auditData.totalNodes > 0
    ? Math.round((auditData.hackedNodes / auditData.totalNodes) * 100)
    : 0

  // Handle export
  const handleExport = (type: 'timeline' | 'full') => {
    let content: string
    let filename: string

    if (type === 'timeline') {
      content = exportTimeline(auditData.timeline, exportFormat, projectName)
      filename = `timeline_${runId.slice(0, 8)}.${exportFormat === 'json' ? 'json' : exportFormat === 'markdown' ? 'md' : 'txt'}`
    } else {
      content = exportAuditSummary(auditData, exportFormat)
      filename = `audit_${runId.slice(0, 8)}.${exportFormat === 'json' ? 'json' : exportFormat === 'markdown' ? 'md' : 'txt'}`
    }

    // Create and trigger download
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setShowExportModal(false)
  }

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // TECH variant
  if (variant === 'TECH') {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-cyber-dark border border-cyber-primary/30 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
          {/* Header */}
          <div className="border-b border-cyber-primary/20 px-6 py-4 flex items-center justify-between bg-cyber-darker">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-cyber-primary/20 border border-cyber-primary/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyber-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-mono font-bold text-cyber-primary">AUDIT VIEW</h2>
                <p className="text-xs text-gray-500">{runName || `Run ${runId.slice(0, 8)}`} - {projectName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Export button */}
              {canExport && (
                <button
                  onClick={() => setShowExportModal(true)}
                  className="px-4 py-2 bg-cyber-accent/20 border border-cyber-accent/30 hover:bg-cyber-accent/30 text-cyber-accent rounded-lg font-mono text-sm transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  EXPORT
                </button>
              )}
              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="border-b border-gray-800 px-6 py-2 flex gap-4 bg-cyber-dark">
            {(['overview', 'circuits', 'timeline'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-mono text-sm rounded transition-colors ${
                  activeTab === tab
                    ? 'bg-cyber-primary/20 text-cyber-primary border border-cyber-primary/30'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {tab === 'overview' ? 'RESUMEN' : tab === 'circuits' ? 'CIRCUITOS' : 'TIMELINE'}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Overview tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Progress overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-cyber-darker border border-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-500 font-mono mb-2">PROGRESO TOTAL</p>
                    <p className="text-3xl font-bold text-cyber-primary font-mono">{overallProgress}%</p>
                    <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyber-primary rounded-full transition-all"
                        style={{ width: `${overallProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-cyber-darker border border-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-500 font-mono mb-2">NODOS</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-green-400 font-mono">{auditData.hackedNodes}</p>
                      <p className="text-lg text-gray-500 font-mono">/ {auditData.totalNodes}</p>
                    </div>
                    {auditData.blockedNodes > 0 && (
                      <p className="text-sm text-red-400 mt-1">{auditData.blockedNodes} bloqueados</p>
                    )}
                  </div>

                  <div className="bg-cyber-darker border border-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-500 font-mono mb-2">CIRCUITOS</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-cyan-400 font-mono">{auditData.completedCircuits}</p>
                      <p className="text-lg text-gray-500 font-mono">/ {auditData.totalCircuits}</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">completados</p>
                  </div>
                </div>

                {/* Circuit status summary */}
                <div className="bg-cyber-darker border border-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-mono font-medium text-gray-400 mb-4">ESTADO POR CIRCUITO</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {auditData.circuits.map((circuit) => {
                      const statusColor = STATUS_COLORS[circuit.status]
                      return (
                        <div
                          key={circuit.id}
                          className={`p-3 rounded-lg border ${statusColor.border} ${statusColor.bg}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-white truncate">{circuit.name}</span>
                            {circuit.isCurrentCircuit && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-cyber-primary/30 text-cyber-primary rounded">
                                ACTUAL
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${statusColor.text}`}>
                              {STATUS_LABELS[circuit.status]}
                            </span>
                            <span className="text-xs text-gray-500">
                              {circuit.hackedNodes}/{circuit.totalNodes}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Recent events */}
                <div className="bg-cyber-darker border border-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-mono font-medium text-gray-400 mb-4">
                    EVENTOS RECIENTES ({auditData.timeline.length} total)
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {auditData.timeline.slice(-5).reverse().map((event, idx) => (
                      <button
                        key={event.id}
                        onClick={() => {
                          const eventIndex = auditData.timeline.length - 1 - idx
                          onEnterReplay(event.snapshot, eventIndex)
                          onClose()
                        }}
                        className="w-full p-2 rounded bg-gray-800/50 hover:bg-gray-800 text-left transition-colors flex items-center gap-3"
                      >
                        <span className="text-xs text-gray-500 font-mono w-16">{formatTime(event.timestamp)}</span>
                        <span className="text-xs text-cyber-primary font-mono w-24">{event.type}</span>
                        <span className="text-sm text-gray-300 flex-1 truncate">{event.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Circuits tab */}
            {activeTab === 'circuits' && (
              <div className="space-y-4">
                {auditData.circuits.map((circuit) => {
                  const statusColor = STATUS_COLORS[circuit.status]
                  return (
                    <div
                      key={circuit.id}
                      className="bg-cyber-darker border border-gray-800 rounded-lg overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-white flex items-center gap-2">
                            {circuit.name}
                            {circuit.isCurrentCircuit && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-cyber-primary/30 text-cyber-primary rounded">
                                ACTUAL
                              </span>
                            )}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                            {STATUS_LABELS[circuit.status]}
                          </span>
                        </div>
                        {circuit.description && (
                          <p className="text-sm text-gray-500 mb-3">{circuit.description}</p>
                        )}

                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs font-mono mb-1">
                            <span className="text-gray-500">{circuit.hackedNodes} hackeados</span>
                            <span className="text-gray-500">{circuit.progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                circuit.status === 'COMPLETED'
                                  ? 'bg-green-500'
                                  : circuit.blockedNodes > 0
                                  ? 'bg-gradient-to-r from-cyan-500 to-red-500'
                                  : 'bg-cyan-500'
                              }`}
                              style={{ width: `${circuit.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4 text-xs font-mono">
                          <span className="text-gray-500">
                            <span className="text-green-400">{circuit.hackedNodes}</span> hackeados
                          </span>
                          {circuit.blockedNodes > 0 && (
                            <span className="text-gray-500">
                              <span className="text-red-400">{circuit.blockedNodes}</span> bloqueados
                            </span>
                          )}
                          <span className="text-gray-500">
                            <span className="text-cyan-400">{circuit.discoveredNodes}</span> descubiertos
                          </span>
                        </div>
                      </div>

                      {/* Circuit events */}
                      {circuit.events.length > 0 && (
                        <div className="p-4 bg-gray-900/50">
                          <p className="text-xs text-gray-500 mb-2">{circuit.events.length} evento(s) en este circuito</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {circuit.events.map((event) => (
                              <div key={event.id} className="text-xs flex gap-2">
                                <span className="text-gray-600">{formatTime(event.timestamp)}</span>
                                <span className="text-gray-400">{event.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Timeline tab */}
            {activeTab === 'timeline' && (
              <div className="space-y-2">
                {auditData.timeline.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay eventos registrados</p>
                ) : (
                  auditData.timeline.map((event, idx) => {
                    const circuit = auditData.circuits.find(c => c.id === event.circuitId)
                    return (
                      <button
                        key={event.id}
                        onClick={() => {
                          onEnterReplay(event.snapshot, idx)
                          onClose()
                        }}
                        className="w-full p-3 rounded-lg bg-cyber-darker border border-gray-800 hover:border-cyber-primary/30 text-left transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[60px]">
                            <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                            <p className="text-sm font-mono text-cyber-primary">{formatTime(event.timestamp)}</p>
                          </div>
                          <div className="h-8 w-px bg-gray-700" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono px-2 py-0.5 bg-cyber-primary/20 text-cyber-primary rounded">
                                {event.type}
                              </span>
                              {circuit && (
                                <span className="text-xs text-gray-500">
                                  en {circuit.name}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-300">{event.description}</p>
                          </div>
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-800 px-6 py-3 bg-cyber-darker">
            <p className="text-xs text-gray-600 font-mono text-center">
              AUDIT VIEW - Solo lectura - Los datos mostrados son una representación del estado actual
            </p>
          </div>
        </div>

        {/* Export modal */}
        {showExportModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-cyber-dark border border-cyber-accent/30 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-mono font-bold text-cyber-accent mb-4">EXPORTAR</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Formato</label>
                  <div className="flex gap-2">
                    {(['text', 'markdown', 'json'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setExportFormat(fmt)}
                        className={`px-4 py-2 rounded font-mono text-sm transition-colors ${
                          exportFormat === fmt
                            ? 'bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleExport('timeline')}
                    className="flex-1 px-4 py-3 bg-cyber-primary/20 border border-cyber-primary/30 hover:bg-cyber-primary/30 text-cyber-primary rounded font-mono text-sm transition-colors"
                  >
                    Exportar Timeline
                  </button>
                  <button
                    onClick={() => handleExport('full')}
                    className="flex-1 px-4 py-3 bg-cyber-accent/20 border border-cyber-accent/30 hover:bg-cyber-accent/30 text-cyber-accent rounded font-mono text-sm transition-colors"
                  >
                    Exportar Auditoría
                  </button>
                </div>

                <button
                  onClick={() => setShowExportModal(false)}
                  className="w-full px-4 py-2 text-gray-500 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // IMMERSIVE variant
  const primaryColor = theme?.primaryColor || '#00ff00'
  const textColor = theme?.textColor || '#00ff00'
  const bgColor = theme?.bgColor || '#000000'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: `${bgColor}f0` }}>
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded font-mono"
        style={{ border: `1px solid ${primaryColor}44`, backgroundColor: bgColor }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${primaryColor}33` }}>
          <div className="flex items-center gap-3">
            <span style={{ color: primaryColor }}>[</span>
            <span style={{ color: primaryColor }}>AUDIT_LOG</span>
            <span style={{ color: primaryColor }}>]</span>
            <span style={{ color: `${textColor}66` }} className="text-sm">
              {runName || runId.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {canExport && (
              <button
                onClick={() => setShowExportModal(true)}
                className="px-3 py-1 text-sm rounded"
                style={{ border: `1px solid ${primaryColor}66`, color: primaryColor }}
              >
                [EXPORT]
              </button>
            )}
            <button
              onClick={onClose}
              className="text-sm"
              style={{ color: `${textColor}66` }}
            >
              [X] CLOSE
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="px-6 py-2 flex gap-4" style={{ borderBottom: `1px solid ${primaryColor}22` }}>
          {(['overview', 'circuits', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="text-sm px-3 py-1 rounded"
              style={{
                backgroundColor: activeTab === tab ? `${primaryColor}22` : 'transparent',
                color: activeTab === tab ? primaryColor : `${textColor}66`,
                border: activeTab === tab ? `1px solid ${primaryColor}44` : '1px solid transparent',
              }}
            >
              [{tab === 'overview' ? 'SUMMARY' : tab === 'circuits' ? 'CIRCUITS' : 'EVENTS'}]
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4 text-sm">
              <div style={{ color: textColor }}>
                <p>&gt; TOTAL_PROGRESS: {overallProgress}%</p>
                <p>&gt; NODES: {auditData.hackedNodes}/{auditData.totalNodes} COMPROMISED</p>
                {auditData.blockedNodes > 0 && (
                  <p style={{ color: '#ff5555' }}>&gt; BLOCKED: {auditData.blockedNodes}</p>
                )}
                <p>&gt; CIRCUITS: {auditData.completedCircuits}/{auditData.totalCircuits} COMPLETED</p>
                <p>&gt; EVENTS: {auditData.timeline.length} RECORDED</p>
              </div>

              <div style={{ borderTop: `1px solid ${primaryColor}22`, paddingTop: '1rem' }}>
                <p style={{ color: `${textColor}66` }} className="mb-2">&gt; CIRCUIT_STATUS:</p>
                {auditData.circuits.map((circuit) => (
                  <p key={circuit.id} style={{ color: textColor }}>
                    {'  '}{circuit.name}: [{circuit.status}] {circuit.progress}%
                    {circuit.isCurrentCircuit && <span style={{ color: primaryColor }}> [CURRENT]</span>}
                  </p>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'circuits' && (
            <div className="space-y-4 text-sm" style={{ color: textColor }}>
              {auditData.circuits.map((circuit) => (
                <div key={circuit.id} className="p-3 rounded" style={{ border: `1px solid ${primaryColor}22` }}>
                  <p>&gt; {circuit.name} {circuit.isCurrentCircuit && <span style={{ color: primaryColor }}>[LINKED]</span>}</p>
                  <p style={{ color: `${textColor}66` }}>{'  '}STATUS: {circuit.status}</p>
                  <p style={{ color: `${textColor}66` }}>{'  '}PROGRESS: {circuit.progress}%</p>
                  <p style={{ color: `${textColor}66` }}>{'  '}NODES: {circuit.hackedNodes}/{circuit.totalNodes}</p>
                  {circuit.blockedNodes > 0 && (
                    <p style={{ color: '#ff5555' }}>{'  '}BLOCKED: {circuit.blockedNodes}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-1 text-sm" style={{ color: textColor }}>
              {auditData.timeline.map((event, idx) => (
                <button
                  key={event.id}
                  onClick={() => {
                    onEnterReplay(event.snapshot, idx)
                    onClose()
                  }}
                  className="w-full text-left p-2 rounded hover:opacity-80"
                  style={{ backgroundColor: `${primaryColor}11` }}
                >
                  <span style={{ color: `${textColor}66` }}>[{formatTime(event.timestamp)}]</span>
                  {' '}
                  <span style={{ color: primaryColor }}>{event.type}</span>
                  {' '}
                  <span>{event.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-2 text-center" style={{ borderTop: `1px solid ${primaryColor}22` }}>
          <p style={{ color: `${textColor}44` }} className="text-[10px]">
            &gt; AUDIT LOG - READ ONLY - OBSERVATION MODE ACTIVE
          </p>
        </div>

        {/* Export modal for immersive */}
        {showExportModal && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${bgColor}ee` }}>
            <div className="p-6 rounded" style={{ border: `1px solid ${primaryColor}44`, backgroundColor: bgColor }}>
              <p style={{ color: primaryColor }} className="mb-4">&gt; SELECT EXPORT FORMAT:</p>
              <div className="flex gap-2 mb-4">
                {(['text', 'markdown', 'json'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className="px-3 py-1 text-sm"
                    style={{
                      border: `1px solid ${exportFormat === fmt ? primaryColor : `${primaryColor}44`}`,
                      color: exportFormat === fmt ? primaryColor : textColor,
                    }}
                  >
                    [{fmt.toUpperCase()}]
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('timeline')}
                  className="px-4 py-2 text-sm"
                  style={{ border: `1px solid ${primaryColor}66`, color: primaryColor }}
                >
                  [TIMELINE]
                </button>
                <button
                  onClick={() => handleExport('full')}
                  className="px-4 py-2 text-sm"
                  style={{ border: `1px solid ${primaryColor}66`, color: primaryColor }}
                >
                  [FULL_AUDIT]
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-sm"
                  style={{ color: `${textColor}66` }}
                >
                  [CANCEL]
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
