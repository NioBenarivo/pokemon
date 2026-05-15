interface Props {
  currentPage: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
  onGoToPage: (page: number) => void
}

const btnBase =
  'px-5 py-2 rounded-lg bg-white text-zinc-700 text-sm font-medium border border-zinc-200 ' +
  'hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150'

export default function Pagination({
  currentPage,
  totalPages,
  onPrev,
  onNext,
  onGoToPage,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-5 mt-7">
      <button onClick={onPrev} disabled={currentPage === 1} className={btnBase}>
        ← Prev
      </button>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => onGoToPage(i + 1)}
            className={[
              'rounded-full transition-all duration-200 focus:outline-none',
              i + 1 === currentPage
                ? 'w-4 h-2 bg-zinc-800'
                : 'w-2 h-2 bg-zinc-300 hover:bg-zinc-400',
            ].join(' ')}
          />
        ))}
      </div>

      <button onClick={onNext} disabled={currentPage === totalPages} className={btnBase}>
        Next →
      </button>
    </div>
  )
}
