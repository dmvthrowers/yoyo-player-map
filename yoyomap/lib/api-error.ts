import { NextResponse } from 'next/server';

/**
 * Returns true when the Content-Length header exceeds maxBytes.
 * Call this BEFORE req.json() to reject oversized bodies early, preventing
 * unnecessary memory allocation and CPU work (e.g. recursive object walks).
 * Note: Content-Length may be absent for chunked transfers; when missing this
 * returns false (permissive) — Vercel's edge/node limits provide the backstop.
 */
export function bodyTooLarge(req: { headers: { get(name: string): string | null } }, maxBytes: number): boolean {
  const cl = req.headers.get('content-length');
  return cl !== null && parseInt(cl, 10) > maxBytes;
}

/**
 * Standard error envelope returned by API routes. Kept narrow on purpose —
 * never leak stack traces, SQL text, or third-party error bodies to the
 * client. The `requestId` lets support correlate a user-reported failure
 * with the corresponding Vercel function log line.
 */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

/**
 * Known error codes. Extend sparingly — clients switch on these strings.
 */
export type ApiErrorCode =
  | 'bad_request'       // 400 — malformed input
  | 'unauthorized'      // 401 — missing/invalid credential
  | 'forbidden'         // 403 — authenticated but not allowed
  | 'not_found'         // 404
  | 'conflict'          // 409 — duplicate, stale write, etc.
  | 'unprocessable'     // 422 — valid shape, rejected by business rule
  | 'rate_limited'      // 429
  | 'upstream_error'    // 502 — Supabase/Resend/Nominatim returned failure
  | 'internal_error';   // 500 — anything else

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  unprocessable: 422,
  rate_limited: 429,
  upstream_error: 502,
  internal_error: 500,
};

export function newRequestId(): string {
  // crypto.randomUUID is available in Node 19+ and the Edge runtime.
  return globalThis.crypto.randomUUID();
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  requestId: string,
  extraHeaders?: Record<string, string>,
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { error: { code, message, requestId } };
  return NextResponse.json(body, {
    status: STATUS_BY_CODE[code],
    headers: { 'x-request-id': requestId, ...(extraHeaders ?? {}) },
  });
}

/**
 * Wraps an API handler so every thrown error becomes a standard envelope,
 * and every response carries an `x-request-id` header. Handlers receive the
 * requestId as a second argument and should use it when calling apiError
 * or attaching it to their own NextResponse headers via `attachRequestId`.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (requestId: string, ...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    const requestId = newRequestId();
    try {
      const res = await handler(requestId, ...args);
      if (!res.headers.has('x-request-id')) {
        res.headers.set('x-request-id', requestId);
      }
      return res;
    } catch (e) {
      console.error(`[api] unhandled error [${requestId}]:`, e);
      return apiError('internal_error', 'Something went wrong on our end.', requestId);
    }
  };
}

/**
 * Attach the request id to an existing NextResponse (e.g., a redirect).
 * Returns the same response for chaining.
 */
export function attachRequestId<T extends NextResponse>(res: T, requestId: string): T {
  res.headers.set('x-request-id', requestId);
  return res;
}
