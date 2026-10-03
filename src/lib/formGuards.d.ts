export function honeypotTripped(value: unknown): boolean;
export function faithIdentityReason(input: {
  denominations?: string[] | null;
  customDenomination?: string | null;
  statementOfFaith?: string | null;
}): string;
export function publishBlockReason(input: {
  user?: { id?: string } | null;
  email?: string | null;
  city?: string | null;
  region?: string | null;
  isOnlineOnly?: boolean;
  denominations?: string[] | null;
  customDenomination?: string | null;
  statementOfFaith?: string | null;
  attestation?: unknown;
  terms?: unknown;
}): string;
export function listingSpamReason(value: unknown): string;
export function contactError(input: { name?: string | null; email?: string | null; message?: string | null }): string;
export function claimError(input: {
  listingId?: string | null;
  claimantName?: string | null;
  claimantEmail?: string | null;
  relationship?: string | null;
  evidence?: string | null;
}): string;
export function isUuid(value: unknown): boolean;
export function safeReturnPath(value: unknown, fallback: string): string;
