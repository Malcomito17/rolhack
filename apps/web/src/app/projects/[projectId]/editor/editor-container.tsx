'use client'

// =============================================================================
// Editor Container - Main client component for the adventure editor
// =============================================================================

import { useState, useCallback, useEffect } from 'react'
import type { ProjectData, CircuitDefinition, NodeDefinition, LinkDefinition } from '@/lib/engine'
import { validateProjectDataFull } from '@/lib/engine/validation'
import type { ValidationResult } from '@/lib/engine/validation'
import { TabNavigation } from './components/tab-navigation'
import { VisualEditor } from './components/visual-editor/visual-editor'
import { TableEditor } from './components/table-editor/table-editor'
import { JsonEditor } from './components/json-editor/json-editor'
import { VersionPanel } from './components/version-panel'
import { SaveControls } from './components/save-controls'

// =============================================================================
// TYPES
// =============================================================================

export type EditorTab = 'visual' | 'table' | 'json'

export interface VersionInfo {
  id: string
  version: number
  isActive: boolean
  createdAt: string
  createdBy: { id: string; name: string | null; email: string }
  runsCount: number
}

interface Props {
  projectId: string
  projectName: string
  initialData: ProjectData
  versions: VersionInfo[]
  activeVersionId: string | null
}

// =============================================================================
// COMPONENT
// =============================================================================

export function EditorContainer({
  projectId,
  projectName,
  initialData,
  versions: initialVersions,
  activeVersionId: initialActiveVersionId,
}: Props) {
  // Data state
  const [data, setData] = useState<ProjectData>(initialData)
  const [originalData, setOriginalData] = useState<ProjectData>(initialData)

  // UI state
  const [activeTab, setActiveTab] = useState<EditorTab>('visual')
  const [selectedCircuitId, setSelectedCircuitId] = useState<string | null>(
    initialData.circuits[0]?.id || null
  )

  // Validation state
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, errors: [] })

  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Version state
  const [versions, setVersions] = useState<VersionInfo[]>(initialVersions)
  const [activeVersionId, setActiveVersionId] = useState<string | null>(initialActiveVersionId)

  // Derived state
  const isDirty = JSON.stringify(data) !== JSON.stringify(originalData)

  // =============================================================================
  // VALIDATION EFFECT
  // =============================================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = validateProjectDataFull(data)
      setValidation(result)
    }, 300)

    return () => clearTimeout(timer)
  }, [data])

  // =============================================================================
  // META ACTIONS
  // =============================================================================

  const updateMeta = useCallback((updates: Partial<ProjectData['meta']>) => {
    setData((prev) => ({
      ...prev,
      meta: { ...prev.meta, ...updates },
    }))
  }, [])

  // =============================================================================
  // CIRCUIT ACTIONS
  // =============================================================================

  const addCircuit = useCallback((circuit: Omit<CircuitDefinition, 'nodes' | 'links'>) => {
    const newCircuit: CircuitDefinition = {
      ...circuit,
      nodes: [],
      links: [],
    }
    setData((prev) => ({
      ...prev,
      circuits: [...prev.circuits, newCircuit],
    }))
    setSelectedCircuitId(circuit.id)
  }, [])

  const updateCircuit = useCallback((circuitId: string, updates: Partial<CircuitDefinition>) => {
    setData((prev) => ({
      ...prev,
      circuits: prev.circuits.map((c) =>
        c.id === circuitId ? { ...c, ...updates } : c
      ),
    }))
  }, [])

  const deleteCircuit = useCallback((circuitId: string) => {
    setData((prev) => {
      const newCircuits = prev.circuits.filter((c) => c.id !== circuitId)
      // Update selected circuit if necessary
      if (selectedCircuitId === circuitId) {
        setSelectedCircuitId(newCircuits[0]?.id || null)
      }
      return { ...prev, circuits: newCircuits }
    })
  }, [selectedCircuitId])

  // =============================================================================
  // NODE ACTIONS
  // =============================================================================

  const addNode = useCallback((circuitId: string, node: NodeDefinition) => {
    setData((prev) => ({
      ...prev,
      circuits: prev.circuits.map((c) =>
        c.id === circuitId ? { ...c, nodes: [...c.nodes, node] } : c
      ),
    }))
  }, [])

  const updateNode = useCallback((circuitId: string, nodeId: string, updates: Partial<NodeDefinition>) => {
    setData((prev) => ({
      ...prev,
      circuits: prev.circuits.map((c) =>
        c.id === circuitId
          ? {
              ...c,
              nodes: c.nodes.map((n) =>
                n.id === nodeId ? { ...n, ...updates } : n
              ),
            }
          : c
      ),
    }))
  }, [])

  const deleteNode = useCallback((circuitId: string, nodeId: string) => {
    setData((prev) => ({
      ...prev,
      circuits: prev.circuits.map((c) =>
        c.id === circuitId
          ? {
              ...c,
              nodes: c.nodes.filter((n) => n.id !== nodeId),
              // Also remove links that reference this node
              links: c.links.filter((l) => l.from !== nodeId && l.to !== nodeId),
            }
          : c
      ),
    }))
  }, [])

  // =============================================================================
  // LINK ACTIONS
  // =============================================================================

  const addLink = useCallback((circuitId: string, link: LinkDefinition) => {
    setData((prev) => ({
      ...prev,
      circuits: prev.circuits.map((c) =>
        c.id === circuitId ? { ...c, links: [...c.links, link] } : c
      ),
    }))
  }, [])

  const updateLink = useCallback((circuitId: string, linkId: string, updates: Partial<LinkDefinition>) => {
    setData((prev) => ({
      ...prev,
      circuits: prev.circuits.map((c) =>
        c.id === circuitId
          ? {
              ...c,
              links: c.links.map((l) =>
                l.id === linkId ? { ...l, ...updates } : l
              ),
            }
          : c
      ),
    }))
  }, [])

  const deleteLink = useCallback((circuitId: string, linkId: string) => {
    setData((prev) => ({
      ...prev,
      circuits: prev.circuits.map((c) =>
        c.id === circuitId
          ? { ...c, links: c.links.filter((l) => l.id !== linkId) }
          : c
      ),
    }))
  }, [])

  // =============================================================================
  // JSON DIRECT EDIT
  // =============================================================================

  const setDataFromJson = useCallback((newData: ProjectData) => {
    setData(newData)
    // Update selected circuit if current one no longer exists
    if (selectedCircuitId && !newData.circuits.find((c) => c.id === selectedCircuitId)) {
      setSelectedCircuitId(newData.circuits[0]?.id || null)
    }
  }, [selectedCircuitId])

  // =============================================================================
  // SAVE ACTION
  // =============================================================================

  const handleSave = useCallback(async () => {
    if (!validation.valid) {
      setSaveMessage({ type: 'error', text: 'Corrige los errores antes de guardar' })
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/definitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, setActive: true }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Error al guardar')
      }

      // Update versions list
      const newVersion: VersionInfo = {
        id: result.id,
        version: result.version,
        isActive: true,
        createdAt: result.createdAt,
        createdBy: { id: '', name: '', email: '' }, // Will be updated on refresh
        runsCount: 0,
      }

      setVersions((prev) => [
        newVersion,
        ...prev.map((v) => ({ ...v, isActive: false })),
      ])
      setActiveVersionId(result.id)
      setOriginalData(data)
      setSaveMessage({ type: 'success', text: `Version ${result.version} guardada` })
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error desconocido',
      })
    } finally {
      setIsSaving(false)
    }
  }, [data, projectId, validation.valid])

  // =============================================================================
  // ACTIVATE VERSION
  // =============================================================================

  const handleActivateVersion = useCallback(async (versionId: string) => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const res = await fetch(
        `/api/projects/${projectId}/definitions/${versionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true }),
        }
      )

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Error al activar versión')
      }

      // Update versions list
      setVersions((prev) =>
        prev.map((v) => ({
          ...v,
          isActive: v.id === versionId,
        }))
      )
      setActiveVersionId(versionId)

      // Load the activated version's data
      const dataRes = await fetch(
        `/api/projects/${projectId}/definitions/${versionId}`
      )
      const dataResult = await dataRes.json()

      if (dataRes.ok && dataResult.data) {
        setData(dataResult.data)
        setOriginalData(dataResult.data)
        setSelectedCircuitId(dataResult.data.circuits[0]?.id || null)
      }

      setSaveMessage({ type: 'success', text: result.message })
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error desconocido',
      })
    } finally {
      setIsSaving(false)
    }
  }, [projectId])

  // =============================================================================
  // RENDER
  // =============================================================================

  // Get current circuit
  const currentCircuit = data.circuits.find((c) => c.id === selectedCircuitId) || null

  return (
    <div className="space-y-6">
      {/* Top bar with tabs and save controls */}
      <div className="flex items-center justify-between gap-4">
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <SaveControls
          isDirty={isDirty}
          isValid={validation.valid}
          isSaving={isSaving}
          message={saveMessage}
          onSave={handleSave}
          onDismissMessage={() => setSaveMessage(null)}
        />
      </div>

      {/* Validation errors summary */}
      {!validation.valid && validation.errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
          <p className="text-red-400 font-medium mb-2">
            {validation.errors.length} error{validation.errors.length > 1 ? 'es' : ''} de validación
          </p>
          <ul className="text-sm text-red-400/80 space-y-1 max-h-32 overflow-y-auto">
            {validation.errors.slice(0, 5).map((err, i) => (
              <li key={i}>
                <span className="text-red-500 font-mono text-xs">{err.path.join('.')}</span>
                {err.path.length > 0 && ': '}
                {err.message}
              </li>
            ))}
            {validation.errors.length > 5 && (
              <li className="text-red-400/60">
                ... y {validation.errors.length - 5} más
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Editor area (3/4) */}
        <div className="lg:col-span-3">
          {activeTab === 'visual' && (
            <VisualEditor
              data={data}
              selectedCircuitId={selectedCircuitId}
              onSelectCircuit={setSelectedCircuitId}
              onAddCircuit={addCircuit}
              onUpdateCircuit={updateCircuit}
              onDeleteCircuit={deleteCircuit}
              onAddNode={addNode}
              onUpdateNode={updateNode}
              onDeleteNode={deleteNode}
              onAddLink={addLink}
              onUpdateLink={updateLink}
              onDeleteLink={deleteLink}
              onUpdateMeta={updateMeta}
            />
          )}

          {activeTab === 'table' && (
            <TableEditor
              data={data}
              selectedCircuitId={selectedCircuitId}
              onSelectCircuit={setSelectedCircuitId}
              currentCircuit={currentCircuit}
              onAddNode={addNode}
              onUpdateNode={updateNode}
              onDeleteNode={deleteNode}
              onAddLink={addLink}
              onUpdateLink={updateLink}
              onDeleteLink={deleteLink}
            />
          )}

          {activeTab === 'json' && (
            <JsonEditor
              data={data}
              validation={validation}
              onDataChange={setDataFromJson}
            />
          )}
        </div>

        {/* Version panel (1/4) */}
        <div className="lg:col-span-1">
          <VersionPanel
            versions={versions}
            activeVersionId={activeVersionId}
            onActivateVersion={handleActivateVersion}
            isLoading={isSaving}
          />
        </div>
      </div>
    </div>
  )
}
