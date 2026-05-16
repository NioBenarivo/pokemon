import { useEffect } from 'react'

export interface ToastMessage {
  id: number
  message: string
  type: 'success' | 'error'
}

interface Props {
  toasts: ToastMessage[]
  onRemove: (id: number) => void
}

export default function Toast({ toasts, onRemove }: Props) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 3000)
    return () => clearTimeout(t)
  }, [toast.id])

  return (
    <div
      className={[
        'px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white',
        'animate-fade-in-up',
        toast.type === 'success' ? 'bg-zinc-800' : 'bg-red-500',
      ].join(' ')}
    >
      {toast.message}
    </div>
  )
}