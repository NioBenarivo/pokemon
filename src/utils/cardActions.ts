export async function addToBinder(
  cardId: string,
  addMultiple: (ids: string[]) => Promise<boolean>,
  wishlist: Set<string>,
  removeFromWishlist: (ids: string[]) => Promise<void>,
  showToast: (msg: string) => void,
) {
  const ok = await addMultiple([cardId])
  if (ok && wishlist.has(cardId)) await removeFromWishlist([cardId])
  showToast('Added to binder ✓')
}
