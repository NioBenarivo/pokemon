import { type Card } from '../../data/cards'

interface Props {
  cards: Card[]
  onEdit: (card: Card) => void
  onDelete: (card: Card) => void
}

export default function CardTable({ cards, onEdit, onDelete }: Props) {
  if (cards.length === 0) {
    return (
      <p className="text-center text-zinc-400 text-sm py-10">No cards yet. Create one above.</p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="w-full text-sm text-left">
        <thead className="bg-zinc-50 border-b border-zinc-200">
          <tr>
            {['ID', 'Name', 'Pack', 'Image path', 'Actions'].map(col => (
              <th key={col} className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {cards.map(card => (
            <tr key={card.id} className="hover:bg-zinc-50 transition-colors">
              <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{card.id}</td>
              <td className="px-4 py-3 text-zinc-800 font-medium">{card.name}</td>
              <td className="px-4 py-3 text-zinc-500">{card.pack}</td>
              <td className="px-4 py-3 text-zinc-400 font-mono text-xs max-w-[200px] truncate">{card.image}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(card)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Edit
                  </button>
                  <span className="text-zinc-200">|</span>
                  <button
                    onClick={() => onDelete(card)}
                    className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
