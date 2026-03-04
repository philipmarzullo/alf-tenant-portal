import { Link } from 'react-router-dom';

const TIERS = [
  {
    name: 'Melmac',
    subtitle: 'Visibility',
    accent: '#4B5563',
    users: '10 users',
    calls: '1,000 agent calls/mo',
    features: [
      { label: 'Command Center Dashboard', included: true },
      { label: 'Domain Dashboards', included: true },
      { label: 'Role-Based Filtered Views', included: true },
      { label: 'Dashboard Customization', included: true },
      { label: 'Data Connectors', included: true },
      { label: 'Workspace Agents', included: false },
      { label: 'Knowledge Base', included: false },
      { label: 'Action Plans', included: false },
      { label: 'Document Tools', included: false },
      { label: 'Custom Tool Builder', included: false },
      { label: 'Analytics Chat', included: false },
      { label: 'SOP-Driven Discovery', included: false },
      { label: 'Workflow Execution', included: false },
      { label: 'Connected Execution', included: false },
      { label: 'Agent Factory', included: false },
      { label: 'Custom Builds', included: false },
    ],
  },
  {
    name: 'Orbit',
    subtitle: 'Intelligence',
    accent: '#009ADE',
    users: '25 users',
    calls: '5,000 agent calls/mo',
    features: [
      { label: 'Command Center Dashboard', included: true },
      { label: 'Domain Dashboards', included: true },
      { label: 'Role-Based Filtered Views', included: true },
      { label: 'Dashboard Customization', included: true },
      { label: 'Data Connectors', included: true },
      { label: 'Workspace Agents', included: true },
      { label: 'Knowledge Base', included: true },
      { label: 'Action Plans', included: true },
      { label: 'Document Tools', included: true },
      { label: 'Custom Tool Builder', included: true },
      { label: 'Analytics Chat', included: true },
      { label: 'SOP-Driven Discovery', included: false },
      { label: 'Workflow Execution', included: false },
      { label: 'Connected Execution', included: false },
      { label: 'Agent Factory', included: false },
      { label: 'Custom Builds', included: false },
    ],
  },
  {
    name: 'Galaxy',
    subtitle: 'Automation',
    accent: '#C84B0A',
    users: '100 users',
    calls: '25,000 agent calls/mo',
    features: [
      { label: 'Command Center Dashboard', included: true },
      { label: 'Domain Dashboards', included: true },
      { label: 'Role-Based Filtered Views', included: true },
      { label: 'Dashboard Customization', included: true },
      { label: 'Data Connectors', included: true },
      { label: 'Workspace Agents', included: true },
      { label: 'Knowledge Base', included: true },
      { label: 'Action Plans', included: true },
      { label: 'Document Tools', included: true },
      { label: 'Custom Tool Builder', included: true },
      { label: 'Analytics Chat', included: true },
      { label: 'SOP-Driven Discovery', included: true },
      { label: 'Workflow Execution', included: true },
      { label: 'Connected Execution', included: true },
      { label: 'Agent Factory', included: true },
      { label: 'Custom Builds', included: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h1
          className="text-4xl md:text-5xl text-alf-dark text-center mb-4"
          style={{ fontFamily: "var(--font-marketing-heading)" }}
        >
          Pricing
        </h1>
        <p
          className="text-center text-alf-slate mb-16 max-w-xl mx-auto text-lg"
          style={{ fontFamily: "var(--font-marketing-body)" }}
        >
          Start with visibility. Add intelligence. Scale to full automation.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="bg-white rounded-xl border border-alf-bone flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-alf-bone">
                <div
                  className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white mb-3"
                  style={{ backgroundColor: tier.accent, fontFamily: "var(--font-marketing-body)" }}
                >
                  {tier.name}
                </div>
                <div
                  className="text-sm text-alf-slate mb-4"
                  style={{ fontFamily: "var(--font-marketing-body)" }}
                >
                  {tier.subtitle}
                </div>
                <div
                  className="text-xs text-alf-slate mb-1"
                  style={{ fontFamily: "var(--font-marketing-body)" }}
                >
                  {tier.users} &middot; {tier.calls}
                </div>
                <Link
                  to="/request-demo"
                  className="mt-4 block w-full text-center px-4 py-2.5 bg-alf-orange text-white text-sm font-medium rounded-lg hover:bg-alf-orange/90 transition-colors"
                  style={{ fontFamily: "var(--font-marketing-body)" }}
                >
                  Contact Us
                </Link>
              </div>

              {/* Features */}
              <div className="p-6 flex-1">
                <ul className="space-y-3" style={{ fontFamily: "var(--font-marketing-body)" }}>
                  {tier.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2 text-sm">
                      {f.included ? (
                        <span className="text-alf-orange mt-0.5 shrink-0">&#10003;</span>
                      ) : (
                        <span className="text-alf-bone mt-0.5 shrink-0">&mdash;</span>
                      )}
                      <span className={f.included ? 'text-alf-dark' : 'text-alf-bone'}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
