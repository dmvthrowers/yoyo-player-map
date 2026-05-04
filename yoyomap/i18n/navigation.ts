import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware navigation utilities. Use these instead of next/link and
// next/navigation so that all internal links automatically carry the current
// locale prefix (e.g. /en/map, /es/map) and soft navigations work correctly
// with the next-intl localePrefix:'always' routing strategy.
export const { Link, redirect, useRouter, usePathname, getPathname } =
  createNavigation(routing);
