/**
 * Server-side authorization guards.
 * Pages: return a Response to short-circuit, or null to continue.
 * API routes: return a JSON error Response, or null when authorized.
 * These are the ONLY enforcement points — never rely on hidden UI.
 */
import type { APIRoute, AstroGlobal } from 'astro';
import type { SessionUser } from '@/lib/auth';

const ADMIN_ROLES = new Set(['super_admin', 'moderator', 'verification_reviewer', 'content_editor']);
/** Roles allowed to grant/revoke roles — effectively the owner-level role. */
const ROOT_ROLES = new Set(['super_admin']);

export const isStaff = (user: SessionUser | null): boolean =>
  Boolean(user && ADMIN_ROLES.has(user.role));
export const isRoot = (user: SessionUser | null): boolean =>
  Boolean(user && ROOT_ROLES.has(user.role));

function forbiddenPage(message: string): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>403 — CrossLinkd</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;font-family:Roboto,system-ui,sans-serif;background:#faf8f3;color:#1d1a14;display:grid;place-items:center;min-height:100vh">
  <div style="max-width:26rem;padding:2.5rem;background:#fff;border:1px solid #e7e1d3;border-radius:1rem;text-align:center">
    <p style="font-size:2rem;font-weight:800;margin:0 0 .5rem">403</p>
    <p style="margin:0 0 1.25rem;color:#57503f">${message}</p>
    <a href="/" style="color:#22746a;font-weight:600">Back to home →</a>
  </div>
</body></html>`,
    { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

/**
 * Guard for admin PAGES. Redirect signed-out users to sign-in; render a 403 for
 * signed-in non-admins. Usage: `const gate = requireAdminPage(Astro); if (gate) return gate;`
 */
export function requireAdminPage(Astro: AstroGlobal): Response | null {
  const user = Astro.locals.user;
  if (!user) {
    const next = encodeURIComponent(Astro.url.pathname);
    return Astro.redirect(`/auth/signin?next=${next}&notice=signin-required`, 302);
  }
  if (!isStaff(user)) return forbiddenPage('Admin access is required for this page. If you believe you should have access, sign in with an administrator account.');
  return null;
}

/** Guard for member PAGES (dashboard). */
export function requireUserPage(Astro: AstroGlobal): Response | null {
  if (!Astro.locals.user) {
    const next = encodeURIComponent(Astro.url.pathname);
    return Astro.redirect(`/auth/signin?next=${next}&notice=signin-required`, 302);
  }
  return null;
}

/** Guard for API routes. Returns an error Response, or null when authorized. */
export const apiGuard: {
  user: (locals: { user: SessionUser | null }) => Response | null;
  admin: (locals: { user: SessionUser | null }) => Response | null;
  root: (locals: { user: SessionUser | null }) => Response | null;
} = {
  user: (locals) => {
    if (!locals.user) return jsonError(401, 'Sign in to continue.');
    return null;
  },
  admin: (locals) => {
    if (!locals.user) return jsonError(401, 'Sign in to continue.');
    if (!isStaff(locals.user)) return jsonError(403, 'Administrator access required.');
    return null;
  },
  root: (locals) => {
    if (!locals.user) return jsonError(401, 'Sign in to continue.');
    if (!isRoot(locals.user)) return jsonError(403, 'Only a super admin can perform this action.');
    return null;
  },
};

export function jsonError(status: number, error: string, extra?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok: false, error, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function jsonOk(data: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export type ApiRouteLike = Parameters<APIRoute>[0];
