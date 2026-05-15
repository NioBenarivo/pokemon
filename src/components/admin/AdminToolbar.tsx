interface Props {
  search: string
  onSearchChange: (value: string) => void
  totalCount: number
  filteredCount: number
  onNewCard: () => void
}

export default function AdminToolbar({ search, onSearchChange, totalCount, filteredCount, onNewCard }: Props) {
  const isFiltering = search.trim().length > 0

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search by name or pack..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
          />
        </div>
        <button
          onClick={onNewCard}
          className="text-sm font-semibold text-white bg-zinc-900 px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors shrink-0"
        >
          + New Card
        </button>
      </div>

      <p className="text-zinc-500 text-sm mb-4">
        {isFiltering
          ? <><span className="text-zinc-900 font-semibold">{filteredCount}</span> of <span className="text-zinc-900 font-semibold">{totalCount}</span> cards</>
          : <><span className="text-zinc-900 font-semibold">{totalCount}</span> cards total</>
        }
      </p>
    </>
  )
}
