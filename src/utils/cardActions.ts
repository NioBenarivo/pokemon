import { getActiveBinder } from '../hooks/useBinders'

export async function addToBinder(
  cardId: string,
  addMultiple: (ids: string[], binderId?: string) => Promise<boolean>,
  wishlist: Set<string>,
  removeFromWishlist: (ids: string[]) => Promise<void>,
  showToast: (msg: string) => void,
) {
  const activeBinder = getActiveBinder()
  if (!activeBinder) { showToast('Open a binder first'); return }
  const ok = await addMultiple([cardId], activeBinder)
  if (ok && wishlist.has(cardId)) await removeFromWishlist([cardId])
  showToast('Added to binder ✓')
}
