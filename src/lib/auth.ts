/**
 * Auth helpers — JWT sessions in httpOnly cookies.
 * Works with the Postgres `users`/`sessions` tables; falls back to a
 * signed stateless token in demo mode (no DATABASE_URL) so previews work.
 */
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes as _randomBytes } from 'node:crypto';
import { eq as eq2 } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const COOKIE = 'cl_session';
const secret = () => {
  const s = process.env.AUTH_SECRET?.trim() || 'crosslinkd-production-stable-fallback-auth-key-2026';
  return createHash('sha256').update(s).digest();
};

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function readSessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.id !== 'string' || typeof payload.email !== 'string') return null;
    return {
      id: payload.id,
      email: payload.email,
      displayName: typeof payload.displayName === 'string' ? payload.displayName : 'Member',
      role: typeof payload.role === 'string' ? payload.role : 'member',
    };
  } catch {
    return null;
  }
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

/** Marks the token used and returns its row, or null when invalid/expired/used. */
export async function consumeAuthToken(
  db: any,
  tokens: any,
  rawToken: string,
  kind: AuthTokenKind,
): Promise<{ userId: string } | null> {
  const tokenHash = sha256Hex(rawToken);
  const rows = await db.select().from(tokens).where(eq2(tokens.tokenHash, tokenHash)).limit(1) as Array<{
    id: unknown; userId: string; kind: string; expiresAt: Date; usedAt: Date | null;
  }>;
  const row = rows[0];
  if (!row || row.kind !== kind || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;
  await db.update(tokens).set({ usedAt: new Date() }).where(eq2(tokens.tokenHash, tokenHash));
  return { userId: row.userId };
}

export function canEditListing(user: SessionUser | null, ownerId?: string | null): boolean {
  if (!user) return false;
  if (['super_admin', 'moderator', 'content_editor'].includes(user.role)) return true;
  return Boolean(ownerId && ownerId === user.id);
}
export function isAdmin(user: SessionUser | null): boolean {
  return Boolean(user && ['super_admin', 'moderator', 'verification_reviewer', 'content_editor'].includes(user.role));
}
