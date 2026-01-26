'use client'

import { useState } from 'react'
import type { ProjectData, CircuitDefinition, NodeDefinition, LinkDefinition, ProjectMeta } from '@/lib/engine'

interface Props {
  data: ProjectData
  selectedCircuitId: string | null
  onSelectCircuit: (id: string | null) => void
  onAddCircuit: (circuit: Omit<CircuitDefinition, 'nodes' | 'links'>) => void
  onUpdateCircuit: (id: string, updates: Partial<CircuitDefinition>) => void
  onDeleteCircuit: (id: string) => void
  onAddNode: (circuitId: string, node: NodeDefinition) => void
  onUpdateNode: (circuitId: string, nodeId: string, updates: Partial<NodeDefinition>) => void
  onDeleteNode: (circuitId: string, nodeId: string) => void
  onAddLink: (circuitId: string, link: LinkDefinition) => void
  onUpdateLink: (circuitId: string, linkId: string, updates: Partial<LinkDefinition>) => void
  onDeleteLink: (circuitId: string, linkId: string) => void
  onUpdateMeta: (updates: Partial<ProjectMeta>) => void
}

export function VisualEditor({
  data,
  selectedCircuitId,
  onSelectCircuit,
  onAddCircuit,
  onUpdateCircuit,
  onDeleteCircuit,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  onAddLink,
  onUpdateLink,
  onDeleteLink,
  onUpdateMeta,
}: Props) {
  const [showMetaEditor, setShowMetaEditor] = useState(false)
  const [showAddCircuit, setShowAddCircuit] = useState(false)
  const [showAddNode, setShowAddNode] = useState(false)
  const [showAddLink, setShowAddLink] = useState(false)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)

  // Fail die options (D3 to D20)
  const failDieOptions = Array.from({ length: 18 }, (_, i) => i + 3) // [3, 4, 5, ..., 20]

  // Form states
  const [newCircuit, setNewCircuit] = useState({ id: '', name: '', description: '' })
  const [newNode, setNewNode] = useState<{
    name: string
    description: string
    level: number
    cd: number
    failDie: number
    criticalFailMode: 'WARNING' | 'BLOQUEO'
    rangeFailMode: 'WARNING' | 'BLOQUEO'
    rangeErrorMessage: string
    visibleByDefault: boolean
  }>({
    name: '', description: '', level: 0, cd: 11, failDie: 4, criticalFailMode: 'BLOQUEO', rangeFailMode: 'WARNING', rangeErrorMessage: '', visibleByDefault: true
  })

  // Auto-generate unique IDs
  const generateNodeId = () => `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const [newLink, setNewLink] = useState({
    id: '', from: '', to: '', style: 'solid' as const, hidden: false, bidirectional: true
  })

  const currentCircuit = data.circuits.find(c => c.id === selectedCircuitId)

  // Group nodes by level
  const nodesByLevel = currentCircuit?.nodes.reduce((acc, node) => {
    const level = node.level
    if (!acc[level]) acc[level] = []
    acc[level].push(node)
    return acc
  }, {} as Record<number, NodeDefinition[]>) || {}

  const levels = Object.keys(nodesByLevel).map(Number).sort((a, b) => a - b)

  const handleAddCircuit = () => {
    if (!newCircuit.id || !newCircuit.name) return
    onAddCircuit(newCircuit)
    setNewCircuit({ id: '', name: '', description: '' })
    setShowAddCircuit(false)
  }

  const handleAddNode = () => {
    if (!selectedCircuitId || !newNode.name) return
    const nodeWithId: NodeDefinition = {
      ...newNode,
      id: generateNodeId(),
    }
    onAddNode(selectedCircuitId, nodeWithId)
    setNewNode({ name: '', description: '', level: 0, cd: 11, failDie: 4, criticalFailMode: 'BLOQUEO', rangeFailMode: 'WARNING', rangeErrorMessage: '', visibleByDefault: true })
    setShowAddNode(false)
  }

  const handleAddLink = () => {
    if (!selectedCircuitId || !newLink.id || !newLink.from || !newLink.to) return
    onAddLink(selectedCircuitId, newLink)
    setNewLink({ id: '', from: '', to: '', style: 'solid', hidden: false, bidirectional: true })
    setShowAddLink(false)
  }

  return (
    <div className="space-y-6">
      {/* Meta section */}
      <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Metadatos</h3>
          <button
            onClick={() => setShowMetaEditor(!showMetaEditor)}
            className="text-sm text-gray-400 hover:text-gray-300"
          >
            {showMetaEditor ? 'Cerrar' : 'Editar'}
          </button>
        </div>

        {showMetaEditor ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Version</label>
              <input
                type="text"
                value={data.meta.version}
                onChange={(e) => onUpdateMeta({ version: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Autor</label>
              <input
                type="text"
                value={data.meta.author || ''}
                onChange={(e) => onUpdateMeta({ author: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Descripcion</label>
              <textarea
                value={data.meta.description || ''}
                onChange={(e) => onUpdateMeta({ description: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-700 rounded px-3 py-2 text-sm resize-none"
                rows={2}
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400">
            <span className="text-gray-300">v{data.meta.version}</span>
            {data.meta.author && <span> por {data.meta.author}</span>}
            {data.meta.description && <p className="mt-1 text-gray-500">{data.meta.description}</p>}
          </div>
        )}
      </div>

      {/* Circuits section */}
      <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Circuitos ({data.circuits.length})
          </h3>
          <button
            onClick={() => setShowAddCircuit(true)}
            className="px-3 py-1.5 text-sm bg-cyber-primary/20 text-cyber-primary border border-cyber-primary/30 rounded hover:bg-cyber-primary/30 transition-colors"
          >
            + Agregar
          </button>
        </div>

        {/* Add circuit form */}
        {showAddCircuit && (
          <div className="mb-4 p-4 bg-cyber-darker rounded-lg border border-cyber-primary/30">
            <h4 className="text-sm font-medium text-cyber-primary mb-3">Nuevo Circuito</h4>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={newCircuit.id}
                onChange={(e) => setNewCircuit({ ...newCircuit, id: e.target.value })}
                placeholder="circuit-id"
                className="bg-cyber-dark border border-gray-700 rounded px-3 py-2 text-sm font-mono"
              />
              <input
                type="text"
                value={newCircuit.name}
                onChange={(e) => setNewCircuit({ ...newCircuit, name: e.target.value })}
                placeholder="Nombre del circuito"
                className="bg-cyber-dark border border-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAddCircuit}
                disabled={!newCircuit.id || !newCircuit.name}
                className="px-3 py-1.5 text-sm bg-cyber-primary text-cyber-darker rounded disabled:opacity-50"
              >
                Crear
              </button>
              <button
                onClick={() => setShowAddCircuit(false)}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Circuit tabs */}
        {data.circuits.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay circuitos. Agrega uno para empezar.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {data.circuits.map((circuit) => (
              <button
                key={circuit.id}
                onClick={() => onSelectCircuit(circuit.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCircuitId === circuit.id
                    ? 'bg-cyber-secondary/20 text-cyber-secondary border border-cyber-secondary/30'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-gray-600'
                }`}
              >
                {circuit.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected circuit content */}
      {currentCircuit && (
        <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-4">
          {/* Circuit header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-cyber-secondary">{currentCircuit.name}</h3>
              <p className="text-xs text-gray-500 font-mono">{currentCircuit.id}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddNode(true)}
                className="px-3 py-1.5 text-xs bg-cyber-primary/20 text-cyber-primary rounded hover:bg-cyber-primary/30"
              >
                + Nodo
              </button>
              <button
                onClick={() => setShowAddLink(true)}
                className="px-3 py-1.5 text-xs bg-cyber-secondary/20 text-cyber-secondary rounded hover:bg-cyber-secondary/30"
              >
                + Enlace
              </button>
              <button
                onClick={() => {
                  if (confirm(`Eliminar circuito "${currentCircuit.name}"?`)) {
                    onDeleteCircuit(currentCircuit.id)
                  }
                }}
                className="px-3 py-1.5 text-xs bg-red-900/20 text-red-400 rounded hover:bg-red-900/30"
              >
                Eliminar
              </button>
            </div>
          </div>

          {/* Add node form */}
          {showAddNode && (
            <div className="mb-4 p-4 bg-cyber-darker rounded-lg border border-cyber-primary/30">
              <h4 className="text-sm font-medium text-cyber-primary mb-3">Nuevo Nodo</h4>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={newNode.name}
                  onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                  placeholder="Nombre"
                  className="bg-cyber-dark border border-gray-700 rounded px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newNode.level}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(10, parseInt(e.target.value) || 0))
                      setNewNode({ ...newNode, level: val })
                    }}
                    placeholder="Level"
                    className="w-20 bg-cyber-dark border border-gray-700 rounded px-3 py-2 text-sm"
                    min={0}
                    max={10}
                  />
                  <input
                    type="number"
                    value={newNode.cd}
                    onChange={(e) => {
                      const val = Math.max(3, parseInt(e.target.value) || 3)
                      setNewNode({ ...newNode, cd: val })
                    }}
                    placeholder="CD (min 3)"
                    className="w-20 bg-cyber-dark border border-gray-700 rounded px-3 py-2 text-sm"
                    min={3}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={newNode.failDie}
                    onChange={(e) => setNewNode({ ...newNode, failDie: parseInt(e.target.value) })}
                    className="bg-cyber-dark border border-purple-900 rounded px-2 py-2 text-sm"
                    title="Dado de fallo"
                  >
                    {failDieOptions.map((d) => (
                      <option key={d} value={d}>D{d}</option>
                    ))}
                  </select>
                  <select
                    value={newNode.criticalFailMode}
                    onChange={(e) => setNewNode({ ...newNode, criticalFailMode: e.target.value as 'WARNING' | 'BLOQUEO' })}
                    className="bg-cyber-dark border border-red-900 rounded px-2 py-2 text-sm"
                    title="Crítico (1-2)"
                  >
                    <option value="WARNING">W</option>
                    <option value="BLOQUEO">B</option>
                  </select>
                  <select
                    value={newNode.rangeFailMode}
                    onChange={(e) => setNewNode({ ...newNode, rangeFailMode: e.target.value as 'WARNING' | 'BLOQUEO' })}
                    className="bg-cyber-dark border border-yellow-900 rounded px-2 py-2 text-sm"
                    title="Rango (3 a D)"
                  >
                    <option value="WARNING">W</option>
                    <option value="BLOQUEO">B</option>
                  </select>
                </div>
              </div>
              <div className="mt-2">
                <input
                  type="text"
                  value={newNode.rangeErrorMessage}
                  onChange={(e) => setNewNode({ ...newNode, rangeErrorMessage: e.target.value })}
                  placeholder="Mensaje de error personalizado (opcional)"
                  className="w-full bg-cyber-dark border border-yellow-600 rounded px-3 py-2 text-sm text-yellow-400 placeholder:text-gray-500"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAddNode}
                  disabled={!newNode.name}
                  className="px-3 py-1.5 text-sm bg-cyber-primary text-cyber-darker rounded disabled:opacity-50"
                >
                  Crear
                </button>
                <button
                  onClick={() => setShowAddNode(false)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Add link form */}
          {showAddLink && (
            <div className="mb-4 p-4 bg-cyber-darker rounded-lg border border-cyber-secondary/30">
              <h4 className="text-sm font-medium text-cyber-secondary mb-3">Nuevo Enlace</h4>
              <div className="grid grid-cols-4 gap-3">
                <input
                  type="text"
                  value={newLink.id}
                  onChange={(e) => setNewLink({ ...newLink, id: e.target.value })}
                  placeholder="link-id"
                  className="bg-cyber-dark border border-gray-700 rounded px-3 py-2 text-sm font-mono"
                />
                <select
                  value={newLink.from}
                  onChange={(e) => setNewLink({ ...newLink, from: e.target.value })}
                  className="bg-cyber-dark border border-gray-700 rounded px-3 py-2 text-sm"
                >
                  <option value="">Desde...</option>
                  {currentCircuit.nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
                <select
                  value={newLink.to}
                  onChange={(e) => setNewLink({ ...newLink, to: e.target.value })}
                  className="bg-cyber-dark border border-gray-700 rounded px-3 py-2 text-sm"
                >
                  <option value="">Hacia...</option>
                  {currentCircuit.nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={newLink.hidden}
                    onChange={(e) => setNewLink({ ...newLink, hidden: e.target.checked })}
                    className="rounded"
                  />
                  Oculto
                </label>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAddLink}
                  disabled={!newLink.id || !newLink.from || !newLink.to}
                  className="px-3 py-1.5 text-sm bg-cyber-secondary text-cyber-darker rounded disabled:opacity-50"
                >
                  Crear
                </button>
                <button
                  onClick={() => setShowAddLink(false)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Nodes by level */}
          {currentCircuit.nodes.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">
              No hay nodos. Agrega uno para empezar.
            </p>
          ) : (
            <div className="space-y-6">
              {levels.map((level) => (
                <div key={level}>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Level {level} {level === 0 && '(Entrada)'}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {nodesByLevel[level].map((node) => (
                      <div
                        key={node.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          editingNodeId === node.id
                            ? 'bg-cyber-primary/10 border-cyber-primary/50'
                            : 'bg-cyber-darker border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        {editingNodeId === node.id ? (
                          /* Edit mode */
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={node.name}
                              onChange={(e) => onUpdateNode(selectedCircuitId!, node.id, { name: e.target.value })}
                              className="w-full bg-cyber-dark border border-gray-600 rounded px-2 py-1 text-sm"
                            />
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={node.level}
                                onChange={(e) => {
                                  const val = Math.max(0, Math.min(10, parseInt(e.target.value) || 0))
                                  onUpdateNode(selectedCircuitId!, node.id, { level: val })
                                }}
                                className="w-16 bg-cyber-dark border border-gray-600 rounded px-2 py-1 text-sm"
                                min={0}
                                max={10}
                              />
                              <input
                                type="number"
                                value={node.cd}
                                onChange={(e) => {
                                  const val = Math.max(1, Math.min(20, parseInt(e.target.value) || 1))
                                  onUpdateNode(selectedCircuitId!, node.id, { cd: val })
                                }}
                                className="w-16 bg-cyber-dark border border-gray-600 rounded px-2 py-1 text-sm"
                                min={1}
                                max={20}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-purple-400 block mb-1">Dado de Fallo</label>
                              <select
                                value={node.failDie || 4}
                                onChange={(e) => onUpdateNode(selectedCircuitId!, node.id, { failDie: parseInt(e.target.value) })}
                                className="w-full bg-cyber-dark border border-purple-900 rounded px-2 py-1 text-xs"
                              >
                                {failDieOptions.map((d) => (
                                  <option key={d} value={d}>D{d}</option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-red-400 block mb-1">Crítico (1-2)</label>
                                <select
                                  value={node.criticalFailMode}
                                  onChange={(e) => onUpdateNode(selectedCircuitId!, node.id, { criticalFailMode: e.target.value as 'WARNING' | 'BLOQUEO' })}
                                  className="w-full bg-cyber-dark border border-red-900 rounded px-2 py-1 text-xs"
                                >
                                  <option value="WARNING">WARNING</option>
                                  <option value="BLOQUEO">BLOQUEO</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-yellow-400 block mb-1">Rango (3 a D)</label>
                                <select
                                  value={node.rangeFailMode}
                                  onChange={(e) => onUpdateNode(selectedCircuitId!, node.id, { rangeFailMode: e.target.value as 'WARNING' | 'BLOQUEO' })}
                                  className="w-full bg-cyber-dark border border-yellow-900 rounded px-2 py-1 text-xs"
                                >
                                  <option value="WARNING">WARNING</option>
                                  <option value="BLOQUEO">BLOQUEO</option>
                                </select>
                              </div>
                            </div>
                            <input
                              type="text"
                              value={node.rangeErrorMessage || ''}
                              onChange={(e) => onUpdateNode(selectedCircuitId!, node.id, { rangeErrorMessage: e.target.value })}
                              placeholder="Mensaje de error (opcional)"
                              className="w-full bg-cyber-dark border border-yellow-600 rounded px-2 py-1 text-xs text-yellow-400 placeholder:text-gray-500"
                            />
                            <label className="flex items-center gap-2 text-xs text-gray-400">
                              <input
                                type="checkbox"
                                checked={node.visibleByDefault}
                                onChange={(e) => onUpdateNode(selectedCircuitId!, node.id, { visibleByDefault: e.target.checked })}
                              />
                              Visible por defecto
                            </label>
                            {/* Final Node */}
                            <label className="flex items-center gap-2 text-xs text-green-400">
                              <input
                                type="checkbox"
                                checked={node.isFinal === true}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Check if another node is already final
                                    const existingFinal = currentCircuit?.nodes.find(n => n.isFinal === true && n.id !== node.id)
                                    if (existingFinal) {
                                      if (confirm(`"${existingFinal.name}" ya es nodo final. ¿Cambiar a "${node.name}"?`)) {
                                        onUpdateNode(selectedCircuitId!, existingFinal.id, { isFinal: false })
                                        onUpdateNode(selectedCircuitId!, node.id, { isFinal: true })
                                      }
                                    } else {
                                      onUpdateNode(selectedCircuitId!, node.id, { isFinal: true })
                                    }
                                  } else {
                                    onUpdateNode(selectedCircuitId!, node.id, { isFinal: false })
                                  }
                                }}
                              />
                              Nodo FINAL (objetivo del circuito)
                            </label>
                            {/* Map Position */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700">
                              <div>
                                <label className="text-xs text-blue-400 block mb-1">Mapa X (0-100)</label>
                                <input
                                  type="number"
                                  value={node.mapX ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? undefined : Number(e.target.value)
                                    onUpdateNode(selectedCircuitId!, node.id, { mapX: val })
                                  }}
                                  placeholder="Auto"
                                  min={0}
                                  max={100}
                                  className="w-full bg-cyber-dark border border-blue-900 rounded px-2 py-1 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-blue-400 block mb-1">Mapa Y (0-100)</label>
                                <input
                                  type="number"
                                  value={node.mapY ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? undefined : Number(e.target.value)
                                    onUpdateNode(selectedCircuitId!, node.id, { mapY: val })
                                  }}
                                  placeholder="Auto"
                                  min={0}
                                  max={100}
                                  className="w-full bg-cyber-dark border border-blue-900 rounded px-2 py-1 text-xs"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-gray-700">
                              <button
                                onClick={() => setEditingNodeId(null)}
                                className="flex-1 py-1 text-xs bg-gray-700 text-gray-300 rounded"
                              >
                                Cerrar
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Eliminar nodo "${node.name}"?`)) {
                                    onDeleteNode(selectedCircuitId!, node.id)
                                    setEditingNodeId(null)
                                  }
                                }}
                                className="px-2 py-1 text-xs bg-red-900/30 text-red-400 rounded"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* View mode */
                          <div
                            onClick={() => setEditingNodeId(node.id)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-white text-sm truncate">
                                {node.name}
                              </span>
                              <div className="flex gap-1">
                                {/* Critical fail mode badge (1-2) */}
                                <span
                                  className={`text-[10px] px-1 py-0.5 rounded ${
                                    node.criticalFailMode === 'BLOQUEO'
                                      ? 'bg-red-900/50 text-red-400'
                                      : 'bg-orange-900/50 text-orange-400'
                                  }`}
                                  title="Fallo crítico (1-2)"
                                >
                                  1-2:{node.criticalFailMode === 'BLOQUEO' ? 'B' : 'W'}
                                </span>
                                {/* Range fail mode badge (3 to CD-1) */}
                                <span
                                  className={`text-[10px] px-1 py-0.5 rounded ${
                                    node.rangeFailMode === 'BLOQUEO'
                                      ? 'bg-red-900/50 text-red-400'
                                      : 'bg-yellow-900/50 text-yellow-400'
                                  }`}
                                  title={`Fallo rango (3 a ${node.cd - 1})`}
                                >
                                  3+:{node.rangeFailMode === 'BLOQUEO' ? 'B' : 'W'}
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 space-y-0.5">
                              <p className="font-mono">{node.id}</p>
                              <p>CD: {node.cd} | <span className="text-purple-400">D{node.failDie || 4}</span></p>
                              {!node.visibleByDefault && (
                                <p className="text-cyber-accent">Oculto</p>
                              )}
                              {node.isFinal && (
                                <p className="text-green-400 font-bold">FINAL</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Links section */}
          {currentCircuit.links.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-800">
              <h4 className="text-sm font-medium text-gray-400 mb-3">
                Enlaces ({currentCircuit.links.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {currentCircuit.links.map((link) => {
                  const fromNode = currentCircuit.nodes.find(n => n.id === link.from)
                  const toNode = currentCircuit.nodes.find(n => n.id === link.to)
                  return (
                    <div
                      key={link.id}
                      className={`px-3 py-2 rounded-lg text-xs border ${
                        link.hidden
                          ? 'bg-cyber-accent/10 border-cyber-accent/30 text-cyber-accent'
                          : 'bg-gray-800/50 border-gray-700 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{fromNode?.name || link.from}</span>
                        <span className="text-gray-500">
                          {link.bidirectional !== false ? '↔' : '→'}
                        </span>
                        <span>{toNode?.name || link.to}</span>
                        {link.hidden && <span className="text-cyber-accent">(oculto)</span>}
                        <button
                          onClick={() => onDeleteLink(selectedCircuitId!, link.id)}
                          className="ml-2 text-red-400 hover:text-red-300"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
