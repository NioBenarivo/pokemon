interface Props {
  searchQuery: string
  onSearchChange: (value: string) => void
  availablePacks: string[]
  selectedPack: string | null
  onPackChange: (pack: string | null) => void
}

export default function SearchFilter({
  searchQuery,
  onSearchChange,
  availablePacks,
  selectedPack,
  onPackChange,
}: Props) {
  return (
    <div className="mb-4 flex gap-2">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search cards..."
          className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {availablePacks.length > 1 && (
        <select
          id='filter-pack'
          value={selectedPack ?? ''}
          onChange={e => onPackChange(e.target.value || null)}
          className="py-2 px-3 text-sm rounded-lg border border-zinc-200 text-zinc-700 bg-white focus:outline-none focus:border-zinc-400 transition-colors appearance-none cursor-pointer shrink-0"
        >
          <option value="">All packs</option>
          {availablePacks.map(pack => (
            <option key={pack} value={pack}>{pack}</option>
          ))}
        </select>
      )}
    </div>
  )
}
