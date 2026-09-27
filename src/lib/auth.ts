/**
 * Auth helpers — JWT sessions in httpOnly cookies.
 * Works with the Postgres `users`/`sessions` tables; falls back to a
 * signed stateless token in demo mode (no DATABASE_URL) so previews work.
 */
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes as _randomBytes } from 'node:crypto';
import { and, eq as eq2, gt, isNull, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const COOKIE = 'cl_session';

/**
 * Session signing key. In production `AUTH_SECRET` is REQUIRED: without it we
 * refuse to mint or accept sessions (fail closed) instead of falling back to a
 * key that lives in the repository, which would let anyone forge a session for
 * any user/role. Outside production a fixed development key keeps local dev
 * and the e2e suites working without a .env file.
 */
export function getAuthSecret(): Uint8Array | null {
  const configured = process.env.AUTH_SECRET?.trim();
  const raw = configured || (process.env.NODE_ENV === 'production' ? '' : 'crosslinkd-development-only-session-key');
  if (!raw) return null;
  return createHash('sha256').update(raw).digest();
}
export const authConfigured = (): boolean => getAuthSecret() !== null;

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

/** A verified session: the user plus the token's issue time (seconds since epoch). */
export interface SessionClaims extends SessionUser {
  issuedAt: number;
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const key = getAuthSecret();
  if (!key) throw new Error('AUTH_SECRET is not configured; refusing to issue a session.');
  const { id, email, displayName, role } = user;
  return new SignJWT({ id, email, displayName, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key);
}

export async function readSessionToken(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  const key = getAuthSecret();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    if (typeof payload.id !== 'string' || typeof payload.email !== 'string') return null;
    return {
      id: payload.id,
      email: payload.email,
      displayName: typeof payload.displayName === 'string' ? payload.displayName : 'Member',
      role: typeof payload.role === 'string' ? payload.role : 'member',
      issuedAt: typeof payload.iat === 'number' ? payload.iat : 0,
    };
  } catch {
    return null;
  }
}

// ---------------- Session revocation (users.sessions_valid_after watermark) ----------------

/**
 * True when a token issued at `issuedAt` (JWT seconds) predates the user's
 * revocation watermark. Compared at whole-second precision so a session issued
 * in the same second as the bump (sign-out → immediate sign-in) stays valid.
 */
export function isSessionRevoked(issuedAt: number, validAfter: Date | null | undefined): boolean {
  if (!validAfter) return false;
  return issuedAt < Math.floor(validAfter.getTime() / 1000);
}

/** Invalidates every existing session of `userId` (sign-out, password reset, role change, deletion). */
export async function revokeUserSessions(db: any, users: any, userId: string): Promise<void> {
  await db.update(users).set({ sessionsValidAfter: new Date() }).where(eq2(users.id, userId));
}

export function sessionCookie(token: string): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}; ${
    process.env.NODE_ENV === 'production' ? 'Secure;' : ''
  }`;
}
export function clearSessionCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;`;
}
export const SESSION_COOKIE = COOKIE;

// ---------------- Single-use auth tokens (email verify / password reset) ----------------

export type AuthTokenKind = 'email_verify' | 'password_reset' | 'magic';

const crypto = { randomBytes: _randomBytes };

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function createAuthToken(
  db: any,
  tokens: any,
  userId: string,
  kind: AuthTokenKind,
  ttlMs = 1000 * 60 * 60,
): Promise<string> {
  const raw = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256Hex(raw);
  await db.insert(tokens).values({
    userId,
    kind,
    tokenHash,
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return raw;
}

export function sha256Hex(input: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Marks the token used and returns its owner, or null when invalid/expired/used.
 * A single conditional UPDATE … RETURNING makes consumption atomic: two
 * concurrent requests with the same link can never both succeed.
 */
export async function consumeAuthToken(
  db: any,
  tokens: any,
  rawToken: string,
  kind: AuthTokenKind,
): Promise<{ userId: string } | null> {
  const tokenHash = sha256Hex(rawToken);
  const rows = await db
    .update(tokens)
    .set({ usedAt: new Date() })
    .where(and(
      eq2(tokens.tokenHash, tokenHash),
      eq2(tokens.kind, kind),
      isNull(tokens.usedAt),
      gt(tokens.expiresAt, sql`now()`),
    ))
    .returning({ userId: tokens.userId }) as Array<{ userId: string }>;
  return rows[0] ?? null;
}

export function canEditListing(user: SessionUser | null, ownerId?: string | null): boolean {
  if (!user) return false;
  if (['super_admin', 'moderator', 'content_editor'].includes(user.role)) return true;
  return Boolean(ownerId && ownerId === user.id);
}
export function isAdmin(user: SessionUser | null): boolean {
  return Boolean(user && ['super_admin', 'moderator', 'verification_reviewer', 'content_editor'].includes(user.role));
}
