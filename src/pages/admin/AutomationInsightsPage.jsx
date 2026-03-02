import { useState, useEffect, useCallback } from 'react';
import { Loader2, Zap, ChevronRight, FileText, Bot, User, Clock, Filter, MessageSquare, CheckCircle, Play, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getFreshToken } from '../../lib/supabase';
import { DEPT_COLORS } from '../../data/constants';
import MetricCard from '../../components/shared/MetricCard';
import AgentChatPanel from '../../components/shared/AgentChatPanel';
import { useTenantConfig } from '../../contexts/TenantConfigContext';
import { useUser } from '../../contexts/UserContext';
import { useTenantId } from '../../contexts/TenantIdContext';
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const DEPARTMENTS = [
  { key: 'hr', label: 'HR' },
  { key: 'finance', label: 'Finance' },
  { key: 'purchasing', label: 'Purchasing' },
  { key: 'sales', label: 'Sales' },
  { key: 'ops', label: 'Ops' },
  { key: 'admin', label: 'Admin' },
  { key: 'general', label: 'General' },
];

const AGENT_NAMES = {
  hr: 'HR Coordinator',
  finance: 'Finance Agent',
  purchasing: 'Purchasing Agent',
  sales: 'Sales Agent',
  ops: 'Operations Agent',
  admin: 'Admin Agent',
};

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

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'skills', label: 'Agent Skills' },
  { key: 'responsibilities', label: 'Your Responsibilities' },
  { key: 'all', label: 'All Actions' },
];

// ─── Backend API helper ─────────────────────────────────────────────────────

async function sopAnalysisFetch(path, body) {
  const token = await getFreshToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${BACKEND_URL}/api/sop-analysis${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AutomationInsightsPage() {
  const { hasAction } = useTenantConfig();
  const { isAdmin } = useUser();
  const { tenantId } = useTenantId();
  const canSelfService = isAdmin && hasAction('automation', 'selfServicePipeline');

  const [analyses, setAnalyses] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [actions, setActions] = useState([]);
  const [sopDocs, setSopDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedDept, setExpandedDept] = useState(null);
  const [filterDept, setFilterDept] = useState('all');
  const [chatAgent, setChatAgent] = useState(null);

  // Pipeline operation state
  const [pipelineBusy, setPipelineBusy] = useState(null); // string key of what's running
  const [pipelineError, setPipelineError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const promises = [
      supabase
        .from('sop_analyses')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .order('department'),
      supabase
        .from('dept_automation_roadmaps')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .order('department'),
      supabase
        .from('automation_actions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true }),
    ];

    // Load SOP docs when self-service is enabled
    if (canSelfService) {
      promises.push(
        supabase
          .from('tenant_documents')
          .select('id, file_name, department, doc_type, status')
          .eq('tenant_id', tenantId)
          .eq('doc_type', 'sop')
          .eq('status', 'extracted')
          .order('department'),
      );
    }

    const results = await Promise.all(promises);
    setAnalyses(results[0].data || []);
    setRoadmaps(results[1].data || []);
    setActions(results[2].data || []);
    if (canSelfService && results[3]) {
      setSopDocs(results[3].data || []);
    }
    setLoading(false);
  }, [canSelfService]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpdateNotes(actionId, notes) {
    await supabase
      .from('automation_actions')
      .update({ tenant_notes: notes })
      .eq('id', actionId);
    await loadData();
  }

  // ─── Self-service pipeline handlers ─────────────────────────────────────

  async function handleAnalyze(documentIds) {
    setPipelineBusy('analyze');
    setPipelineError(null);
    try {
      await sopAnalysisFetch('/analyze', { document_ids: documentIds });
      await loadData();
    } catch (err) {
      setPipelineError(err.message);
    } finally {
      setPipelineBusy(null);
    }
  }

  async function handleGenerateRoadmap(department) {
    setPipelineBusy(`roadmap-${department}`);
    setPipelineError(null);
    try {
      await sopAnalysisFetch('/roadmap', { department });
      await loadData();
    } catch (err) {
      setPipelineError(err.message);
    } finally {
      setPipelineBusy(null);
    }
  }

  async function handleConvertToActions(roadmapId) {
    setPipelineBusy(`actions-${roadmapId}`);
    setPipelineError(null);
    try {
      await sopAnalysisFetch('/convert-to-actions', { roadmap_id: roadmapId });
      await loadData();
    } catch (err) {
      setPipelineError(err.message);
    } finally {
      setPipelineBusy(null);
    }
  }

  async function handleGenerateSkill(actionId) {
    setPipelineBusy(`skill-${actionId}`);
    setPipelineError(null);
    try {
      await sopAnalysisFetch('/generate-skill', { action_id: actionId });
      await loadData();
    } catch (err) {
      setPipelineError(err.message);
    } finally {
      setPipelineBusy(null);
    }
  }

  async function handleActivateSkill(actionId) {
    setPipelineBusy(`activate-${actionId}`);
    setPipelineError(null);
    try {
      await sopAnalysisFetch('/activate-skill', { action_id: actionId });
      await loadData();
    } catch (err) {
      setPipelineError(err.message);
    } finally {
      setPipelineBusy(null);
    }
  }

  async function handleBatchGenerateSkills(actionIds) {
    setPipelineBusy('batch-skills');
    setPipelineError(null);
    try {
      for (const id of actionIds) {
        await sopAnalysisFetch('/generate-skill', { action_id: id });
      }
      await loadData();
    } catch (err) {
      setPipelineError(err.message);
    } finally {
      setPipelineBusy(null);
    }
  }

  async function handleDeactivateSkill(actionId) {
    setPipelineBusy(`deactivate-${actionId}`);
    setPipelineError(null);
    try {
      await sopAnalysisFetch('/deactivate-skill', { action_id: actionId });
      await loadData();
    } catch (err) {
      setPipelineError(err.message);
    } finally {
      setPipelineBusy(null);
    }
  }

  async function handleBatchActivateSkills(actionIds) {
    setPipelineBusy('batch-activate');
    setPipelineError(null);
    try {
      for (const id of actionIds) {
        await sopAnalysisFetch('/activate-skill', { action_id: id });
      }
      await loadData();
    } catch (err) {
      setPipelineError(err.message);
    } finally {
      setPipelineBusy(null);
    }
  }

  // ─── Derived data ───────────────────────────────────────────────────────

  const activeActions = actions.filter(a => a.status === 'active');
  const readyActions = actions.filter(a => a.status === 'ready_for_review');
  const manualActions = actions.filter(a => a.status === 'manual' || (a.assignee_type === 'human'));
  const plannedActions = actions.filter(a => a.status === 'planned');

  const totalTimeSaved = activeActions
    .map(a => {
      const match = a.estimated_time_saved?.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    })
    .reduce((sum, v) => sum + v, 0);

  // Group analyses by department
  const byDept = {};
  for (const a of analyses) {
    if (!byDept[a.department]) byDept[a.department] = [];
    byDept[a.department].push(a);
  }
  const roadmapByDept = {};
  for (const r of roadmaps) {
    roadmapByDept[r.department] = r;
  }

  // Group SOP docs by department (for self-service)
  const sopDocsByDept = {};
  for (const doc of sopDocs) {
    if (!sopDocsByDept[doc.department]) sopDocsByDept[doc.department] = [];
    sopDocsByDept[doc.department].push(doc);
  }

  // Departments that have analyses OR unanalyzed SOPs
  const deptKeys = new Set([
    ...Object.keys(byDept),
    ...(canSelfService ? Object.keys(sopDocsByDept) : []),
  ]);
  const activeDepts = DEPARTMENTS.filter(d => deptKeys.has(d.key));

  const hasActionsData = actions.length > 0;
  const hasAnalyses = analyses.length > 0;
  const hasSopDocs = sopDocs.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  if (!hasAnalyses && !hasActionsData && !hasSopDocs) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-light text-dark-text mb-1">Automation Workboard</h1>
          <p className="text-sm text-secondary-text">Track automations, agent skills, and responsibilities across your operations.</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Zap size={32} className="text-gray-300 mx-auto mb-3" />
          <div className="text-sm text-secondary-text">No automation data available yet.</div>
          <div className="text-xs text-secondary-text mt-1">
            {canSelfService
              ? 'Upload SOPs in Knowledge Base, then analyze them here.'
              : 'Your platform administrator can run SOP analyses to generate automation insights and actions.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-light text-dark-text mb-1">Automation Workboard</h1>
        <p className="text-sm text-secondary-text">Track automations, agent skills, and responsibilities across your operations.</p>
      </div>

      {/* Pipeline Error */}
      {pipelineError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <div className="text-sm text-red-800 flex-1">{pipelineError}</div>
          <button onClick={() => setPipelineError(null)} className="text-red-400 hover:text-red-600 text-xs">dismiss</button>
        </div>
      )}

      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Active Automations"
          value={activeActions.length}
          icon={Bot}
          color="#16A34A"
        />
        <MetricCard
          label="Ready for Review"
          value={readyActions.length}
          icon={Clock}
          color={readyActions.length > 0 ? '#D97706' : undefined}
        />
        <MetricCard
          label="Your Responsibilities"
          value={manualActions.length}
          icon={User}
        />
        <MetricCard
          label="Est. Time Saved"
          value={totalTimeSaved > 0 ? `${totalTimeSaved} hrs/mo` : '--'}
          icon={Zap}
          color={totalTimeSaved > 0 ? '#009ADE' : undefined}
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-aa-blue text-aa-blue'
                : 'border-transparent text-secondary-text hover:text-dark-text'
            }`}
          >
            {tab.label}
            {tab.key === 'skills' && activeActions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[11px] rounded-full bg-green-50 text-green-700">
                {activeActions.length}
              </span>
            )}
            {tab.key === 'responsibilities' && manualActions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-600">
                {manualActions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          activeDepts={activeDepts}
          byDept={byDept}
          roadmapByDept={roadmapByDept}
          sopDocsByDept={sopDocsByDept}
          expandedDept={expandedDept}
          setExpandedDept={setExpandedDept}
          canSelfService={canSelfService}
          pipelineBusy={pipelineBusy}
          onAnalyze={handleAnalyze}
          onGenerateRoadmap={handleGenerateRoadmap}
          onConvertToActions={handleConvertToActions}
          actions={actions}
        />
      )}

      {activeTab === 'skills' && (
        <AgentSkillsTab
          actions={[...activeActions, ...readyActions]}
          plannedActions={plannedActions}
          onRunWithAgent={(agentKey) => setChatAgent(agentKey)}
          canSelfService={canSelfService}
          pipelineBusy={pipelineBusy}
          onGenerateSkill={handleGenerateSkill}
          onActivateSkill={handleActivateSkill}
          onDeactivateSkill={handleDeactivateSkill}
          onBatchGenerateSkills={handleBatchGenerateSkills}
          onBatchActivateSkills={handleBatchActivateSkills}
        />
      )}

      {activeTab === 'responsibilities' && (
        <ResponsibilitiesTab
          actions={manualActions}
          onUpdateNotes={handleUpdateNotes}
        />
      )}

      {activeTab === 'all' && (
        <AllActionsTab
          actions={actions}
          filterDept={filterDept}
          setFilterDept={setFilterDept}
          onRunWithAgent={(agentKey) => setChatAgent(agentKey)}
        />
      )}

      {/* Agent Chat Panel */}
      <AgentChatPanel
        open={!!chatAgent}
        onClose={() => setChatAgent(null)}
        agentKey={chatAgent || 'hr'}
        agentName={AGENT_NAMES[chatAgent] || 'Agent'}
        context="your automation tasks and SOP procedures"
      />
    </div>
  );
}

/* ─── Overview Tab ─── */

function OverviewTab({
  activeDepts, byDept, roadmapByDept, sopDocsByDept, expandedDept, setExpandedDept,
  canSelfService, pipelineBusy, onAnalyze, onGenerateRoadmap, onConvertToActions, actions,
}) {
  return (
    <div className="space-y-4">
      {/* Self-service: batch analyze all SOPs */}
      {canSelfService && Object.keys(sopDocsByDept).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm text-blue-800">
            {Object.values(sopDocsByDept).flat().length} SOP document{Object.values(sopDocsByDept).flat().length !== 1 ? 's' : ''} available for analysis.
          </div>
          <button
            onClick={() => onAnalyze(Object.values(sopDocsByDept).flat().map(d => d.id))}
            disabled={!!pipelineBusy}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-aa-blue text-white hover:bg-aa-blue/90 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {pipelineBusy === 'analyze' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            Analyze All
          </button>
        </div>
      )}

      {activeDepts.map(dept => {
        const deptAnalyses = byDept[dept.key] || [];
        const roadmap = roadmapByDept[dept.key];
        const isExpanded = expandedDept === dept.key;
        const deptSopDocs = sopDocsByDept[dept.key] || [];
        const deptColor = DEPT_COLORS[dept.key] || '#6B7280';

        // Find unanalyzed SOPs (docs not yet in analyses)
        const analyzedDocIds = new Set(deptAnalyses.map(a => a.document_id));
        const unanalyzedDocs = deptSopDocs.filter(d => !analyzedDocIds.has(d.id));

        // Check if this dept has actions already
        const deptActions = actions.filter(a => a.department === dept.key);

        const deptAvgScore = deptAnalyses.length
          ? Math.round(deptAnalyses.reduce((s, a) => s + (a.analysis?.automation_score || 0), 0) / deptAnalyses.length)
          : 0;

        return (
          <div key={dept.key} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setExpandedDept(isExpanded ? null : dept.key)}
              className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
              style={{ borderLeftColor: deptColor, borderLeftWidth: '4px' }}
            >
              <div className="flex-1">
                <div className="text-base font-medium text-dark-text">{dept.label}</div>
                <div className="flex items-center gap-4 mt-1 text-xs text-secondary-text">
                  {deptAnalyses.length > 0 && (
                    <span>{deptAnalyses.length} SOP{deptAnalyses.length !== 1 ? 's' : ''} analyzed</span>
                  )}
                  {deptAvgScore > 0 && <span>Score: {deptAvgScore}/100</span>}
                  {canSelfService && unanalyzedDocs.length > 0 && (
                    <span className="text-aa-blue">{unanalyzedDocs.length} awaiting analysis</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {deptAvgScore > 0 && (
                  <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${deptAvgScore}%`,
                        backgroundColor: deptAvgScore >= 60 ? '#16A34A' : deptAvgScore >= 30 ? '#EAB308' : '#DC2626',
                      }}
                    />
                  </div>
                )}
                <ChevronRight
                  size={16}
                  className={`text-secondary-text transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100">
                {/* Self-service: Analyze unanalyzed SOPs */}
                {canSelfService && unanalyzedDocs.length > 0 && (
                  <div className="px-5 py-3 bg-blue-50/50 border-b border-gray-100">
                    <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
                      SOPs Awaiting Analysis
                    </div>
                    <div className="space-y-1.5">
                      {unanalyzedDocs.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-dark-text">
                            <FileText size={12} className="text-secondary-text" />
                            {doc.file_name}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onAnalyze([doc.id]); }}
                            disabled={!!pipelineBusy}
                            className="px-2 py-1 text-xs font-medium rounded bg-aa-blue text-white hover:bg-aa-blue/90 disabled:opacity-50 flex items-center gap-1"
                          >
                            {pipelineBusy === 'analyze' ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                            Analyze
                          </button>
                        </div>
                      ))}
                    </div>
                    {unanalyzedDocs.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onAnalyze(unanalyzedDocs.map(d => d.id)); }}
                        disabled={!!pipelineBusy}
                        className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-aa-blue/30 text-aa-blue hover:bg-aa-blue/5 disabled:opacity-50"
                      >
                        Analyze All ({unanalyzedDocs.length})
                      </button>
                    )}
                  </div>
                )}

                {/* Self-service: Generate roadmap button */}
                {canSelfService && deptAnalyses.length > 0 && !roadmap && (
                  <div className="px-5 py-3 bg-amber-50/50 border-b border-gray-100 flex items-center justify-between">
                    <div className="text-xs text-amber-800">
                      {deptAnalyses.length} analysis{deptAnalyses.length !== 1 ? 'es' : ''} ready — generate a roadmap to plan your automation strategy.
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onGenerateRoadmap(dept.key); }}
                      disabled={!!pipelineBusy}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {pipelineBusy === `roadmap-${dept.key}` ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                      Generate Roadmap
                    </button>
                  </div>
                )}

                {roadmap?.roadmap && (
                  <RoadmapSection roadmap={roadmap.roadmap} />
                )}

                {/* Self-service: Convert to actions button */}
                {canSelfService && roadmap && deptActions.length === 0 && (
                  <div className="px-5 py-3 bg-green-50/50 border-b border-gray-100 flex items-center justify-between">
                    <div className="text-xs text-green-800">
                      Roadmap ready — convert to trackable actions and agent skills.
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onConvertToActions(roadmap.id); }}
                      disabled={!!pipelineBusy}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {pipelineBusy === `actions-${roadmap.id}` ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                      Convert to Actions
                    </button>
                  </div>
                )}

                {deptAnalyses.length > 0 && (
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
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Agent Skills Tab ─── */

function AgentSkillsTab({
  actions, plannedActions, onRunWithAgent,
  canSelfService, pipelineBusy, onGenerateSkill, onActivateSkill, onDeactivateSkill,
  onBatchGenerateSkills, onBatchActivateSkills,
}) {
  // Planned actions that can have skills generated (agent or hybrid)
  const skillableActions = (plannedActions || []).filter(
    a => a.assignee_type === 'agent' || a.assignee_type === 'hybrid'
  );
  const readyForActivation = actions.filter(a => a.status === 'ready_for_review');

  if (actions.length === 0 && skillableActions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Bot size={32} className="text-gray-300 mx-auto mb-3" />
        <div className="text-sm text-secondary-text">No agent skills available yet.</div>
        <div className="text-xs text-secondary-text mt-1">
          {canSelfService
            ? 'Generate skills from planned actions on the Overview tab.'
            : 'Skills are generated from your SOP analysis and activated by your platform administrator.'}
        </div>
      </div>
    );
  }

  // Group by agent
  const byAgent = {};
  for (const a of actions) {
    const key = a.agent_key || 'other';
    if (!byAgent[key]) byAgent[key] = [];
    byAgent[key].push(a);
  }

  return (
    <div className="space-y-4">
      {/* Self-service batch buttons */}
      {canSelfService && (skillableActions.length > 0 || readyForActivation.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {skillableActions.length > 0 && (
            <button
              onClick={() => onBatchGenerateSkills(skillableActions.map(a => a.id))}
              disabled={!!pipelineBusy}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 flex items-center gap-1"
            >
              {pipelineBusy === 'batch-skills' ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
              Generate All Skills ({skillableActions.length})
            </button>
          )}
          {readyForActivation.length > 0 && (
            <button
              onClick={() => onBatchActivateSkills(readyForActivation.map(a => a.id))}
              disabled={!!pipelineBusy}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50 flex items-center gap-1"
            >
              {pipelineBusy === 'batch-activate' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Activate All ({readyForActivation.length})
            </button>
          )}
        </div>
      )}

      {/* Planned actions needing skill generation (self-service only) */}
      {canSelfService && skillableActions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            <span className="text-sm font-medium text-dark-text">
              Planned Actions ({skillableActions.length})
            </span>
            <span className="text-xs text-secondary-text">Ready for skill generation</span>
          </div>
          <div className="divide-y divide-gray-100">
            {skillableActions.map(action => (
              <div key={action.id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-amber-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-dark-text">{action.title}</div>
                  <div className="text-xs text-secondary-text mt-0.5">{action.description}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                      action.assignee_type === 'agent' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {action.assignee_type}
                    </span>
                    {action.agent_key && (
                      <span className="text-[11px] text-secondary-text">{AGENT_NAMES[action.agent_key] || action.agent_key}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onGenerateSkill(action.id)}
                  disabled={!!pipelineBusy}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 flex items-center gap-1 shrink-0"
                >
                  {pipelineBusy === `skill-${action.id}` ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  Generate Skill
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.entries(byAgent).map(([agentKey, agentActions]) => (
        <div key={agentKey} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-aa-blue" />
              <span className="text-sm font-medium text-dark-text">
                {AGENT_NAMES[agentKey] || agentKey}
              </span>
              <span className="text-xs text-secondary-text">
                {agentActions.filter(a => a.status === 'active').length} active skill{agentActions.filter(a => a.status === 'active').length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => onRunWithAgent(agentKey)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-aa-blue text-white hover:bg-aa-blue/90 transition-colors flex items-center gap-1"
            >
              <MessageSquare size={12} />
              Chat with Agent
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {agentActions.map(action => (
              <div key={action.id} className="px-4 py-3 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  action.status === 'active' ? 'bg-green-500' : 'bg-amber-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-dark-text">{action.title}</div>
                  <div className="text-xs text-secondary-text mt-0.5">{action.description}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {action.status === 'active' ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-50 text-green-700">Active</span>
                    ) : (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Ready for Review</span>
                    )}
                    {action.estimated_time_saved && (
                      <span className="text-[11px] text-secondary-text">Saves {action.estimated_time_saved}</span>
                    )}
                    {action.phase && (
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${PRIORITY_BADGE[action.phase] || ''}`}>
                        {action.phase}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canSelfService && action.status === 'ready_for_review' && (
                    <button
                      onClick={() => onActivateSkill(action.id)}
                      disabled={!!pipelineBusy}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50 flex items-center gap-1"
                    >
                      {pipelineBusy === `activate-${action.id}` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Activate
                    </button>
                  )}
                  {action.status === 'active' && (
                    <>
                      <button
                        onClick={() => onRunWithAgent(agentKey)}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-aa-blue/30 text-aa-blue hover:bg-aa-blue/5 transition-colors flex items-center gap-1"
                      >
                        <Bot size={12} />
                        Run
                      </button>
                      {canSelfService && (
                        <button
                          onClick={() => onDeactivateSkill(action.id)}
                          disabled={!!pipelineBusy}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center gap-1"
                        >
                          {pipelineBusy === `deactivate-${action.id}` ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                          Deactivate
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Your Responsibilities Tab ─── */

function ResponsibilitiesTab({ actions, onUpdateNotes }) {
  const [editingNotes, setEditingNotes] = useState(null);
  const [noteText, setNoteText] = useState('');

  if (actions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <User size={32} className="text-gray-300 mx-auto mb-3" />
        <div className="text-sm text-secondary-text">No manual responsibilities identified.</div>
        <div className="text-xs text-secondary-text mt-1">All automation items are either handled by agents or pending configuration.</div>
      </div>
    );
  }

  // Group by department
  const byDept = {};
  for (const a of actions) {
    if (!byDept[a.department]) byDept[a.department] = [];
    byDept[a.department].push(a);
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-sm text-blue-800">
          These items require your expertise and judgment. They represent areas where human decision-making, compliance authority, or system access is needed.
        </div>
      </div>

      {Object.entries(byDept).map(([dept, deptActions]) => {
        const deptInfo = DEPARTMENTS.find(d => d.key === dept);
        const deptColor = DEPT_COLORS[dept] || '#6B7280';

        return (
          <div key={dept} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div
              className="px-4 py-3 border-b border-gray-100 flex items-center gap-2"
              style={{ borderLeftColor: deptColor, borderLeftWidth: '4px' }}
            >
              <User size={16} className="text-secondary-text" />
              <span className="text-sm font-medium text-dark-text">
                {deptInfo?.label || dept} ({deptActions.length})
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {deptActions.map(action => (
                <div key={action.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-dark-text">{action.title}</div>
                      <div className="text-xs text-secondary-text mt-0.5">{action.description}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {action.effort && (
                          <span className={`text-[11px] px-1.5 py-0.5 rounded ${EFFORT_BADGE[action.effort] || ''}`}>
                            Effort: {action.effort}
                          </span>
                        )}
                        {action.source_sop && (
                          <span className="text-[11px] text-secondary-text">
                            SOP: {action.source_sop}
                          </span>
                        )}
                        {action.phase && (
                          <span className={`text-[11px] px-1.5 py-0.5 rounded ${PRIORITY_BADGE[action.phase] || ''}`}>
                            {action.phase}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {editingNotes === action.id ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-aa-blue"
                        placeholder="Add your notes..."
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          onUpdateNotes(action.id, noteText);
                          setEditingNotes(null);
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-aa-blue text-white hover:bg-aa-blue/90"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingNotes(null)}
                        className="px-3 py-1.5 text-xs text-secondary-text hover:text-dark-text"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2">
                      {action.tenant_notes ? (
                        <div
                          className="text-xs text-secondary-text bg-gray-50 rounded px-3 py-1.5 cursor-pointer hover:bg-gray-100"
                          onClick={() => { setEditingNotes(action.id); setNoteText(action.tenant_notes); }}
                        >
                          {action.tenant_notes}
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingNotes(action.id); setNoteText(''); }}
                          className="text-xs text-aa-blue hover:underline"
                        >
                          + Add notes
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── All Actions Tab ─── */

function AllActionsTab({ actions, filterDept, setFilterDept, onRunWithAgent }) {
  const deptOptions = [{ key: 'all', label: 'All Departments' }, ...DEPARTMENTS];

  const filtered = filterDept === 'all'
    ? actions
    : actions.filter(a => a.department === filterDept);

  // Filter out dismissed
  const visible = filtered.filter(a => a.status !== 'dismissed');

  return (
    <div className="space-y-4">
      {/* Department filter */}
      <div className="flex flex-wrap gap-2">
        {deptOptions.map(dept => (
          <button
            key={dept.key}
            onClick={() => setFilterDept(dept.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filterDept === dept.key
                ? 'bg-aa-blue/10 text-aa-blue border border-aa-blue/30'
                : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
            }`}
          >
            {dept.label}
          </button>
        ))}
      </div>

      {/* Actions table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Filter size={16} className="text-secondary-text" />
          <span className="text-sm font-medium text-dark-text">
            {visible.length} action{visible.length !== 1 ? 's' : ''}
          </span>
        </div>

        {visible.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-secondary-text">
            No actions found{filterDept !== 'all' ? ` for ${filterDept}` : ''}.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visible.map(action => {
              const deptColor = DEPT_COLORS[action.department] || '#6B7280';
              return (
                <div
                  key={action.id}
                  className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                  style={{ borderLeftColor: deptColor, borderLeftWidth: '3px' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-dark-text">{action.title}</div>
                    <div className="text-xs text-secondary-text mt-0.5 line-clamp-2">{action.description}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        {action.department}
                      </span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                        action.assignee_type === 'agent' ? 'bg-green-50 text-green-700' :
                        action.assignee_type === 'hybrid' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {action.assignee_type}
                      </span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                        action.status === 'active' ? 'bg-green-50 text-green-700' :
                        action.status === 'ready_for_review' ? 'bg-blue-50 text-blue-700' :
                        action.status === 'manual' ? 'bg-gray-100 text-gray-600' :
                        action.status === 'planned' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {action.status.replace(/_/g, ' ')}
                      </span>
                      {action.effort && (
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${EFFORT_BADGE[action.effort] || ''}`}>
                          {action.effort}
                        </span>
                      )}
                      {action.impact && (
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${IMPACT_BADGE[action.impact] || ''}`}>
                          {action.impact}
                        </span>
                      )}
                      {action.estimated_time_saved && (
                        <span className="text-[11px] text-secondary-text">{action.estimated_time_saved}</span>
                      )}
                    </div>
                  </div>

                  {action.status === 'active' && action.agent_key && (
                    <button
                      onClick={() => onRunWithAgent(action.agent_key)}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-aa-blue/30 text-aa-blue hover:bg-aa-blue/5 transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Bot size={12} />
                      Run
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Shared Sub-components ─── */

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
          </div>
        </div>
        <ChevronRight size={14} className={`text-secondary-text transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 py-3 border-t border-gray-100 space-y-3">
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
