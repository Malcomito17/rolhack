'use client'

import type { EditorTab } from '../editor-container'

interface Props {
  activeTab: EditorTab
  onTabChange: (tab: EditorTab) => void
}

const TABS: { id: EditorTab; label: string; description: string }[] = [
  { id: 'visual', label: 'Visual', description: 'Editor visual de nodos' },
  { id: 'table', label: 'Tabla', description: 'Edicion en tabla' },
  { id: 'json', label: 'JSON', description: 'Edicion avanzada' },
]

export function TabNavigation({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex gap-1 bg-cyber-dark/50 border border-gray-800 rounded-lg p-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${
              activeTab === tab.id
                ? 'bg-cyber-primary/20 text-cyber-primary border border-cyber-primary/30'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
            }
          `}
          title={tab.description}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
