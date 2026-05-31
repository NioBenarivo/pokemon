interface Props {
  count: number
  adding: boolean
  onCancel: () => void
  onWishlist: () => void
  onAddToBinder: () => void
}

export default function SelectActionBar({ count, adding, onCancel, onWishlist, onAddToBinder }: Props) {
  return (
    <div className="flex items-center justify-between mb-4 px-4 py-3 bg-zinc-50 rounded-xl">
      <span className="text-sm text-zinc-600">
        {count} card{count !== 1 ? 's' : ''} selected
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="text-xs text-zinc-400 hover:text-zinc-700 px-3 py-1.5 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onWishlist}
          disabled={adding}
          className="text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          {adding ? '...' : '♡ Wishlist'}
        </button>
        <button
          onClick={onAddToBinder}
          disabled={adding}
          className="text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          {adding ? 'Adding...' : 'Add to Binder'}
        </button>
      </div>
    </div>
  )
}
