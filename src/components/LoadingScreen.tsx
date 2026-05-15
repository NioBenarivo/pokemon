export default function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="bg-white min-h-screen flex items-center justify-center">
      <p className="text-zinc-400 text-sm tracking-wide">{message}</p>
    </div>
  )
}
