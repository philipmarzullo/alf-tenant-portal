import { useState, useEffect } from 'react';
import { Loader2, Zap, ChevronRight, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DEPT_COLORS } from '../../data/constants';
import MetricCard from '../../components/shared/MetricCard';

const TENANT_ID = import.meta.env.VITE_TENANT_ID;

const DEPARTMENTS = [
  { key: 'hr', label: 'HR' },
  { key: 'finance', label: 'Finance' },
  { key: 'purchasing', label: 'Purchasing' },
  { key: 'sales', label: 'Sales' },
  { key: 'ops', label: 'Ops' },
  { key: 'admin', label: 'Admin' },
  { key: 'general', label: 'General' },
];

const PRIORITY_BADGE = {
  'quick-win': 'bg-green-50 text-green-700',
  'medium-term': 'bg-amber-50 text-amber-700',
  'long-term': 'bg-purple-50 text-purple-700',
};

const EFFORT_BADGE = {
  low: 'bg-green-50 text-green-700',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
};

const IMPACT_BADGE = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-green-50 text-green-700',
};

export default function AutomationInsightsPage() {
  const [analyses, setAnalyses] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDept, setExpandedDept] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: a }, { data: r }] = await Promise.all([
      supabase
        .from('sop_analyses')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('status', 'completed')
        .order('department'),
      supabase
        .from('dept_automation_roadmaps')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('status', 'completed')
        .order('department'),
    ]);
    setAnalyses(a || []);
    setRoadmaps(r || []);
    setLoading(false);
  }

  // Group analyses by department
  const byDept = {};
  for (const a of analyses) {
    if (!byDept[a.department]) byDept[a.department] = [];
    byDept[a.department].push(a);
  }

  // Roadmap lookup
  const roadmapByDept = {};
  for (const r of roadmaps) {
    roadmapByDept[r.department] = r;
  }

  // Departments that have data
  const activeDepts = DEPARTMENTS.filter(d => byDept[d.key]?.length > 0);

  // Global metrics
  const totalAnalyses = analyses.length;
  const avgScore = totalAnalyses
    ? Math.round(analyses.reduce((s, a) => s + (a.analysis?.automation_score || 0), 0) / totalAnalyses)
    : 0;
  const totalQuickWins = analyses.reduce((s, a) => s + (a.analysis?.quick_wins?.length || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  if (activeDepts.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-light text-dark-text mb-1">Automation Insights</h1>
          <p className="text-sm text-secondary-text">AI-powered analysis of your standard operating procedures.</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Zap size={32} className="text-gray-300 mx-auto mb-3" />
          <div className="text-sm text-secondary-text">No automation analyses available yet.</div>
          <div className="text-xs text-secondary-text mt-1">Your platform administrator can run SOP analyses to generate automation insights.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-light text-dark-text mb-1">Automation Insights</h1>
        <p className="text-sm text-secondary-text">AI-powered analysis of your standard operating procedures.</p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Departments Analyzed" value={activeDepts.length} icon={FileText} />
        <MetricCard label="SOPs Analyzed" value={totalAnalyses} icon={FileText} />
        <MetricCard label="Avg Automation Score" value={`${avgScore}/100`} icon={Zap} />
        <MetricCard label="Quick Wins Found" value={totalQuickWins} icon={Zap} />
      </div>

      {/* Department Cards */}
      <div className="space-y-4">
        {activeDepts.map(dept => {
          const deptAnalyses = byDept[dept.key] || [];
          const roadmap = roadmapByDept[dept.key];
          const isExpanded = expandedDept === dept.key;
          const deptAvgScore = Math.round(
            deptAnalyses.reduce((s, a) => s + (a.analysis?.automation_score || 0), 0) / deptAnalyses.length
          );
          const deptQuickWins = deptAnalyses.reduce((s, a) => s + (a.analysis?.quick_wins?.length || 0), 0);
          const deptColor = DEPT_COLORS[dept.key] || '#6B7280';

          return (
            <div key={dept.key} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Department Header */}
              <button
                onClick={() => setExpandedDept(isExpanded ? null : dept.key)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                style={{ borderLeftColor: deptColor, borderLeftWidth: '4px' }}
              >
                <div className="flex-1">
                  <div className="text-base font-medium text-dark-text">{dept.label}</div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-secondary-text">
                    <span>{deptAnalyses.length} SOP{deptAnalyses.length !== 1 ? 's' : ''} analyzed</span>
                    <span>Avg score: {deptAvgScore}/100</span>
                    <span>{deptQuickWins} quick win{deptQuickWins !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Score Indicator */}
                <div className="flex items-center gap-3">
                  <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${deptAvgScore}%`,
                        backgroundColor: deptAvgScore >= 60 ? '#16A34A' : deptAvgScore >= 30 ? '#EAB308' : '#DC2626',
                      }}
                    />
                  </div>
                  <ChevronRight
                    size={16}
                    className={`text-secondary-text transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {/* Roadmap */}
                  {roadmap?.roadmap && (
                    <RoadmapSection roadmap={roadmap.roadmap} />
                  )}

                  {/* Per-SOP Breakdowns */}
                  <div className="px-5 py-4">
                    <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-3">
                      Individual SOP Analyses
                    </div>
                    <div className="space-y-3">
                      {deptAnalyses.map(a => (
                        <SOPAnalysisCard key={a.id} analysis={a} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoadmapSection({ roadmap }) {
  return (
    <div className="px-5 py-4 bg-gray-50 space-y-4">
      <div>
        <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">Automation Roadmap</div>
        <div className="text-sm text-dark-text">{roadmap.summary}</div>
        <div className="flex items-center gap-4 mt-2 text-xs text-secondary-text">
          <span>Overall Score: <strong>{roadmap.overall_automation_score}/100</strong></span>
          {roadmap.total_estimated_monthly_time_saved && (
            <span>Est. Monthly Savings: <strong>{roadmap.total_estimated_monthly_time_saved}</strong></span>
          )}
        </div>
      </div>

      {/* Phases */}
      {roadmap.phases?.map((phase, i) => (
        <div key={i}>
          <div className="text-xs font-semibold text-dark-text mb-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              phase.phase === 'quick-wins' ? 'bg-green-500' :
              phase.phase === 'medium-term' ? 'bg-amber-500' : 'bg-purple-500'
            }`} />
            {phase.label}
          </div>
          {phase.items?.length > 0 ? (
            <div className="space-y-2 ml-4">
              {phase.items.map((item, j) => (
                <div key={j} className="flex items-start gap-3 text-xs">
                  <div className="flex-1">
                    <div className="text-dark-text">{item.description}</div>
                    {item.source_sop && (
                      <div className="text-secondary-text mt-0.5">Source: {item.source_sop}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.effort && (
                      <span className={`px-1.5 py-0.5 rounded ${EFFORT_BADGE[item.effort] || 'bg-gray-100 text-gray-600'}`}>
                        {item.effort}
                      </span>
                    )}
                    {item.impact && (
                      <span className={`px-1.5 py-0.5 rounded ${IMPACT_BADGE[item.impact] || 'bg-gray-100 text-gray-600'}`}>
                        {item.impact}
                      </span>
                    )}
                    {item.estimated_time_saved && (
                      <span className="text-secondary-text">{item.estimated_time_saved}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ml-4 text-xs text-secondary-text italic">No items in this phase.</div>
          )}
        </div>
      ))}

      {/* Recommended First Action */}
      {roadmap.recommended_first_action && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs font-semibold text-blue-800 mb-1">Recommended First Action</div>
          <div className="text-sm text-blue-900">{roadmap.recommended_first_action}</div>
        </div>
      )}
    </div>
  );
}

function SOPAnalysisCard({ analysis }) {
  const [expanded, setExpanded] = useState(false);
  const a = analysis.analysis;
  if (!a) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-dark-text truncate">{a.summary}</div>
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-aa-blue/10 text-aa-blue">
              Score: {a.automation_score}/100
            </span>
            <span className={`px-2 py-0.5 rounded-full ${
              a.automation_readiness === 'high' ? 'bg-green-50 text-green-700' :
              a.automation_readiness === 'medium' ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'
            }`}>
              {a.automation_readiness} readiness
            </span>
            {a.quick_wins?.length > 0 && (
              <span className="text-secondary-text">{a.quick_wins.length} quick win{a.quick_wins.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <ChevronRight size={14} className={`text-secondary-text transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 py-3 border-t border-gray-100 space-y-3">
          {/* Manual Steps */}
          {a.manual_steps?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-secondary-text mb-1">Manual Steps ({a.manual_steps.length})</div>
              <div className="space-y-1">
                {a.manual_steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-secondary-text shrink-0 w-5 text-right">{step.step_number}.</span>
                    <span className="text-dark-text flex-1">{step.description}</span>
                    <span className="text-secondary-text shrink-0">{step.frequency}</span>
                    <span className="text-secondary-text shrink-0">{step.current_effort_minutes}min</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Automation Candidates */}
          {a.automation_candidates?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-secondary-text mb-1">Automation Opportunities</div>
              <div className="space-y-2">
                {a.automation_candidates.map((cand, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-xs text-dark-text mb-1">{cand.description}</div>
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className={`px-1.5 py-0.5 rounded ${PRIORITY_BADGE[cand.priority] || 'bg-gray-100 text-gray-600'}`}>
                        {cand.priority}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${EFFORT_BADGE[cand.effort_to_automate] || ''}`}>
                        Effort: {cand.effort_to_automate}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${IMPACT_BADGE[cand.impact] || ''}`}>
                        Impact: {cand.impact}
                      </span>
                      {cand.estimated_time_saved_minutes_per_occurrence > 0 && (
                        <span className="text-secondary-text">
                          ~{cand.estimated_time_saved_minutes_per_occurrence}min saved
                        </span>
                      )}
                    </div>
                    {cand.suggested_tools?.length > 0 && (
                      <div className="mt-1 text-[11px] text-secondary-text">
                        Tools: {cand.suggested_tools.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Wins */}
          {a.quick_wins?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-secondary-text mb-1">Quick Wins</div>
              <ul className="list-disc list-inside text-xs text-dark-text space-y-0.5">
                {a.quick_wins.map((qw, i) => <li key={i}>{qw}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
