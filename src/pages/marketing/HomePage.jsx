import { Link } from 'react-router-dom';

const TIERS = [
  {
    name: 'Melmac',
    headline: 'See Your Operations',
    description: 'Visibility into your operational data with dashboards and KPIs.',
    features: [
      'Command Center Dashboard',
      'Domain Dashboards',
      'RBAC-Filtered Views',
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
    title: 'Dynamic portal generation',
    description: 'Every portal is built from your company profile — departments, services, and differentiators shape what you see.',
  },
  {
    title: 'SOP-driven automation',
    description: 'Upload your standard operating procedures and Alf discovers automation opportunities across your workflows.',
  },
  {
    title: 'Company-specific AI agents',
    description: 'Agents trained on your knowledge base, your data, and your processes — not generic templates.',
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-alf-warm-white py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl text-alf-dark mb-6 leading-tight"
            style={{ fontFamily: "var(--font-marketing-heading)" }}
          >
            The operating system for facility services operations
          </h1>
          <p
            className="text-lg md:text-xl text-alf-slate max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ fontFamily: "var(--font-marketing-body)" }}
          >
            Alf connects your operational data, deploys AI agents that understand your business,
            and automates the work your team does every day.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="mailto:support@alfpro.ai?subject=Demo request"
              className="px-6 py-3 bg-alf-orange text-white text-sm font-medium rounded-lg hover:bg-alf-orange/90 transition-colors"
              style={{ fontFamily: "var(--font-marketing-body)" }}
            >
              Request a Demo
            </a>
            <Link
              to="/login"
              className="px-6 py-3 border border-alf-dark text-alf-dark text-sm font-medium rounded-lg hover:bg-alf-dark hover:text-white transition-colors"
              style={{ fontFamily: "var(--font-marketing-body)" }}
            >
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* Tier Cards */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-3xl text-alf-dark text-center mb-4"
            style={{ fontFamily: "var(--font-marketing-heading)" }}
          >
            Three tiers of operations intelligence
          </h2>
          <p
            className="text-center text-alf-slate mb-12 max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-marketing-body)" }}
          >
            From visibility to full automation — choose the level that fits your operations.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className="bg-white rounded-xl border border-alf-bone p-6 flex flex-col"
              >
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
                <ul className="space-y-2 mt-auto" style={{ fontFamily: "var(--font-marketing-body)" }}>
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-alf-dark">
                      <span className="text-alf-orange mt-0.5">&#10003;</span>
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
      <section className="bg-alf-warm-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-3xl text-alf-dark text-center mb-12"
            style={{ fontFamily: "var(--font-marketing-heading)" }}
          >
            How it works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center md:text-left">
                <div
                  className="text-3xl font-light text-alf-orange mb-3"
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
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="text-3xl text-alf-dark text-center mb-12"
            style={{ fontFamily: "var(--font-marketing-heading)" }}
          >
            What makes Alf different
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {DIFFERENTIATORS.map((d) => (
              <div key={d.title}>
                <h3
                  className="text-lg text-alf-dark mb-2"
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
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-alf-dark py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-3xl text-white mb-6"
            style={{ fontFamily: "var(--font-marketing-heading)" }}
          >
            Ready to see your operations clearly?
          </h2>
          <a
            href="mailto:support@alfpro.ai?subject=Demo request"
            className="inline-block px-6 py-3 bg-alf-orange text-white text-sm font-medium rounded-lg hover:bg-alf-orange/90 transition-colors"
            style={{ fontFamily: "var(--font-marketing-body)" }}
          >
            Request a Demo
          </a>
        </div>
      </section>
    </div>
  );
}
