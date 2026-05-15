interface Props {
  username: string
  onSignOut: () => void
}

export default function Header({ username, onSignOut }: Props) {
  return (
    <header className="text-center mb-7 relative">
      <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Collection</p>
      <h1 className="text-zinc-900 text-2xl font-bold tracking-tight">
        Pokémon Wishlist Binder
      </h1>
      <p className="text-zinc-400 text-xs mt-1">{username}'s binder</p>
      <button
        onClick={onSignOut}
        className="absolute right-0 top-0 text-xs text-zinc-400
                   hover:text-zinc-700 transition-colors duration-150"
      >
        Sign out
      </button>
    </header>
  )
}
