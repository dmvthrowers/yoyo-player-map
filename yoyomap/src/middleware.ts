import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '../i18n/routing';

const handleI18nRouting = createMiddleware(routing);

const NON_LOCALIZED_PATHS = new Set([
  '/map',
  '/players',
  '/profile',
  '/submit',
  '/contact',
  '/status',
  '/report',
  '/legal/privacy',
  '/legal/terms',
  '/legal/security'
]);

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Fast-path known non-localized routes to default locale to avoid hitting /[locale] with invalid locale values.
  if (NON_LOCALIZED_PATHS.has(pathname)) {
    const redirectUrl = new URL(`/en${pathname}${search}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return handleI18nRouting(request);
}

export const config = {
  // Skip API, static files, _next internals, and anything with a file extension
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
