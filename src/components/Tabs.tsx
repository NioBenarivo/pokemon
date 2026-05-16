// ─────────────────────────────────────────────────────────────
// components/Tabs.tsx
//
// The "All Cards" / "My Binder" tab switcher at the top of the page.
//
// The active tab gets a white pill with a shadow.
// The inactive tab is plain grey text.
//
// The "My Binder" tab shows a count badge (e.g. "My Binder 18")
// when the user has at least one card in their binder.
// ─────────────────────────────────────────────────────────────

import { TABS } from '../constants/strings'

interface Props {
  active: 'all' | 'binder'                    // which tab is currently selected
  binderCount: number                          // number of owned cards (for the badge)
  onChange: (tab: 'all' | 'binder') => void   // called when a tab is clicked
}

export default function Tabs({ active, binderCount, onChange }: Props) {
  const base = 'flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200'
  const activeStyle = 'bg-white text-zinc-900 shadow-sm'
  const inactiveStyle = 'text-zinc-500 hover:text-zinc-700'

  return (
    <div className="flex bg-zinc-100 rounded-xl p-1 mb-6">
      <button
        onClick={() => onChange('all')}
        className={`${base} ${active === 'all' ? activeStyle : inactiveStyle}`}
      >
        {TABS.ALL}
      </button>
      <button
        onClick={() => onChange('binder')}
        className={`${base} ${active === 'binder' ? activeStyle : inactiveStyle}`}
      >
        {TABS.BINDER}
        {binderCount > 0 && (
          <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full
            ${active === 'binder' ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-200 text-zinc-500'}`}>
            {binderCount}
          </span>
        )}
      </button>
    </div>
  )
}
