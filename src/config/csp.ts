import { ANTHROPIC_API_ORIGIN } from '../ai/config.ts';

/**
 * The page only needs its own files plus the Anthropic API (AI mode).
 * `style-src 'unsafe-inline'` covers React `style` attributes; scripts stay
 * strict. Kept next to the API origin it allows so the two cannot drift.
 */
export function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "worker-src 'self'",
    `connect-src 'self' ${ANTHROPIC_API_ORIGIN}`,
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
