interface Props {
  selectedCount: number
  activeTab: 'all' | 'binder'
  adding: boolean
  onAdd: () => void
  onRemove: () => void
}

export default function ActionBar({ selectedCount, activeTab, adding, onAdd, onRemove }: Props) {
  if (selectedCount === 0) return null

  const isAdd = activeTab === 'all'

  return (
    <div className={`flex items-center justify-between border rounded-xl px-4 py-3 mb-4 ${
      isAdd ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
    }`}>
      <p className={`text-sm font-medium ${isAdd ? 'text-blue-700' : 'text-red-700'}`}>
        {selectedCount} card{selectedCount !== 1 ? 's' : ''} selected
      </p>
      <button
        onClick={isAdd ? onAdd : onRemove}
        disabled={adding}
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
