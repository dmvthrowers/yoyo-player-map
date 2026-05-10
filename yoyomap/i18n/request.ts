import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';
import deepmerge from 'deepmerge';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // Always load English as base/fallback messages
  const enMessages = (await import(`../messages/en.json`)).default;
  
  // If locale is English, just use English messages
  if (locale === 'en') {
    return {
      locale,
      messages: enMessages,
    };
  }

  // For other locales, merge with English as fallback.
  // If a locale file is missing, gracefully fall back to English only.
  let localeMessages = {};
  try {
    localeMessages = (await import(`../messages/${locale}.json`)).default;
  } catch {
    localeMessages = {};
  }
  
  return {
    locale,
    messages: deepmerge(enMessages, localeMessages),
  };
});
