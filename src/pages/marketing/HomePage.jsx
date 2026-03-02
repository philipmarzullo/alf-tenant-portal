import { Link } from 'react-router-dom';
import { LayoutDashboard, Building2, BarChart3, Bot, FileText, Shield, Database, Globe, Lock } from 'lucide-react';

const PLATFORM_FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Command Center',
    description: 'Real-time KPIs across your entire operation — one screen, every department.',
  },
  {
    icon: Building2,
    title: 'Workspaces',
    description: 'Each department gets its own workspace: Operations, HR, Safety, Finance, Sales, Purchasing. Your portal mirrors your org chart.',
  },
  {
    icon: BarChart3,
    title: 'Dashboards',
    description: 'Drill into operations, labor, quality, timekeeping, and safety. Admins control exactly which dashboards each user sees.',
  },
  {
    icon: Bot,
    title: 'AI Agents',
    description: 'Agents trained on your data, your SOPs, and your knowledge base — not generic models. Ask questions, get answers grounded in your operations.',
  },
  {
    icon: FileText,
    title: 'Document Tools',
    description: 'QBR Builder, SOP Builder, Proposal Builder — generate real documents from real data, not blank templates.',
  },
  {
    icon: Shield,
    title: 'Access Control',
    description: 'Per-user module access, dashboard restrictions, site-level filtering, metric tiers. The right data for the right person.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Your data connects',
    description: 'Snowflake, CMMS, workforce platforms, CSV uploads. Data flows in from the systems you already use.',
  },
  {
    step: '02',
    title: 'Tagged by department',
    description: 'Every record is mapped to a department — Operations, HR, Safety, Finance, Sales, Purchasing. The same structure that organizes your company organizes your data.',
  },
  {
    step: '03',
    title: 'Workspaces, dashboards, and SOPs align',
    description: 'Department-tagged data populates workspace views. SOPs tagged to the same department enrich your agents. Dashboards aggregate across all of it.',
  },
  {
    step: '04',
    title: 'AI agents see the full picture',
    description: 'When an agent answers a question or drafts a document, it draws from your data, your SOPs, and your company knowledge — all connected through that department structure.',
  },
];

const DIFFERENTIATORS = [
  {
    icon: Database,
    title: 'Dynamic portal generation',
    description: 'Your company profile — departments, services, locations — generates a branded portal purpose-built for your organization. Not a generic template with your logo on it.',
  },
  {
    icon: Globe,
    title: 'White-labeled and tenant-isolated',
    description: 'Your brand, your domain, your data. Every tenant is fully isolated. Your team sees your portal, not a SaaS product.',
  },
  {
    icon: Lock,
    title: 'Enterprise-grade access control',
    description: 'Module-level permissions, dashboard domain restrictions, site-level data filtering, metric tiers — operational, managerial, financial. Every user sees exactly what they need.',
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-alf-warm-white py-28 md:py-40 relative overflow-hidden">
        {/* Large-scale AlfMark as background visual anchor */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
          <div className="opacity-[0.04] w-full" style={{ transform: 'translateY(-8%)' }}>
            <span style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 'clamp(280px, 40vw, 520px)',
              fontWeight: 400,
              letterSpacing: -12,
              color: '#1C1C1C',
              lineHeight: 0.85,
              display: 'block',
              textAlign: 'center',
              transform: 'translateX(-0.08em)',
            }}>
              alf
            </span>
            <div style={{
              width: 'clamp(154px, 22vw, 286px)',
              height: 6,
              background: '#C84B0A',
              borderRadius: 3,
              marginTop: 12,
              marginLeft: 'auto',
              marginRight: 'auto',
              transform: 'translateX(-0.08em)',
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
            Your data, your departments, your AI — one platform
          </p>
          <p
            className="text-base md:text-lg text-alf-slate max-w-xl mx-auto mb-12 leading-relaxed"
            style={{ fontFamily: "var(--font-marketing-body)" }}
          >
            Alf connects your operational data to department-specific workspaces,
            dashboards, and AI agents — so every team sees exactly what they need
            to act.
          </p>
          <Link
            to="/request-demo"
            className="inline-block px-7 py-3.5 bg-alf-orange text-white text-sm font-medium rounded-lg hover:bg-alf-orange/90 transition-colors"
            style={{ fontFamily: "var(--font-marketing-body)" }}
          >
            Request a Demo
          </Link>
        </div>
      </section>

      {/* Platform Overview */}
      <section className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl text-alf-dark text-center mb-3"
            style={{ fontFamily: "var(--font-marketing-heading)" }}
          >
            Your portal, built around your business
          </h2>
          <div className="w-12 h-[3px] bg-alf-orange mx-auto rounded-full mb-4" />
          <p
            className="text-center text-alf-slate mb-14 max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-marketing-body)" }}
          >
            Everything your team needs to see, understand, and act on — organized the way your company actually works.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PLATFORM_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-alf-warm-white rounded-xl p-6 border border-alf-bone"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-alf-orange/10 mb-5">
                    <Icon size={22} className="text-alf-orange" />
                  </div>
                  <h3
                    className="text-lg text-alf-dark mb-2"
                    style={{ fontFamily: "var(--font-marketing-heading)" }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-sm text-alf-slate leading-relaxed"
                    style={{ fontFamily: "var(--font-marketing-body)" }}
                  >
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How Your Data Becomes Intelligence */}
      <section className="bg-alf-bone py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl text-alf-dark text-center mb-3"
            style={{ fontFamily: "var(--font-marketing-heading)" }}
          >
            How your data becomes intelligence
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
            Built for your company
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
          <div className="opacity-[0.06] w-full">
            <span style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 'clamp(200px, 30vw, 400px)',
              fontWeight: 400,
              letterSpacing: -10,
              color: '#FFFFFF',
              lineHeight: 0.85,
              display: 'block',
              textAlign: 'center',
              transform: 'translateX(-0.08em)',
            }}>
              alf
            </span>
            <div style={{
              width: 'clamp(110px, 16.5vw, 220px)',
              height: 5,
              background: '#C84B0A',
              borderRadius: 2.5,
              marginTop: 10,
              marginLeft: 'auto',
              marginRight: 'auto',
              transform: 'translateX(-0.08em)',
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
