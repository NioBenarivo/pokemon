interface Props {
  selectedCount: number
  activeTab: 'all' | 'binder'
  adding: boolean
  selectMode: boolean
  onAdd: () => void
  onRemove: () => void
  onCancel: () => void
}

export default function ActionBar({ selectedCount, activeTab, adding, selectMode, onAdd, onRemove, onCancel }: Props) {
  if (!selectMode && selectedCount === 0) return null

  const isAdd = activeTab === 'all'

  return (
    <div className={`flex items-center justify-between border rounded-xl px-4 py-3 mb-4 ${
      isAdd ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          aria-label="Cancel selection"
          className="text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p className={`text-sm font-medium ${isAdd ? 'text-blue-700' : 'text-red-700'}`}>
          {selectedCount === 0 ? 'Select cards' : `${selectedCount} card${selectedCount !== 1 ? 's' : ''} selected`}
        </p>
      </div>
      <button
        onClick={isAdd ? onAdd : onRemove}
        disabled={adding || selectedCount === 0}
        className={`text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors duration-150 ${
          isAdd ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-500 hover:bg-red-600'
        }`}
      >
        {adding
          ? isAdd ? 'Adding...' : 'Removing...'
          : isAdd ? 'Add to Binder' : 'Remove from Binder'}
      </button>
    </div>
  )
}
