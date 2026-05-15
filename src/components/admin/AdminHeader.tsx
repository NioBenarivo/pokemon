interface Props {
  onSignOut: () => void
}

export default function AdminHeader({ onSignOut }: Props) {
  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-zinc-900 text-2xl font-bold tracking-tight">Card Management</h1>
      </div>
      <button
        onClick={onSignOut}
        className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
      >
        Sign out
      </button>
    </header>
  )
}
