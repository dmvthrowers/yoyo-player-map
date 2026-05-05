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
      <section className="dot-pattern" style={{ backgroundColor: "#0e1833", color: "#fff" }}>
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <p className="eyebrow mb-6">The Global Yo-Yo Community</p>
          <h1 className="hero-title font-black text-white mb-6" style={{ fontFamily: "Georgia, serif" }}>
            Find Your People.
            <br />
            <span style={{ color: "#D42B2B" }}>Throw Together.</span>
          </h1>
          <p className="max-w-2xl mx-auto mb-10 text-lg leading-relaxed" style={{ color: "rgba(245,240,232,0.85)" }}>
            Connect with yo-yo players, shops, and clubs near you. Privacy-first, opt-in, city-level only.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/map" className="btn-primary">Explore the Map</Link>
            <Link href="/submit" className="btn-outline-white">Add Yourself</Link>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-0 border-y" style={{ borderColor: "#d4cebc" }}>
        {TRUST.map(({ title, subtitle, description }, i) => (
          <div
            key={title}
            className={`text-center py-10 px-6${i > 0 ? " md:border-l" : ""}`}
            style={i > 0 ? { borderColor: "#d4cebc" } : undefined}
          >
            <p className="font-black leading-none" style={{ fontSize: "clamp(3rem,8vw,4rem)", color: "#D42B2B", fontFamily: "Georgia, serif" }}>{title}</p>
            <p className="eyebrow mt-3" style={{ color: "#1a2744" }}>{subtitle}</p>
            <p className="text-sm mt-3" style={{ color: "#3a4a6a" }}>{description}</p>
          </div>
        ))}
      </section>

      <div className="max-w-6xl mx-auto px-4">
        <section className="py-20">
          <div className="text-center mb-10">
            <p className="eyebrow">Getting Started</p>
            <h2 className="mt-3 text-3xl md:text-5xl" style={{ color: "#0e1833", fontFamily: "Georgia, serif" }}>How It Works</h2>
            <hr className="rule-red mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_STEPS.map(({ step, title, body }) => (
              <div key={step} className="card">
                <p className="font-black leading-none mb-3" style={{ fontSize: "clamp(3rem,8vw,4rem)", color: "#D42B2B", fontFamily: "Georgia, serif" }}>{step}</p>
                <hr className="rule-red" />
                <h3 className="text-xl mb-2" style={{ color: "#0e1833", fontFamily: "Georgia, serif" }}>{title}</h3>
                <p className="text-sm" style={{ color: "#3a4a6a" }}>{body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="dot-pattern" style={{ backgroundColor: "#1a2744", color: "#fff" }}>
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="text-center mb-10">
            <p className="eyebrow">Your Data, Your Control</p>
            <h2 className="mt-3 text-3xl md:text-5xl text-white" style={{ fontFamily: "Georgia, serif" }}>What We Don&apos;t Do</h2>
            <hr className="rule-red mx-auto" />
          </div>
          <ul className="grid md:grid-cols-2 gap-x-10 gap-y-4 text-base">
            {PRIVACY_LIST.map((item) => (
              <li key={item} className="flex gap-3 leading-relaxed">
                <span className="font-black" style={{ color: "#D42B2B" }}>✕</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ backgroundColor: "#f0ebe0" }}>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="eyebrow">Ready to Join?</p>
          <h2 className="mt-3 text-3xl md:text-5xl" style={{ color: "#0e1833", fontFamily: "Georgia, serif" }}>Add Yourself to the Map</h2>
          <hr className="rule-red mx-auto" />
          <p className="mb-8" style={{ color: "#3a4a6a" }}>Help grow the yo-yo community. It only takes a minute.</p>
          <Link href="/submit" className="btn-primary">Get Started</Link>
        </div>
      </section>
    </>
  );
}
