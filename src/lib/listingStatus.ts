/**
 * Listing status transitions for owner saves.
 *
 * Product policy (unchanged): a new listing saved with the default `publish`
 * action goes live immediately, `submit` / `resubmit` send it to moderation and
 * `draft` keeps it private.
 *
 * Hardening: an owner save must never lift a listing out of a state a moderator
 * put it in. Before this rule existed, PATCH `/api/listings/[id]` defaulted to
 * `publish`, so an owner whose listing had been rejected (or had changes
 * requested, or was suspended) could simply re-publish it with one request.
 * Those states can only be left through an explicit `resubmit` (moderation
 * again) or an admin decision.
 */
export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'suspended'
  | 'archived'
  | 'rejected'
  | 'changes_requested';

export type SaveAction = 'publish' | 'draft' | 'save' | 'submit' | 'resubmit';

/** States an owner cannot leave by saving (only moderation / an explicit resubmit can). */
const HELD: ReadonlySet<ListingStatus> = new Set(['pending_review', 'rejected', 'changes_requested', 'suspended', 'archived']);
/** States an owner cannot leave at all, not even by resubmitting. */
const LOCKED: ReadonlySet<ListingStatus> = new Set(['suspended', 'archived']);

export function resolveSaveStatus(action: SaveAction | undefined, current?: ListingStatus | null): ListingStatus {
  // Saving as a draft never changes the status of an existing listing.
  if (action === 'draft') return current ?? 'draft';

  if (action === 'submit' || action === 'resubmit') {
    if (current && LOCKED.has(current)) return current;
    return 'pending_review';
  }

  // publish | save | (missing): goes live for new/draft/published listings only.
  if (current && HELD.has(current)) return current;
  return 'published';
}
