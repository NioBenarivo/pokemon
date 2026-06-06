import { getActiveBinder } from '../hooks/useBinders'

export async function addToBinder(
  cardId: string,
  addMultiple: (ids: string[], binderId?: string) => Promise<true | 'full' | 'error'>,
  wishlist: Set<string>,
  removeFromWishlist: (ids: string[]) => Promise<void>,
  showToast: (msg: string) => void,
) {
  const activeBinder = getActiveBinder()
  if (!activeBinder) { showToast('Open a binder first'); return }
  const result = await addMultiple([cardId], activeBinder)
  if (result === 'full') { showToast('Binder is full (max 540 cards)'); return }
  if (result === 'error') { showToast('Failed to add card. Please try again.'); return }
  if (wishlist.has(cardId)) await removeFromWishlist([cardId])
  showToast('Added to binder ✓')
}
