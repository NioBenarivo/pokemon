interface Props {
  activeTab: 'all' | 'binder'
  selectedCount: number
}

export default function Footer({ activeTab, selectedCount }: Props) {
  if (activeTab !== 'all' || selectedCount > 0) return null

  return (
    <p className="text-center text-zinc-400 text-xs mt-5 tracking-wide">
      Hold a card to select it, then tap Add to Binder
    </p>
  )
}
