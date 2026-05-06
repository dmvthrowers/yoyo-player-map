import { Link } from "wouter";

const TRUST = [
  { title: "100%", subtitle: "Privacy First", description: "City-level only. No tracking. Delete anytime." },
  { title: "24/7", subtitle: "Community Driven", description: "Built by players, for players. Open source." },
  { title: "∞", subtitle: "Global Reach", description: "Players from every continent. Growing daily." },
];

const HOW_STEPS = [
  { step: "1", title: "Add Yourself", body: "Submit your city-level location. No exact addresses needed." },
  { step: "2", title: "Find Others", body: "Browse the map to find players, shops, and clubs near you." },
  { step: "3", title: "Connect", body: "Reach out through provided social links and throw together!" },
];

const PRIVACY_LIST = [
  "We don't track your location",
  "We don't sell your data",
  "We don't require exact addresses",
  "We don't share without consent",
  "We don't store sensitive info",
  "We don't prevent deletion",
];

export default function HomePage() {
  return (
    <>
      <section className="dot-pattern bg-navy-deep text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <p className="eyebrow mb-6">The Global Yo-Yo Community</p>
          <h1 className="hero-title font-black text-white mb-6 font-display">
            Find Your People.
            <br />
            <span className="text-brand-red">Throw Together.</span>
          </h1>
          <p className="max-w-2xl mx-auto mb-10 text-lg leading-relaxed text-cream/85">
            Connect with yo-yo players, shops, and clubs near you. Privacy-first, opt-in, city-level only.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/map" className="btn-primary">Explore the Map</Link>
            <Link href="/submit" className="btn-outline-white">Add Yourself</Link>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-0 border-y border-hairline">
        {TRUST.map(({ title, subtitle, description }, i) => (
          <div
            key={title}
            className={`text-center py-10 px-6${i > 0 ? " md:border-l border-hairline" : ""}`}
          >
            <p className="font-black leading-none text-[clamp(3rem,8vw,4rem)] text-brand-red font-display">{title}</p>
            <p className="eyebrow mt-3 text-navy">{subtitle}</p>
            <p className="text-sm mt-3 text-text-body">{description}</p>
          </div>
        ))}
      </section>

      <div className="max-w-6xl mx-auto px-4">
        <section className="py-20">
          <div className="text-center mb-10">
            <p className="eyebrow">Getting Started</p>
            <h2 className="mt-3 text-3xl md:text-5xl font-display text-navy-deep">How It Works</h2>
            <hr className="rule-red mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_STEPS.map(({ step, title, body }) => (
              <div key={step} className="card">
                <p className="font-black leading-none mb-3 text-[clamp(3rem,8vw,4rem)] text-brand-red font-display">{step}</p>
                <hr className="rule-red" />
                <h3 className="text-xl mb-2 font-display text-navy-deep">{title}</h3>
                <p className="text-sm text-text-body">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="dot-pattern bg-navy text-white">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="text-center mb-10">
            <p className="eyebrow">Your Data, Your Control</p>
            <h2 className="mt-3 text-3xl md:text-5xl text-white font-display">What We Don&apos;t Do</h2>
            <hr className="rule-red mx-auto" />
          </div>
          <ul className="grid md:grid-cols-2 gap-x-10 gap-y-4 text-base">
            {PRIVACY_LIST.map((item) => (
              <li key={item} className="flex gap-3 leading-relaxed">
                <span className="font-black text-brand-red">✕</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-cream-mid">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="eyebrow">Ready to Join?</p>
          <h2 className="mt-3 text-3xl md:text-5xl font-display text-navy-deep">Add Yourself to the Map</h2>
          <hr className="rule-red mx-auto" />
          <p className="mb-8 text-text-body">Help grow the yo-yo community. It only takes a minute.</p>
          <Link href="/submit" className="btn-primary">Get Started</Link>
        </div>
      </section>
    </>
  );
}
