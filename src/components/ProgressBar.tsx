interface Props {
  owned: number
  total: number | null
}

export default function ProgressBar({ owned, total }: Props) {
  const pct = total ? Math.min(100, Math.round((owned / total) * 100)) : 0

  const barColor =
    pct === 100 ? 'bg-green-500' :
    pct >= 50   ? 'bg-green-300' :
    pct >= 20   ? 'bg-yellow-300' :
                  'bg-zinc-400'

  return (
    <div className="mt-2.5">
      <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
        <span>{owned} / {total ?? '?'} cards</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
