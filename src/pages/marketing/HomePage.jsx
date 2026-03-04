import { Link } from 'react-router-dom';
import { LayoutDashboard, Building2, BarChart3, Bot, GitBranch, Plug, Database, Globe, Zap } from 'lucide-react';

const PLATFORM_FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Command Center',
    description: 'Real-time KPIs across your entire operation. A budget variance doesn\'t just turn red — it triggers a workflow. Data stops being something you look at and starts being something the system works from.',
  },
  {
    icon: Building2,
    title: 'Department Workspaces',
    description: 'HR, Finance, Purchasing, Operations, Safety, Sales — every department gets its own workspace with agents that do the work that department does.',
  },
  {
    icon: Bot,
    title: 'AI Agents',
    description: 'Every department gets AI agents that handle the work that department handles. The repetitive reports, the approval chains, the document generation — agents learn how your company does it and start doing it.',
  },
  {
    icon: GitBranch,
    title: 'Workflow Execution',
    description: 'Upload your procedures and Alf turns them into live workflows — with stages, assignments, approvals, and agent processing at each step. Requests route through defined chains with the right data pulled automatically.',
  },
  {
    icon: BarChart3,
    title: 'Dashboards That Act',
    description: 'Dashboards don\'t just display data — they connect to agents that read it, flag what matters, and take action. A safety trend surfaces a response plan. A budget miss triggers a review.',
  },
  {
    icon: Plug,
    title: 'Works From Day One',
    description: 'Zero integrations required to start. Upload docs and agents start working. Connect email and they start sending. Connect your ERP and they see live data. Value builds as connections build.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Upload your docs',
    description: 'Procedures, policies, training materials. Alf reads them, learns how your company operates, and starts working from day one — no integrations required.',
  },
  {
    step: '02',
    title: 'Agents learn your business',
    description: 'Every department gets AI agents trained on your knowledge. The more you add, the smarter they get. All that intelligence stays inside the platform.',
  },
  {
    step: '03',
    title: 'Workflows execute',
    description: 'Your procedures become live workflows with stages, approvals, and routing. Agents process automated steps. People handle decisions. The right data appears at every step.',
  },
  {
    step: '04',
    title: 'Back office scales',
    description: 'Same team handles more volume, responds faster, drops fewer balls, produces better output — because the repetitive work is handled by agents who already know how your company operates.',
  },
];

const DIFFERENTIATORS = [
  {
    icon: Database,
    title: 'Your portal, generated from your business',
    description: 'Your company profile — departments, services, locations — generates a branded portal purpose-built for your organization. Not a generic template with your logo on it.',
  },
  {
    icon: Globe,
    title: 'Your brand, your domain, your data',
    description: 'Every company gets their own white-labeled portal — fully isolated, fully branded. Your team sees your portal, not a SaaS product.',
  },
  {
    icon: Zap,
    title: 'No big-bang implementation',
    description: 'Start with documents and agents. Add email, then ERP, then full automation. Each connection makes the platform more powerful. Value from week one, not month six.',
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
            The operating system for service company back offices
          </p>
          <p
            className="text-base md:text-lg text-alf-slate max-w-xl mx-auto mb-12 leading-relaxed"
            style={{ fontFamily: "var(--font-marketing-body)" }}
          >
            Every department gets AI agents that do the work that department does.
            Agents learn how your company operates and start handling the repetitive
            work that buries your team.
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
            What your back office runs on
          </h2>
          <div className="w-12 h-[3px] bg-alf-orange mx-auto rounded-full mb-4" />
          <p
            className="text-center text-alf-slate mb-14 max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-marketing-body)" }}
          >
            Agents that do real work. Workflows that actually execute. Data that drives action, not just dashboards.
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
            How Alf works
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
