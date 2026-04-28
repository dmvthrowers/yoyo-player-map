import { useTranslations } from 'next-intl';
import Link from 'next/link';

const TrustRow = () => {
  const t = useTranslations();
  const trust = [
    {
      title: t('home.trust.0.title'),
      subtitle: t('home.trust.0.subtitle'),
      description: t('home.trust.0.description'),
    },
    {
      title: t('home.trust.1.title'),
      subtitle: t('home.trust.1.subtitle'),
      description: t('home.trust.1.description'),
    },
    {
      title: t('home.trust.2.title'),
      subtitle: t('home.trust.2.subtitle'),
      description: t('home.trust.2.description'),
    },
  ];
  return (
    <section className="grid md:grid-cols-3 gap-0 border-y border-custom">
      {trust.map(({ title, subtitle, description }, i) => (
        <div
          key={title}
          className={`text-center py-10 px-6 ${i > 0 ? 'md:border-l border-custom' : ''}`}
        >
          <p className="font-display text-5xl md:text-6xl font-black text-brand-red leading-none">{title}</p>
          <p className="eyebrow text-navy mt-3">{subtitle}</p>
          <p className="text-sm mt-3 text-text-body">{description}</p>
        </div>
      ))}
    </section>
  );
};

const SectionTitle = ({ eyebrow, children, light = false }: { eyebrow: string; children: React.ReactNode; light?: boolean }) => (
  <div className="text-center mb-10">
    <p className="eyebrow">{eyebrow}</p>
    <h2 className={`mt-3 text-3xl md:text-5xl ${light ? 'text-white' : 'text-navy-deep'}`}>{children}</h2>
    <hr className="rule-red mx-auto" />
  </div>
);

const HowItWorks = () => {
  const t = useTranslations();
  const steps = [0, 1, 2].map((i) => ({
    step: t(`home.how.steps.${i}.step`),
    title: t(`home.how.steps.${i}.title`),
    body: t(`home.how.steps.${i}.body`),
  }));
  return (
    <section className="py-20">
      <SectionTitle eyebrow={t('home.how.eyebrow')}>{t('home.how.title')}</SectionTitle>
      <div className="grid md:grid-cols-3 gap-6">
        {steps.map(({ step, title, body }) => (
          <div key={step} className="card">
            <p className="font-display text-6xl font-black text-brand-red leading-none">{step}</p>
            <hr className="rule-red" />
            <h3 className="text-xl mb-2 text-navy-deep">{title}</h3>
            <p className="text-sm text-text-body">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};


export default function Home() {
  const t = useTranslations();
  return (
    <>
      {/* Hero — navy canvas with dot pattern, echoes club site */}
      <section className="bg-navy-deep text-white dot-pattern">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <p className="eyebrow text-brand-red mb-6">{t('home.hero.eyebrow')}</p>
          <h1
            className="font-display font-black text-white mb-6 hero-title"
          >
            {t('home.title')}
            <br />
            <span className="text-brand-red">{t('home.subtitle')}</span>
          </h1>
          <p className="max-w-2xl mx-auto mb-10 text-cream/85 text-lg leading-relaxed">
            {t('home.hero.description')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/map" className="btn-primary">{t('home.cta')}</Link>
            <Link href="/submit" className="btn-outline-white">{t('home.add')}</Link>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4">
        <TrustRow />
        <HowItWorks />
      </div>

      {/* What we don't do — navy block with dot pattern */}
      <section className="bg-navy text-white dot-pattern">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <SectionTitle eyebrow={t('home.privacy.eyebrow')} light>{t('home.privacy.title')}</SectionTitle>
          <ul className="grid md:grid-cols-2 gap-x-10 gap-y-4 text-base">
            {[0,1,2,3,4,5].map((i) => (
              <li key={i} className="flex gap-3 leading-relaxed">
                <span className="text-brand-red font-black">✕</span>
                <span>{t(`home.privacy.list.${i}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA — cream band */}
      <section className="bg-cream-mid">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="eyebrow">{t('home.ctaBand.eyebrow')}</p>
          <h2 className="mt-3 text-3xl md:text-5xl text-navy-deep">{t('home.ctaBand.title')}</h2>
          <hr className="rule-red mx-auto" />
          <p className="text-text-body mb-8">{t('home.ctaBand.description')}</p>
          <Link href="/submit" className="btn-primary">{t('home.ctaBand.button')}</Link>
        </div>
      </section>
    </>
  );
}
