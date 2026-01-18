'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type SortField = 'date' | 'name' | 'user'
type SortOrder = 'asc' | 'desc'

interface Props {
  showUserSort?: boolean
}

export function RunSortControls({ showUserSort = false }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSort = (searchParams.get('sort') as SortField) || 'date'
  const currentOrder = (searchParams.get('order') as SortOrder) || 'desc'

  const handleSortChange = (field: SortField) => {
    const params = new URLSearchParams(searchParams.toString())

    if (currentSort === field) {
      // Toggle order if same field
      params.set('order', currentOrder === 'desc' ? 'asc' : 'desc')
    } else {
      // New field, default order
      params.set('sort', field)
      params.set('order', field === 'name' || field === 'user' ? 'asc' : 'desc')
    }

    router.push(`?${params.toString()}`)
  }

  const getSortIcon = (field: SortField) => {
    if (currentSort !== field) return null
    return currentOrder === 'asc' ? '↑' : '↓'
  }

  const getButtonClass = (field: SortField) => {
    const base = 'px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1'
    if (currentSort === field) {
      return `${base} bg-cyber-primary/20 text-cyber-primary border border-cyber-primary/30`
    }
    return `${base} bg-gray-800/50 text-gray-400 hover:text-gray-300 border border-gray-700 hover:border-gray-600`
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-500 text-xs">Ordenar:</span>
      <button
        onClick={() => handleSortChange('date')}
        className={getButtonClass('date')}
      >
        Fecha {getSortIcon('date')}
      </button>
      <button
        onClick={() => handleSortChange('name')}
        className={getButtonClass('name')}
      >
        Nombre {getSortIcon('name')}
      </button>
      {showUserSort && (
        <button
          onClick={() => handleSortChange('user')}
          className={getButtonClass('user')}
        >
          Usuario {getSortIcon('user')}
        </button>
      )}
    </div>
  )
}
