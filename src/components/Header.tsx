import { AUTH } from '../constants/strings'

interface Props {
  title: string
  subtitle?: string
  onSignOut: () => void
  onBack?: () => void
}

export default function Header({ title, subtitle, onSignOut, onBack }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="text-zinc-400 hover:text-zinc-700 transition-colors -ml-1 p-1"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-400">{subtitle}</p>}
        </div>
      </div>
      <button
        onClick={onSignOut}
        className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors duration-150"
      >
        {AUTH.SIGN_OUT}
      </button>
    </div>
  )
}
