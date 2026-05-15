interface Props {
  ownedCount: number
  totalCount: number
  currentPage: number
  totalPages: number
}

export default function StatsBar({ ownedCount, totalCount, currentPage, totalPages }: Props) {
  return (
    <div className="flex items-center justify-between mb-4 px-0.5">
      <p className="text-zinc-500 text-xs">
        <span className="text-zinc-900 font-semibold">{ownedCount}</span>
        <span className="text-zinc-300"> / </span>
        <span className="text-zinc-500 font-semibold">{totalCount}</span>
        <span className="text-zinc-400"> collected</span>
      </p>
      <p className="text-zinc-500 text-xs">
        Page{' '}
        <span className="text-zinc-900 font-semibold">{currentPage}</span>
        <span className="text-zinc-300"> of </span>
        <span className="text-zinc-500 font-semibold">{totalPages}</span>
      </p>
    </div>
  )
}
