import { Link } from 'react-router-dom';
import { Database, Cog, Zap } from 'lucide-react';

const TIERS = [
  {
    name: 'Melmac',
    headline: 'See Your Operations',
    description: 'Visibility into your operational data with dashboards and KPIs.',
    features: [
      'Command Center Dashboard',
      'Domain Dashboards',
      'Role-Based Filtered Views',
      'Dashboard Customization',
      'Data Connectors',
    ],
    accent: '#4B5563',
  },
  {
    name: 'Orbit',
    headline: 'Understand and Act',
    description: 'AI agents that analyze your data and help your team take action.',
    features: [
      'Everything in Melmac',
      'Workspace Agents',
      'Knowledge Base',
      'Action Plans',
      'Document Tools',
      'Custom Tool Builder',
      'Analytics Chat',
    ],
    accent: '#009ADE',
  },
  {
    name: 'Galaxy',
    headline: 'Alf Runs Your Operations',
    description: 'Full automation with SOP-driven workflows and connected execution.',
    features: [
      'Everything in Orbit',
      'SOP-Driven Discovery',
      'Automation Flows',
      'Connected Execution',
      'Agent Spawning',
      'Custom Builds',
    ],
    accent: '#C84B0A',
    badge: 'Full Platform',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Connect your data',
    description: 'Snowflake, CSV uploads, CMMS — bring in the data your teams already use.',
  },
  {
    step: '02',
    title: 'Alf learns your operations',
    description: 'Your company profile generates a portal tailored to your departments and services.',
  },
  {
    step: '03',
    title: 'AI agents work for you',
    description: 'Workspace agents, document tools, and action plans — built for your business.',
  },
  {
    step: '04',
    title: 'Automate everything',
    description: 'SOP analysis, flow execution, and connected services turn insights into action.',
  },
];

const DIFFERENTIATORS = [
  {
    icon: Database,
    title: 'Dynamic portal generation',
    description: 'Every portal is built from your company profile — departments, services, and differentiators shape what you see.',
  },
  {
    icon: Cog,
    title: 'SOP-driven automation',
    description: 'Upload your standard operating procedures and Alf discovers automation opportunities across your workflows.',
  },
  {
    icon: Zap,
    title: 'Company-specific AI agents',
    description: 'Agents trained on your knowledge base, your data, and your processes — not generic templates.',
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-alf-warm-white py-28 md:py-40 relative overflow-hidden">
        {/* Large-scale AlfMark as background visual anchor */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
          <div className="opacity-[0.04]" style={{ transform: 'translateY(-8%)' }}>
            <span style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 'clamp(280px, 40vw, 520px)',
              fontWeight: 400,
              letterSpacing: -12,
              color: '#1C1C1C',
              lineHeight: 0.85,
              display: 'block',
            }}>
              alf
            </span>
            <div style={{
              width: '55%',
              height: 6,
              background: '#C84B0A',
              borderRadius: 3,
              marginTop: 12,
            }} />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h1
            className="text-5xl md:text-7xl lg:text-8xl text-alf-dark mb-5 leading-[0.95] tracking-tight"
            style={{ fontFamily: "var(--font-marketing-heading)" }}
          >
            Operations Intelligence
          </h1>
          <div
            className="w-16 h-[3px] bg-alf-orange mx-auto rounded-full mb-6"
          />
          <p
            className="text-xl md:text-2xl text-alf-dark/70 mb-6"
            style={{ fontFamily: "var(--font-marketing-heading)" }}
          >
            The operating system for service operations
          </p>
          <p
            className="text-base md:text-lg text-alf-slate max-w-xl mx-auto mb-12 leading-relaxed"
            style={{ fontFamily: "var(--font-marketing-body)" }}
          >
            AI agents that learn your operations, automate your back office,
            and let your team focus on what matters — your clients.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/request-demo"
              className="px-7 py-3.5 bg-alf-orange text-white text-sm font-medium rounded-lg hover:bg-alf-orange/90 transition-colors"
              style={{ fontFamily: "var(--font-marketing-body)" }}
            >
              Request a Demo
            </Link>
            <a
              href="https://portal.alfpro.ai/login"
              className="px-7 py-3.5 border border-alf-dark/20 text-alf-dark text-sm font-medium rounded-lg hover:border-alf-dark hover:bg-alf-dark hover:text-white transition-colors"
              style={{ fontFamily: "var(--font-marketing-body)" }}
            >
              Log In
            </a>
          </div>
        </div>
      </section>

      {/* Tier Cards */}
      <section className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl text-alf-dark text-center mb-3"
            style={{ fontFamily: "var(--font-marketing-heading)" }}
          >
            Three tiers of operations intelligence
          </h2>
          <div className="w-12 h-[3px] bg-alf-orange mx-auto rounded-full mb-4" />
          <p
            className="text-center text-alf-slate mb-14 max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-marketing-body)" }}
          >
            From visibility to full automation — choose the level that fits your operations.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`bg-white rounded-xl p-6 flex flex-col relative ${
                  tier.badge
                    ? 'border-2 border-alf-orange shadow-lg shadow-alf-orange/10'
                    : 'border border-alf-bone'
                }`}
              >
                {tier.badge && (
                  <div
                    className="absolute -top-3 left-6 px-3 py-0.5 bg-alf-orange text-white text-[11px] font-semibold rounded-full"
                    style={{ fontFamily: "var(--font-marketing-body)" }}
                  >
                    {tier.badge}
                  </div>
                )}
                <div
                  className="inline-block self-start px-3 py-1 rounded-full text-xs font-semibold text-white mb-4"
                  style={{ backgroundColor: tier.accent, fontFamily: "var(--font-marketing-body)" }}
                >
                  {tier.name}
                </div>
                <h3
                  className="text-xl text-alf-dark mb-2"
                  style={{ fontFamily: "var(--font-marketing-heading)" }}
                >
                  {tier.headline}
                </h3>
                <p
                  className="text-sm text-alf-slate mb-6"
                  style={{ fontFamily: "var(--font-marketing-body)" }}
                >
                  {tier.description}
                </p>
                <ul className="space-y-2.5 mt-auto" style={{ fontFamily: "var(--font-marketing-body)" }}>
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-alf-dark">
                      <span className="text-alf-orange mt-0.5 shrink-0">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-alf-bone py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl text-alf-dark text-center mb-3"
            style={{ fontFamily: "var(--font-marketing-heading)" }}
          >
            How it works
          </h2>
          <div className="w-12 h-[3px] bg-alf-orange mx-auto rounded-full mb-14" />
          <div className="grid md:grid-cols-4 gap-10">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative">
                {/* Connector line between steps (desktop only) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(100%+4px)] w-[calc(100%-8px)] h-px bg-alf-orange/20" style={{ transform: 'translateX(-50%)' }} />
                )}
                <div
                  className="text-4xl font-light text-alf-orange mb-4"
                  style={{ fontFamily: "var(--font-marketing-heading)" }}
                >
                  {s.step}
                </div>
                <h3
                  className="text-lg text-alf-dark mb-2"
                  style={{ fontFamily: "var(--font-marketing-heading)" }}
                >
                  {s.title}
                </h3>
                <p
                  className="text-sm text-alf-slate leading-relaxed"
                  style={{ fontFamily: "var(--font-marketing-body)" }}
                >
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="bg-alf-warm-white py-24">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl text-alf-dark text-center mb-3"
            style={{ fontFamily: "var(--font-marketing-heading)" }}
          >
            What makes Alf different
          </h2>
          <div className="w-12 h-[3px] bg-alf-orange mx-auto rounded-full mb-14" />
          <div className="grid md:grid-cols-3 gap-10">
            {DIFFERENTIATORS.map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.title} className="text-center md:text-left">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-alf-orange/10 mb-5">
                    <Icon size={22} className="text-alf-orange" />
                  </div>
                  <h3
                    className="text-lg text-alf-dark mb-3"
                    style={{ fontFamily: "var(--font-marketing-heading)" }}
                  >
                    {d.title}
                  </h3>
                  <p
                    className="text-sm text-alf-slate leading-relaxed"
                    style={{ fontFamily: "var(--font-marketing-body)" }}
                  >
                    {d.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-alf-dark py-24 relative overflow-hidden">
        {/* AlfMark watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
          <div className="opacity-[0.06]">
            <span style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 'clamp(200px, 30vw, 400px)',
              fontWeight: 400,
              letterSpacing: -10,
              color: '#FFFFFF',
              lineHeight: 0.85,
              display: 'block',
            }}>
              alf
            </span>
            <div style={{
              width: '55%',
              height: 5,
              background: '#C84B0A',
              borderRadius: 2.5,
              marginTop: 10,
            }} />
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2
            className="text-3xl md:text-5xl text-white mb-4"
            style={{ fontFamily: "var(--font-marketing-heading)" }}
          >
            Automate your workflows.<br />
            Leverage your data.<br />
            Focus on your clients.
          </h2>
          <div className="w-12 h-[3px] bg-alf-orange mx-auto rounded-full mb-10" />
          <Link
            to="/request-demo"
            className="inline-block px-7 py-3.5 bg-alf-orange text-white text-sm font-medium rounded-lg hover:bg-alf-orange/90 transition-colors"
            style={{ fontFamily: "var(--font-marketing-body)" }}
          >
            Request a Demo
          </Link>
        </div>
      </section>
    </div>
  );
}
