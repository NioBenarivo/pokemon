// ─────────────────────────────────────────────────────────────
// components/Footer.tsx
//
// A small hint text at the bottom: "Hold a card to select it..."
//
// Only visible on the "All Cards" tab when nothing is selected yet.
// It disappears once the user enters select mode (selectedCount > 0)
// or switches to the Binder tab — both cases where the hint is unnecessary.
// ─────────────────────────────────────────────────────────────

import { FOOTER } from '../constants/strings'

interface Props {
  activeTab: 'all' | 'binder'
  selectedCount: number
}

export default function Footer({ activeTab, selectedCount }: Props) {
  // Hide on the Binder tab, and hide once the user starts selecting cards
  if (activeTab !== 'all' || selectedCount > 0) return null

  return (
    <p className="text-center text-zinc-400 text-xs mt-5 tracking-wide">
      {FOOTER.HINT}
    </p>
  )
}
