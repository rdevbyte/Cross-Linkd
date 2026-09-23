import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, readSessionToken } from '@/lib/auth';

/** Attaches `locals.user` for every request (null when signed out). */
export const onRequest = defineMiddleware(async ({ cookies, locals }, next) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  locals.user = await readSessionToken(token);
  return next();
});

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace App {
    interface Locals {
      user: { id: string; email: string; displayName: string; role: string } | null;
    }
  }
}
