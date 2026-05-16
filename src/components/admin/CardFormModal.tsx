// ─────────────────────────────────────────────────────────────
// components/admin/CardFormModal.tsx
//
// A modal dialog for creating or editing a card.
// Used for both operations — which mode it's in depends on
// whether a "card" prop is provided:
//
//   card = null       → Create mode ("New Card" title, empty form)
//   card = { ... }   → Edit mode   ("Edit Card" title, form pre-filled)
//
// Image handling:
//   The admin can either upload an image file OR type a path manually.
//   If a file is selected, it's uploaded to Cloudflare R2 via a Worker
//   (a small server-side function) before the card is saved.
//   The Worker returns the file's storage path, which is then saved
//   to the database as card.image.
//
// Flow for creating a card with an uploaded image:
//   1. Admin fills in name + pack, selects an image file
//   2. Clicks Save
//   3. uploadImage() sends the file to the Worker
//   4. Worker stores it in R2, returns the path (e.g. "cards/1234567890.webp")
//   5. onSave() is called with { name, pack, image: "cards/1234567890.webp" }
//   6. Modal closes
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { CARD_FORM } from '../../constants/strings'
import { type Card } from '../../data/cards'
import { type CardInput } from '../../hooks/useAdminCards'

interface Props {
  card: Card | null                               // null = create mode, Card = edit mode
  onSave: (input: CardInput) => Promise<unknown>  // returns an error object or null
  onClose: () => void
}

// The default empty form state for "New Card" mode
const EMPTY: CardInput = { name: '', pack: '', image: '' }


// Uploads an image file to Cloudflare R2 via a Cloudflare Worker.
//
// Why a Worker? Uploading directly to R2 from the browser would require
// exposing secret credentials in client-side code — a security risk.
// Instead, the upload goes through our Worker (a server function) which
// holds the secret and proxies the upload securely.
//
// The filename is based on Date.now() (current timestamp in ms) to ensure
// every uploaded file has a unique name and doesn't overwrite another.
//
// Returns the file's path in R2 (e.g. "cards/1703123456789.webp").
async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()        // extract extension, e.g. "webp"
  const filename = `${Date.now()}.${ext}`       // unique name, e.g. "1703123456789.webp"

  // FormData is how you send files over HTTP — it encodes the file as
  // multipart/form-data, which the Worker knows how to read.
  const formData = new FormData()
  formData.append('file', file)
  formData.append('filename', filename)

  const res = await fetch(import.meta.env.VITE_WORKER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${import.meta.env.VITE_UPLOAD_SECRET}` }, // auth token so only admins can upload
    body: formData,
  })

  if (!res.ok) throw new Error('Upload failed')

  // The Worker responds with JSON: { path: "cards/1703123456789.webp" }
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

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    setPreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return selected ? URL.createObjectURL(selected) : null
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.pack.trim()) {
      setError(CARD_FORM.ERROR_REQUIRED)
      return
    }
    if (!file && !form.image.trim()) {
      setError(CARD_FORM.ERROR_IMAGE)
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
        setError((err as { message?: string }).message ?? CARD_FORM.ERROR_GENERIC)
      } else {
        onClose()
      }
    } catch {
      setError(CARD_FORM.ERROR_UPLOAD)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-zinc-900 font-bold text-lg mb-5">
          {card ? CARD_FORM.TITLE_EDIT : CARD_FORM.TITLE_CREATE}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: CARD_FORM.NAME_LABEL, name: 'name', placeholder: CARD_FORM.NAME_PLACEHOLDER },
            { label: CARD_FORM.PACK_LABEL, name: 'pack', placeholder: CARD_FORM.PACK_PLACEHOLDER },
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
            <label className="block text-xs font-medium text-zinc-500 mb-1">{CARD_FORM.IMAGE_LABEL}</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-zinc-200 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:border-zinc-400 transition-colors min-h-64"
            >
              {preview ? (
                <img src={preview} alt="Preview" className="max-h-56 object-contain" />
              ) : form.image ? (
                <p className="text-xs text-zinc-400 font-mono text-center break-all">{form.image}</p>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-zinc-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-xs text-zinc-400">{CARD_FORM.IMAGE_UPLOAD_HINT}</p>
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
                {CARD_FORM.IMAGE_CHANGE}
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
              {CARD_FORM.CANCEL}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (file ? CARD_FORM.UPLOADING : CARD_FORM.SAVING) : CARD_FORM.SAVE}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
