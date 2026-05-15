import { useState, useEffect, useRef } from 'react'
import { type Card } from '../../data/cards'
import { type CardInput } from '../../hooks/useAdminCards'

interface Props {
  card: Card | null
  onSave: (input: CardInput) => Promise<unknown>
  onClose: () => void
}

const EMPTY: CardInput = { name: '', pack: '', image: '' }

async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const filename = `${Date.now()}.${ext}`

  const formData = new FormData()
  formData.append('file', file)
  formData.append('filename', filename)

  const res = await fetch(import.meta.env.VITE_WORKER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${import.meta.env.VITE_UPLOAD_SECRET}` },
    body: formData,
  })

  if (!res.ok) throw new Error('Upload failed')

  const { path } = await res.json()
  return path
}

export default function CardFormModal({ card, onSave, onClose }: Props) {
  const [form, setForm] = useState<CardInput>(EMPTY)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setForm(card ? { name: card.name, pack: card.pack, image: card.image } : EMPTY)
    setFile(null)
    setPreview(null)
    setError(null)
  }, [card])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    setPreview(selected ? URL.createObjectURL(selected) : null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.pack.trim()) {
      setError('Name and pack are required.')
      return
    }
    if (!file && !form.image.trim()) {
      setError('Please upload an image or provide an image path.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      let imagePath = form.image

      if (file) {
        imagePath = await uploadImage(file)
      }

      const err = await onSave({ ...form, image: imagePath })
      if (err) {
        setError((err as { message?: string }).message ?? 'Something went wrong.')
      } else {
        onClose()
      }
    } catch {
      setError('Image upload failed. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-zinc-900 font-bold text-lg mb-5">
          {card ? 'Edit Card' : 'New Card'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: 'Name', name: 'name', placeholder: 'e.g. Charizard' },
            { label: 'Pack', name: 'pack', placeholder: 'e.g. Base Set' },
          ].map(({ label, name, placeholder }) => (
            <div key={name}>
              <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
              <input
                name={name}
                value={form[name as keyof CardInput]}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
          ))}

          {/* Image upload */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Image</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-zinc-200 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:border-zinc-400 transition-colors"
            >
              {preview ? (
                <img src={preview} alt="Preview" className="h-24 object-contain" />
              ) : form.image ? (
                <p className="text-xs text-zinc-400 font-mono text-center break-all">{form.image}</p>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-zinc-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-xs text-zinc-400">Click to upload image</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {(preview || form.image) && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Change image
              </button>
            )}
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (file ? 'Uploading...' : 'Saving...') : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
