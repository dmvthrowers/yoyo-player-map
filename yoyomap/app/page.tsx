import Link from 'next/link';

const TrustRow = () => (
  <section className="grid md:grid-cols-3 gap-0 border-y"
           style={{ borderColor: 'var(--border)' }}>
    { [
      {
        title: '10mi',
        subtitle: 'Location Blur',
        description: 'We never store your exact location.',
      },
      {
        title: 'Opt-In',
        subtitle: 'Always',
        description: 'You choose to be on the map. You can leave anytime.',
      },
      {
        title: '13+',
        subtitle: 'With Parent Consent',
        description: 'Under 18 requires a parent or guardian to verify.',
      },
    ].map(({ title, subtitle, description }, i) => (
      <div
        key={title}
        className={`text-center py-10 px-6 ${i > 0 ? 'md:border-l' : ''}`}
        style={{ borderColor: 'var(--border)' }}
      >
        <p className="font-display text-5xl md:text-6xl font-black text-brand-red leading-none">{title}</p>
        <p className="eyebrow text-navy mt-3">{subtitle}</p>
        <p className="text-sm mt-3 text-text-body">{description}</p>
      </div>
    )) }
  </section>
);

const SectionTitle = ({ eyebrow, children, light = false }: { eyebrow: string; children: React.ReactNode; light?: boolean }) => (
  <div className="text-center mb-10">
    <p className="eyebrow">{eyebrow}</p>
    <h2 className={`mt-3 text-3xl md:text-5xl ${light ? 'text-white' : 'text-navy-deep'}`}>{children}</h2>
    <hr className="rule-red mx-auto" />
  </div>
);

const HowItWorks = () => (
  <section className="py-20">
    <SectionTitle eyebrow="Three Steps">How It Works</SectionTitle>
    <div className="grid md:grid-cols-3 gap-6">
      { [
        { step: '1', title: 'Add Yourself', body: 'Fill out a short form — city only, no exact address.' },
        { step: '2', title: 'Verify Your Email', body: 'Click the link we send. That confirms you&apos;re a real person.' },
        { step: '3', title: 'You\u2019re on the Map', body: 'Find nearby throwers and connect at a meetup.' },
      ].map(({ step, title, body }) => (
        <div key={step} className="card">
          <p className="font-display text-6xl font-black text-brand-red leading-none">{step}</p>
          <hr className="rule-red" />
          <h3 className="text-xl mb-2 text-navy-deep">{title}</h3>
          <p className="text-sm text-text-body" dangerouslySetInnerHTML={{ __html: body }} />
        </div>
      )) }
    </div>
  </section>
);

export default function Home() {
  return (
    <>
      {/* Hero — navy canvas with dot pattern, echoes club site */}
      <section className="bg-navy-deep text-white dot-pattern">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <p className="eyebrow text-brand-red mb-6">Yo-Yos · Kendama · Skill Toys</p>
          <h1
            className="font-display font-black text-white mb-6"
            style={{ fontSize: 'clamp(2.75rem, 8vw, 5.25rem)', lineHeight: 0.95 }}
          >
            Find Your People.
            <br />
            <span className="text-brand-red">Throw Together.</span>
          </h1>
          <p className="max-w-2xl mx-auto mb-10 text-cream/85 text-lg leading-relaxed">
            A community map for yo-yoers. Add yourself, see who&apos;s nearby, connect.
            Opt-in, privacy-first, and always under your control.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/map" className="btn-primary">Explore the Map</Link>
            <Link href="/submit" className="btn-outline-white">Add Yourself</Link>
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
          <SectionTitle eyebrow="Privacy First" light>What We Don&apos;t Do</SectionTitle>
          <ul className="grid md:grid-cols-2 gap-x-10 gap-y-4 text-base">
            {[
              'We don’t use GPS or ask for your exact location.',
              'We don’t sell, share, or rent your data to anyone.',
              'We don’t use advertising trackers or analytics cookies.',
              'We don’t expose your email publicly on the map.',
              'We don’t allow direct messaging through the site.',
              'We don’t keep your data if you ask us to delete it.',
            ].map((t) => (
              <li key={t} className="flex gap-3 leading-relaxed">
                <span className="text-brand-red font-black">✕</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA — cream band */}
      <section className="bg-cream-mid">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="eyebrow">Ready?</p>
          <h2 className="mt-3 text-3xl md:text-5xl text-navy-deep">Find your local crew.</h2>
          <hr className="rule-red mx-auto" />
          <p className="text-text-body mb-8">Free, all skill levels, family-friendly.</p>
          <Link href="/submit" className="btn-primary">Add Yourself to the Map</Link>
        </div>
      </section>
    </>
  );
}
