// ─────────────────────────────────────────────────────────────
// components/StatsBar.tsx
//
// Displays the user's collection progress as "X / Y collected".
//
//   ownedCount — how many cards are in the user's binder
//   totalCount — the total number of cards in the database
//
// Example output: "18 / 120 collected"
// ─────────────────────────────────────────────────────────────

interface Props {
  ownedCount: number   // cards in the user's binder
  totalCount: number   // all cards in the database
}

export default function StatsBar({ ownedCount, totalCount }: Props) {
  return (
    <div className="flex items-center justify-between mb-4 px-0.5">
      <p className="text-zinc-500 text-xs">
        <span className="text-zinc-900 font-semibold">{ownedCount}</span>
        <span className="text-zinc-300"> / </span>
        <span className="text-zinc-500 font-semibold">{totalCount}</span>
        <span className="text-zinc-400"> collected</span>
      </p>
    </div>
  )
}
