/**
 * The message to show for a failed API response. Reads the standard envelope
 * (`{ error: { message } }`, see lib/api-error.ts) and the older plain
 * `{ error: 'text' }` shape, and falls back when neither is there. Safe to
 * import from client components.
 */
export function apiErrorMessage(body: unknown, fallback: string): string {
  const error = (body as { error?: unknown } | null | undefined)?.error;
  if (typeof error === 'string' && error) return error;
  const message = (error as { message?: unknown } | null | undefined)?.message;
  if (typeof message === 'string' && message) return message;
  return fallback;
}
