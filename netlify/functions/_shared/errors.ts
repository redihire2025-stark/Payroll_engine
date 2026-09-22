/**
 * Supabase's own thrown errors (PostgrestError from .insert()/.update(),
 * AuthError from admin.generateLink()/getUserById(), etc.) are plain
 * objects with a `.message` property — they do NOT extend the native
 * Error class. A bare `err instanceof Error` check is false for all of
 * them, silently discarding the real message in favor of a generic
 * fallback. This checks for `.message` on ANY thrown value, not just
 * real Error instances.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message: unknown }).message;
    if (typeof msg === 'string' && msg) return msg;
  }
  if (typeof err === 'string' && err) return err;
  return 'Unknown error';
}
