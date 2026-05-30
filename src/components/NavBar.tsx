import { NavLink } from 'react-router-dom'

const nav = [
  {
    to: '/pokemon',
    label: 'Pokémon',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <circle cx="12" cy="12" r="9" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    to: '/cards',
    label: 'Cards',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <rect x="3" y="6" width="13" height="17" rx="2" />
        <path d="M7 3h11a2 2 0 012 2v14" />
      </svg>
    ),
  },
  {
    to: null,
    label: 'Packs',
    disabled: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      </svg>
    ),
  },
  {
    to: '/binder',
    label: 'Binder',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 2h12a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 2v20M9 7h7M9 12h7M9 17h4" />
      </svg>
    ),
  },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-100 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
      <div className="max-w-4xl mx-auto flex items-stretch">
        {nav.map(item => {
          if (item.disabled) {
            return (
              <div
                key={item.label}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-zinc-300 cursor-not-allowed select-none"
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            )
          }

          return (
            <NavLink
              key={item.label}
              to={item.to!}
              className={({ isActive }) => [
                'flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors',
                isActive ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600',
              ].join(' ')}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
