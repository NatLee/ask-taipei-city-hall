/**
 * Errors from AI mode, kept apart from the SDK so the page can show them
 * without loading the SDK (it is only downloaded once AI mode is used).
 */
export type AiErrorKind = 'auth' | 'permission' | 'rate' | 'overloaded' | 'request' | 'network' | 'aborted' | 'unknown';

/** A failed AI request, with a message a visitor can act on. */
export class AiError extends Error {
  readonly kind: AiErrorKind;
  readonly detail: string;

  constructor(kind: AiErrorKind, message: string, detail = '') {
    super(message);
    this.name = 'AiError';
    this.kind = kind;
    this.detail = detail;
  }
}
