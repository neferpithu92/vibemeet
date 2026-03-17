import {getRequestConfig} from 'next-intl/server';
import {locales} from '../lib/i18n/config';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  const currentLocale = locales.includes(locale as any) ? locale : 'it';

  return {
    locale: currentLocale as string,
    messages: (await import(`../messages/${currentLocale}.json`)).default
  };
});
