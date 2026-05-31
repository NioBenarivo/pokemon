import { AUTH } from '../constants/strings'

interface Props {
  title: string
  subtitle?: string
  onSignOut: () => void
}

export default function Header({ title, subtitle, onSignOut }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-400">{subtitle}</p>}
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
