import { useEffect } from 'react'
import type { Binder } from '../hooks/useBinders'

interface Props {
  binders: Binder[]
  onSelect: (binderId: string) => void
  onClose: () => void
}

export default function BinderPickerModal({ binders, onSelect, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 pb-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-800 text-center">Choose a Binder</h2>
        </div>
        <ul className="max-h-60 overflow-y-auto">
          {binders.map(binder => (
            <li key={binder.id}>
              <button
                onClick={() => onSelect(binder.id)}
                className="w-full text-left px-5 py-3.5 text-sm text-zinc-800 hover:bg-zinc-50 active:bg-zinc-100 transition-colors flex items-center gap-3"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-zinc-400 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6.75A2.75 2.75 0 014.75 4h14.5A2.75 2.75 0 0122 6.75v10.5A2.75 2.75 0 0119.25 20H4.75A2.75 2.75 0 012 17.25V6.75z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                </svg>
                {binder.name}
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-zinc-100">
          <button
            onClick={onClose}
            className="w-full px-5 py-3.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
