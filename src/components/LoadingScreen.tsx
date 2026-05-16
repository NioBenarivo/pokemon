// ─────────────────────────────────────────────────────────────
// components/LoadingScreen.tsx
//
// A full-screen centered loading message.
// Shown by App.tsx during two moments:
//   1. While checking if the user is logged in (auth loading)
//   2. While the first batch of cards is being fetched
//
// Also used by AdminPage while the card list loads.
// ─────────────────────────────────────────────────────────────

export default function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="bg-white min-h-screen flex items-center justify-center">
      <p className="text-zinc-400 text-sm tracking-wide">{message}</p>
    </div>
  )
}
