import { getTranslations } from 'next-intl/server';

export default async function PrivacyPolicyPage() {
  const t = await getTranslations('Legal.privacy');

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 prose prose-invert min-h-screen pt-32">
      <h1 className="text-3xl font-bold font-display text-white mb-6">{t('title')}</h1>
      <p className="text-vibe-text-secondary mb-8">{t('updated')}</p>
      
      <h2>{t('section1.title')}</h2>
      <p>{t('section1.description')}</p>
      
      <h2>{t('section2.title')}</h2>
      <p>{t('section2.description')}</p>

      <h2>{t('section3.title')}</h2>
      <p>{t('section3.description')}</p>
      
      <h2>{t('section4.title')}</h2>
      <p>{t('section4.description')}</p>
    </div>
  );
}
