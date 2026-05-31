import Spinner from './Spinner'

export default function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="bg-white min-h-screen flex flex-col items-center justify-center gap-3">
      <Spinner />
      <p className="text-zinc-400 text-sm tracking-wide">{message}</p>
    </div>
  )
}
