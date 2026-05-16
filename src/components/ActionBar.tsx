// ─────────────────────────────────────────────────────────────
// components/ActionBar.tsx
//
// The contextual bar that appears when the user selects cards.
// It's hidden when no cards are selected (returns null).
//
// It adapts based on which tab is active:
//
//   "All Cards" tab → blue bar with "Add to Binder" button
//   "My Binder" tab → red bar with "Remove from Binder" button
//
// Example flow:
//   1. User long-presses a card → selectMode becomes true
//   2. ActionBar appears with "Select cards" + cancel button
//   3. User taps more cards → selectedCount increases
//   4. User taps "Add to Binder" → onAdd() fires → cards are saved
//   5. ActionBar disappears (selectedCount resets to 0)
// ─────────────────────────────────────────────────────────────

import { ACTION_BAR } from '../constants/strings'

interface Props {
  selectedCount: number          // how many cards are currently selected
  activeTab: 'all' | 'binder'   // controls whether to show Add or Remove
  adding: boolean                // true while the save is in progress (disables the button)
  selectMode: boolean            // true once at least one card has been long-pressed
  onAdd: () => void              // called when "Add to Binder" is tapped
  onRemove: () => void           // called when "Remove from Binder" is tapped
  onCancel: () => void           // called when the X button is tapped (exits select mode)
}

export default function ActionBar({ selectedCount, activeTab, adding, selectMode, onAdd, onRemove, onCancel }: Props) {
  if (!selectMode && selectedCount === 0) return null

  const isAdd = activeTab === 'all'

  return (
    <div className={`flex items-center justify-between border rounded-xl px-4 py-3 mb-4 ${
      isAdd ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          aria-label="Cancel selection"
          className="text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p className={`text-sm font-medium ${isAdd ? 'text-blue-700' : 'text-red-700'}`}>
          {selectedCount === 0 ? ACTION_BAR.SELECT_PROMPT : ACTION_BAR.selectedLabel(selectedCount)}
        </p>
      </div>
      <button
        onClick={isAdd ? onAdd : onRemove}
        disabled={adding || selectedCount === 0}
        className={`text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors duration-150 ${
          isAdd ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-500 hover:bg-red-600'
        }`}
      >
        {adding
          ? isAdd ? ACTION_BAR.ADDING : ACTION_BAR.REMOVING
          : isAdd ? ACTION_BAR.ADD : ACTION_BAR.REMOVE}
      </button>
    </div>
  )
}
