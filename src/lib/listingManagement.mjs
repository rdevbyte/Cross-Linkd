/** Claiming is available only for live, unowned listings that have not been claimed. */
export function isListingClaimable(listing) {
  return Boolean(
    listing
    && listing.status === 'published'
    && !listing.deletedAt
    && !listing.ownerId
    && !listing.isClaimed,
  );
}
