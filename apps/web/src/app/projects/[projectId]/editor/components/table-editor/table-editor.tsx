'use client'

import { useState } from 'react'
import type { ProjectData, CircuitDefinition, NodeDefinition, LinkDefinition, FailMode, LinkStyle } from '@/lib/engine'

interface Props {
  data: ProjectData
  selectedCircuitId: string | null
  onSelectCircuit: (id: string | null) => void
  currentCircuit: CircuitDefinition | null
  onAddNode: (circuitId: string, node: NodeDefinition) => void
  onUpdateNode: (circuitId: string, nodeId: string, updates: Partial<NodeDefinition>) => void
  onDeleteNode: (circuitId: string, nodeId: string) => void
  onAddLink: (circuitId: string, link: LinkDefinition) => void
  onUpdateLink: (circuitId: string, linkId: string, updates: Partial<LinkDefinition>) => void
  onDeleteLink: (circuitId: string, linkId: string) => void
}

export function TableEditor({
  data,
  selectedCircuitId,
  onSelectCircuit,
  currentCircuit,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  onAddLink,
  onUpdateLink,
  onDeleteLink,
}: Props) {
  const [activeTable, setActiveTable] = useState<'nodes' | 'links'>('nodes')

  // Fail die options (D3 to D20)
  const failDieOptions = Array.from({ length: 18 }, (_, i) => i + 3) // [3, 4, 5, ..., 20]

  // New node form state (ID is auto-generated)
  const [newNode, setNewNode] = useState<{
    name: string
    description: string
    level: number
    cd: number
    failDie: number
    criticalFailMode: FailMode
    rangeFailMode: FailMode
    rangeErrorMessage: string
    visibleByDefault: boolean
  }>({
    name: '',
    description: '',
    level: 0,
    cd: 11,  // Default, min is 4 (must be > 3)
    failDie: 4, // Default D4
    criticalFailMode: 'BLOQUEO',
    rangeFailMode: 'WARNING',
    rangeErrorMessage: '',
    visibleByDefault: true,
  })

  // New link form state (ID is auto-generated)
  const [newLink, setNewLink] = useState<{
    from: string
    to: string
    style: LinkStyle
    hidden: boolean
    bidirectional: boolean
  }>({
    from: '',
    to: '',
    style: 'solid',
    hidden: false,
    bidirectional: true,
  })

  // Generate unique IDs
  const generateNodeId = () => `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  const generateLinkId = () => `link-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`

  const handleAddNode = () => {
    if (!selectedCircuitId || !newNode.name) return
    const nodeWithId: NodeDefinition = {
      ...newNode,
      id: generateNodeId(),
    }
    onAddNode(selectedCircuitId, nodeWithId)
    setNewNode({
      name: '',
      description: '',
      level: 0,
      cd: 11,
      failDie: 4,
      criticalFailMode: 'BLOQUEO',
      rangeFailMode: 'WARNING',
      rangeErrorMessage: '',
      visibleByDefault: true,
    })
  }

  const handleAddLink = () => {
    if (!selectedCircuitId || !newLink.from || !newLink.to) return
    const linkWithId: LinkDefinition = {
      ...newLink,
      id: generateLinkId(),
    }
    onAddLink(selectedCircuitId, linkWithId)
    setNewLink({
      from: '',
      to: '',
      style: 'solid',
      hidden: false,
      bidirectional: true,
    })
  }

  return (
    <div className="space-y-4">
      {/* Circuit selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-400">Circuito:</label>
        <select
          value={selectedCircuitId || ''}
          onChange={(e) => onSelectCircuit(e.target.value || null)}
          className="flex-1 bg-cyber-darker border border-gray-700 rounded px-3 py-2 text-white focus:border-cyber-primary focus:outline-none"
        >
          <option value="">Seleccionar circuito...</option>
          {data.circuits.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.nodes.length} nodos, {c.links.length} enlaces)
            </option>
          ))}
        </select>
      </div>

      {!selectedCircuitId ? (
        <div className="text-center py-12 text-gray-500">
          Selecciona un circuito para editar sus nodos y enlaces
        </div>
      ) : !currentCircuit ? (
        <div className="text-center py-12 text-gray-500">
          Circuito no encontrado
        </div>
      ) : (
        <>
          {/* Table tabs */}
          <div className="flex gap-2 border-b border-gray-800">
            <button
              onClick={() => setActiveTable('nodes')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTable === 'nodes'
                  ? 'border-cyber-primary text-cyber-primary'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Nodos ({currentCircuit.nodes.length})
            </button>
            <button
              onClick={() => setActiveTable('links')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTable === 'links'
                  ? 'border-cyber-secondary text-cyber-secondary'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Enlaces ({currentCircuit.links.length})
            </button>
          </div>

          {/* Nodes table */}
          {activeTable === 'nodes' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-gray-400">
                    <th className="py-2 px-2">Nombre</th>
                    <th className="py-2 px-2">Level</th>
                    <th className="py-2 px-2">CD</th>
                    <th className="py-2 px-2 text-purple-400" title="Dado de fallo (D3-D20)">Dado</th>
                    <th className="py-2 px-2 text-red-400" title="Dado 1-2">Crítico</th>
                    <th className="py-2 px-2 text-yellow-400" title="Dado 3 a D">Rango</th>
                    <th className="py-2 px-2 text-yellow-400">Mensaje Error</th>
                    <th className="py-2 px-2">Visible</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {currentCircuit.nodes.map((node) => (
                    <tr key={node.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={node.name}
                          onChange={(e) => onUpdateNode(selectedCircuitId, node.id, { name: e.target.value })}
                          className="w-full bg-transparent border-b border-transparent hover:border-gray-600 focus:border-cyber-primary focus:outline-none px-1 py-0.5"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={node.level}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(10, parseInt(e.target.value) || 0))
                            onUpdateNode(selectedCircuitId, node.id, { level: val })
                          }}
                          className="w-16 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-cyber-primary focus:outline-none px-1 py-0.5 text-center"
                          min={0}
                          max={10}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={node.cd}
                          onChange={(e) => {
                            const val = Math.max(3, parseInt(e.target.value) || 3)
                            onUpdateNode(selectedCircuitId, node.id, { cd: val })
                          }}
                          className="w-16 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-cyber-primary focus:outline-none px-1 py-0.5 text-center"
                          min={3}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={node.failDie || 4}
                          onChange={(e) => onUpdateNode(selectedCircuitId, node.id, { failDie: parseInt(e.target.value) })}
                          className="bg-cyber-darker border border-purple-900 rounded px-2 py-1 text-xs"
                        >
                          {failDieOptions.map((d) => (
                            <option key={d} value={d}>D{d}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={node.criticalFailMode}
                          onChange={(e) => onUpdateNode(selectedCircuitId, node.id, { criticalFailMode: e.target.value as 'WARNING' | 'BLOQUEO' })}
                          className="bg-cyber-darker border border-red-900 rounded px-2 py-1 text-xs"
                        >
                          <option value="WARNING">WARNING</option>
                          <option value="BLOQUEO">BLOQUEO</option>
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={node.rangeFailMode}
                          onChange={(e) => onUpdateNode(selectedCircuitId, node.id, { rangeFailMode: e.target.value as 'WARNING' | 'BLOQUEO' })}
                          className="bg-cyber-darker border border-yellow-900 rounded px-2 py-1 text-xs"
                        >
                          <option value="WARNING">WARNING</option>
                          <option value="BLOQUEO">BLOQUEO</option>
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={node.rangeErrorMessage || ''}
                          onChange={(e) => onUpdateNode(selectedCircuitId, node.id, { rangeErrorMessage: e.target.value })}
                          placeholder="(warning genérico)"
                          className="w-full bg-transparent border-b border-transparent hover:border-yellow-600 focus:border-yellow-400 focus:outline-none px-1 py-0.5 text-yellow-400 placeholder:text-gray-600"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={node.visibleByDefault}
                          onChange={(e) => onUpdateNode(selectedCircuitId, node.id, { visibleByDefault: e.target.checked })}
                          className="rounded"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => onDeleteNode(selectedCircuitId, node.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Add new node row */}
                  <tr className="bg-gray-800/30">
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={newNode.name}
                        onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                        placeholder="Nombre"
                        className="w-full bg-cyber-darker border border-gray-700 rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        value={newNode.level}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(10, parseInt(e.target.value) || 0))
                          setNewNode({ ...newNode, level: val })
                        }}
                        className="w-16 bg-cyber-darker border border-gray-700 rounded px-2 py-1 text-sm text-center"
                        min={0}
                        max={10}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        value={newNode.cd}
                        onChange={(e) => {
                          const val = Math.max(3, parseInt(e.target.value) || 3)
                          setNewNode({ ...newNode, cd: val })
                        }}
                        className="w-16 bg-cyber-darker border border-gray-700 rounded px-2 py-1 text-sm text-center"
                        min={3}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={newNode.failDie}
                        onChange={(e) => setNewNode({ ...newNode, failDie: parseInt(e.target.value) })}
                        className="bg-cyber-darker border border-purple-900 rounded px-2 py-1 text-xs"
                      >
                        {failDieOptions.map((d) => (
                          <option key={d} value={d}>D{d}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={newNode.criticalFailMode}
                        onChange={(e) => setNewNode({ ...newNode, criticalFailMode: e.target.value as 'WARNING' | 'BLOQUEO' })}
                        className="bg-cyber-darker border border-red-900 rounded px-2 py-1 text-xs"
                      >
                        <option value="WARNING">WARNING</option>
                        <option value="BLOQUEO">BLOQUEO</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={newNode.rangeFailMode}
                        onChange={(e) => setNewNode({ ...newNode, rangeFailMode: e.target.value as 'WARNING' | 'BLOQUEO' })}
                        className="bg-cyber-darker border border-yellow-900 rounded px-2 py-1 text-xs"
                      >
                        <option value="WARNING">WARNING</option>
                        <option value="BLOQUEO">BLOQUEO</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={newNode.rangeErrorMessage}
                        onChange={(e) => setNewNode({ ...newNode, rangeErrorMessage: e.target.value })}
                        placeholder="(warning genérico)"
                        className="w-full bg-cyber-darker border border-gray-700 rounded px-2 py-1 text-sm text-yellow-400 placeholder:text-gray-600"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={newNode.visibleByDefault}
                        onChange={(e) => setNewNode({ ...newNode, visibleByDefault: e.target.checked })}
                        className="rounded"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <button
                        onClick={handleAddNode}
                        disabled={!newNode.name}
                        className="text-cyber-primary hover:text-cyber-primary/80 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Agregar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Links table */}
          {activeTable === 'links' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-gray-400">
                    <th className="py-2 px-2">ID</th>
                    <th className="py-2 px-2">Desde</th>
                    <th className="py-2 px-2">Hacia</th>
                    <th className="py-2 px-2">Estilo</th>
                    <th className="py-2 px-2">Oculto</th>
                    <th className="py-2 px-2">Bidirec.</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {currentCircuit.links.map((link) => (
                    <tr key={link.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-2 font-mono text-xs text-gray-400">{link.id}</td>
                      <td className="py-2 px-2">
                        <select
                          value={link.from}
                          onChange={(e) => onUpdateLink(selectedCircuitId, link.id, { from: e.target.value })}
                          className="bg-cyber-darker border border-gray-700 rounded px-2 py-1 text-xs"
                        >
                          {currentCircuit.nodes.map((n) => (
                            <option key={n.id} value={n.id}>{n.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={link.to}
                          onChange={(e) => onUpdateLink(selectedCircuitId, link.id, { to: e.target.value })}
                          className="bg-cyber-darker border border-gray-700 rounded px-2 py-1 text-xs"
                        >
                          {currentCircuit.nodes.map((n) => (
                            <option key={n.id} value={n.id}>{n.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={link.style}
                          onChange={(e) => onUpdateLink(selectedCircuitId, link.id, { style: e.target.value as 'solid' | 'dashed' | 'dotted' })}
                          className="bg-cyber-darker border border-gray-700 rounded px-2 py-1 text-xs"
                        >
                          <option value="solid">Solido</option>
                          <option value="dashed">Guiones</option>
                          <option value="dotted">Puntos</option>
                        </select>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={link.hidden}
                          onChange={(e) => onUpdateLink(selectedCircuitId, link.id, { hidden: e.target.checked })}
                          className="rounded"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={link.bidirectional !== false}
                          onChange={(e) => onUpdateLink(selectedCircuitId, link.id, { bidirectional: e.target.checked })}
                          className="rounded"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => onDeleteLink(selectedCircuitId, link.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Add new link row */}
                  <tr className="bg-gray-800/30">
                    <td className="py-2 px-2">
                      <span className="text-xs text-gray-500 italic">Auto</span>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={newLink.from}
                        onChange={(e) => setNewLink({ ...newLink, from: e.target.value })}
                        className="w-full bg-cyber-darker border border-gray-700 rounded px-2 py-1 text-xs"
                      >
                        <option value="">Seleccionar...</option>
                        {currentCircuit.nodes.map((n) => (
                          <option key={n.id} value={n.id}>{n.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={newLink.to}
                        onChange={(e) => setNewLink({ ...newLink, to: e.target.value })}
                        className="w-full bg-cyber-darker border border-gray-700 rounded px-2 py-1 text-xs"
                      >
                        <option value="">Seleccionar...</option>
                        {currentCircuit.nodes.map((n) => (
                          <option key={n.id} value={n.id}>{n.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={newLink.style}
                        onChange={(e) => setNewLink({ ...newLink, style: e.target.value as 'solid' | 'dashed' | 'dotted' })}
                        className="bg-cyber-darker border border-gray-700 rounded px-2 py-1 text-xs"
                      >
                        <option value="solid">Solido</option>
                        <option value="dashed">Guiones</option>
                        <option value="dotted">Puntos</option>
                      </select>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={newLink.hidden}
                        onChange={(e) => setNewLink({ ...newLink, hidden: e.target.checked })}
                        className="rounded"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={newLink.bidirectional}
                        onChange={(e) => setNewLink({ ...newLink, bidirectional: e.target.checked })}
                        className="rounded"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <button
                        onClick={handleAddLink}
                        disabled={!newLink.from || !newLink.to}
                        className="text-cyber-secondary hover:text-cyber-secondary/80 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Agregar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
