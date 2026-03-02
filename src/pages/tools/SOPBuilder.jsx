import { useState, useEffect, useCallback } from 'react';
import { FileText, ChevronRight, CheckCircle, Loader2, Zap, Bot, ArrowRight, ArrowLeft, AlertCircle, Play } from 'lucide-react';
import { supabase, getFreshToken } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const STEPS = [
  { key: 'select', label: 'Select SOPs', description: 'Choose documents to analyze' },
  { key: 'analyze', label: 'Analyze', description: 'AI analyzes each SOP' },
  { key: 'roadmap', label: 'Roadmap', description: 'Generate department roadmap' },
  { key: 'actions', label: 'Actions', description: 'Convert to trackable actions' },
  { key: 'skills', label: 'Skills', description: 'Generate & activate agent skills' },
];

// ─── API helper ──────────────────────────────────────────────────────────────

async function sopFetch(path, body) {
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

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ currentStep, completedSteps }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((step, idx) => {
        const isCompleted = completedSteps.has(step.key);
        const isCurrent = currentStep === step.key;
        const isPast = STEPS.findIndex(s => s.key === currentStep) > idx;

        return (
          <div key={step.key} className="flex items-center gap-1 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-medium ${
                isCompleted ? 'bg-green-500 text-white'
                : isCurrent ? 'bg-aa-blue text-white'
                : isPast ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-secondary-text'
              }`}>
                {isCompleted ? <CheckCircle size={14} /> : idx + 1}
              </div>
              <div className="min-w-0 hidden sm:block">
                <div className={`text-xs font-medium truncate ${isCurrent ? 'text-dark-text' : 'text-secondary-text'}`}>
                  {step.label}
                </div>
              </div>
            </div>
            {idx < STEPS.length - 1 && (
              <ChevronRight size={14} className="text-gray-300 shrink-0 mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Select SOPs ─────────────────────────────────────────────────────

function SelectStep({ tenantId, selected, setSelected, onNext }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [existingAnalyses, setExistingAnalyses] = useState({});

  useEffect(() => {
    async function load() {
      const { data: allDocs } = await supabase
        .from('tenant_documents')
        .select('id, file_name, department, doc_type, char_count, created_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'extracted')
        .order('department')
        .order('file_name');

      setDocs(allDocs || []);

      // Check which docs already have analyses
      const { data: analyses } = await supabase
        .from('sop_analyses')
        .select('document_id, status')
        .eq('tenant_id', tenantId);

      const map = {};
      for (const a of (analyses || [])) {
        map[a.document_id] = a.status;
      }
      setExistingAnalyses(map);
      setLoading(false);
    }
    load();
  }, [tenantId]);

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const unanalyzed = docs.filter(d => !existingAnalyses[d.id] || existingAnalyses[d.id] === 'failed');
    setSelected(unanalyzed.map(d => d.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <FileText size={32} className="text-gray-300 mx-auto mb-3" />
        <div className="text-sm text-secondary-text">No extracted documents found.</div>
        <div className="text-xs text-secondary-text mt-1">
          Upload SOPs in the Knowledge Base first. Documents must be extracted before analysis.
        </div>
      </div>
    );
  }

  // Group by department
  const byDept = {};
  for (const d of docs) {
    const dept = d.department || 'general';
    if (!byDept[dept]) byDept[dept] = [];
    byDept[dept].push(d);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-secondary-text">
          Select SOP documents to analyze. Already-analyzed documents are marked.
        </p>
        <button onClick={selectAll} className="text-xs font-medium text-aa-blue hover:text-aa-blue/80">
          Select unanalyzed
        </button>
      </div>

      <div className="space-y-3">
        {Object.entries(byDept).map(([dept, deptDocs]) => (
          <div key={dept} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-secondary-text uppercase">{dept}</span>
              <span className="text-xs text-secondary-text ml-2">({deptDocs.length} docs)</span>
            </div>
            <div className="divide-y divide-gray-100">
              {deptDocs.map(doc => {
                const analysisStatus = existingAnalyses[doc.id];
                const isSelected = selected.includes(doc.id);
                const alreadyCompleted = analysisStatus === 'completed';

                return (
                  <label key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(doc.id)}
                      className="rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-dark-text truncate">{doc.file_name}</div>
                      <div className="text-xs text-secondary-text">
                        {doc.doc_type} · {(doc.char_count || 0).toLocaleString()} chars
                      </div>
                    </div>
                    {alreadyCompleted && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-50 text-green-700">Analyzed</span>
                    )}
                    {analysisStatus === 'failed' && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-700">Failed</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-aa-blue text-white hover:bg-aa-blue/90 disabled:opacity-40 flex items-center gap-2"
        >
          Analyze {selected.length} Document{selected.length !== 1 ? 's' : ''}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Analyze ─────────────────────────────────────────────────────────

function AnalyzeStep({ tenantId, selectedDocs, results, setResults, onNext, onBack }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  async function runAnalysis() {
    setRunning(true);
    setError(null);
    try {
      const data = await sopFetch('/analyze', { document_ids: selectedDocs });
      setResults(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    if (results.length === 0 && selectedDocs.length > 0) {
      runAnalysis();
    }
  }, []);

  const completed = results.filter(r => r.status === 'completed');
  const failed = results.filter(r => r.status === 'failed');

  return (
    <div>
      {running && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Loader2 size={24} className="text-aa-blue animate-spin mx-auto mb-3" />
          <div className="text-sm text-dark-text">Analyzing {selectedDocs.length} document{selectedDocs.length !== 1 ? 's' : ''}...</div>
          <div className="text-xs text-secondary-text mt-1">This may take a minute per document.</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-red-800">Analysis failed</div>
              <div className="text-xs text-red-700 mt-0.5">{error}</div>
            </div>
          </div>
        </div>
      )}

      {!running && results.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-sm text-dark-text">
              {completed.length} of {results.length} analyzed successfully
            </span>
          </div>

          <div className="space-y-3">
            {results.map((r, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-dark-text">
                    {r.analysis?.summary ? r.analysis.summary.slice(0, 80) : `Document ${idx + 1}`}
                  </span>
                  {r.status === 'completed' ? (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-50 text-green-700">Completed</span>
                  ) : (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-700">Failed</span>
                  )}
                </div>
                {r.analysis && (
                  <div className="flex items-center gap-4 text-xs text-secondary-text">
                    <span>Score: {r.analysis.automation_score}/100</span>
                    <span>Manual steps: {r.analysis.manual_steps?.length || 0}</span>
                    <span>Candidates: {r.analysis.automation_candidates?.length || 0}</span>
                    <span>Readiness: {r.analysis.automation_readiness}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={onBack} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-secondary-text hover:text-dark-text flex items-center gap-2">
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={onNext}
              disabled={completed.length === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-aa-blue text-white hover:bg-aa-blue/90 disabled:opacity-40 flex items-center gap-2"
            >
              Generate Roadmap <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Roadmap ─────────────────────────────────────────────────────────

function RoadmapStep({ tenantId, analysisResults, roadmapData, setRoadmapData, onNext, onBack }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  // Determine departments from completed analyses
  const departments = [...new Set(
    analysisResults
      .filter(r => r.status === 'completed' && r.analysis)
      .map(r => r.analysis?.department || 'ops')
  )];

  async function generateRoadmap() {
    setRunning(true);
    setError(null);
    const results = [];
    try {
      for (const dept of departments) {
        const data = await sopFetch('/roadmap', { department: dept });
        results.push({ department: dept, ...data });
      }
      setRoadmapData(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    if (roadmapData.length === 0 && departments.length > 0) {
      generateRoadmap();
    }
  }, []);

  return (
    <div>
      {running && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Loader2 size={24} className="text-aa-blue animate-spin mx-auto mb-3" />
          <div className="text-sm text-dark-text">Generating roadmap for {departments.join(', ')}...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {!running && roadmapData.length > 0 && (
        <div>
          {roadmapData.map((rm, idx) => (
            <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-dark-text capitalize">{rm.department} Roadmap</h3>
                {rm.roadmap?.overall_automation_score && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-aa-blue/10 text-aa-blue font-medium">
                    Score: {rm.roadmap.overall_automation_score}
                  </span>
                )}
              </div>
              {rm.roadmap?.summary && (
                <p className="text-xs text-secondary-text mb-3">{rm.roadmap.summary}</p>
              )}
              {rm.roadmap?.phases?.map((phase, pi) => (
                <div key={pi} className="mb-2">
                  <div className="text-xs font-medium text-dark-text mb-1">{phase.label}</div>
                  <div className="space-y-1">
                    {phase.items?.map((item, ii) => (
                      <div key={ii} className="text-xs text-secondary-text pl-3 border-l-2 border-gray-200">
                        {item.description}
                        {item.estimated_time_saved && (
                          <span className="text-aa-blue ml-2">({item.estimated_time_saved})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {rm.roadmap?.total_estimated_monthly_time_saved && (
                <div className="text-xs font-medium text-green-700 mt-2">
                  Est. monthly savings: {rm.roadmap.total_estimated_monthly_time_saved}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-between mt-6">
            <button onClick={onBack} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-secondary-text hover:text-dark-text flex items-center gap-2">
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={onNext}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-aa-blue text-white hover:bg-aa-blue/90 flex items-center gap-2"
            >
              Convert to Actions <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Actions ─────────────────────────────────────────────────────────

function ActionsStep({ tenantId, roadmapData, actionsData, setActionsData, onNext, onBack }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  async function convertToActions() {
    setRunning(true);
    setError(null);
    const allActions = [];
    try {
      for (const rm of roadmapData) {
        if (rm.roadmap_id) {
          const data = await sopFetch('/convert-to-actions', { roadmap_id: rm.roadmap_id });
          allActions.push(...(data.actions || []));
        }
      }
      setActionsData(allActions);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    if (actionsData.length === 0 && roadmapData.length > 0) {
      convertToActions();
    }
  }, []);

  const byType = {
    agent: actionsData.filter(a => a.assignee_type === 'agent'),
    hybrid: actionsData.filter(a => a.assignee_type === 'hybrid'),
    human: actionsData.filter(a => a.assignee_type === 'human'),
  };

  const TYPE_LABELS = { agent: 'Agent', hybrid: 'Hybrid', human: 'Manual' };
  const TYPE_COLORS = {
    agent: 'bg-green-50 text-green-700',
    hybrid: 'bg-blue-50 text-blue-700',
    human: 'bg-gray-100 text-gray-600',
  };

  return (
    <div>
      {running && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Loader2 size={24} className="text-aa-blue animate-spin mx-auto mb-3" />
          <div className="text-sm text-dark-text">Classifying roadmap items into actions...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {!running && actionsData.length > 0 && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-dark-text font-medium">{actionsData.length} actions created</span>
            {Object.entries(byType).map(([type, items]) => items.length > 0 && (
              <span key={type} className={`text-[11px] px-1.5 py-0.5 rounded ${TYPE_COLORS[type]}`}>
                {TYPE_LABELS[type]}: {items.length}
              </span>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {actionsData.map(action => (
              <div key={action.id} className="px-4 py-3 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  action.assignee_type === 'agent' ? 'bg-green-500'
                  : action.assignee_type === 'hybrid' ? 'bg-blue-500'
                  : 'bg-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-dark-text">{action.title}</div>
                  <div className="text-xs text-secondary-text mt-0.5">{action.description}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[11px] px-1.5 py-0.5 rounded ${TYPE_COLORS[action.assignee_type] || ''}`}>
                      {TYPE_LABELS[action.assignee_type] || action.assignee_type}
                    </span>
                    {action.agent_key && (
                      <span className="text-[11px] text-secondary-text">{action.agent_key} agent</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={onBack} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-secondary-text hover:text-dark-text flex items-center gap-2">
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={onNext}
              disabled={byType.agent.length === 0 && byType.hybrid.length === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-aa-blue text-white hover:bg-aa-blue/90 disabled:opacity-40 flex items-center gap-2"
            >
              Generate Skills <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Skills ──────────────────────────────────────────────────────────

function SkillsStep({ tenantId, actionsData, onBack }) {
  const [skills, setSkills] = useState([]);
  const [generating, setGenerating] = useState(null);
  const [activating, setActivating] = useState(null);
  const [error, setError] = useState(null);
  const [refreshedActions, setRefreshedActions] = useState([]);

  // Use refreshed data if available, otherwise use original
  const displayActions = refreshedActions.length > 0 ? refreshedActions : actionsData;
  const skillableActions = displayActions.filter(a =>
    (a.assignee_type === 'agent' || a.assignee_type === 'hybrid') && a.status !== 'manual'
  );

  async function refreshActions() {
    const token = await getFreshToken();
    const res = await fetch(`${BACKEND_URL}/api/sop-analysis/actions?status=`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const { actions } = await res.json();
      // Filter to only our pipeline actions
      const ids = new Set(actionsData.map(a => a.id));
      setRefreshedActions(actions.filter(a => ids.has(a.id)));
    }
  }

  async function handleGenerateSkill(actionId) {
    setGenerating(actionId);
    setError(null);
    try {
      await sopFetch('/generate-skill', { action_id: actionId });
      await refreshActions();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(null);
    }
  }

  async function handleActivateSkill(actionId) {
    setActivating(actionId);
    setError(null);
    try {
      await sopFetch('/activate-skill', { action_id: actionId });
      await refreshActions();
    } catch (err) {
      setError(err.message);
    } finally {
      setActivating(null);
    }
  }

  async function handleGenerateAll() {
    const planned = skillableActions.filter(a => a.status === 'planned');
    setError(null);
    for (const action of planned) {
      setGenerating(action.id);
      try {
        await sopFetch('/generate-skill', { action_id: action.id });
      } catch (err) {
        setError(err.message);
        break;
      }
    }
    setGenerating(null);
    await refreshActions();
  }

  const STATUS_BADGES = {
    planned: { label: 'Planned', cls: 'bg-gray-100 text-gray-600' },
    skill_generating: { label: 'Generating...', cls: 'bg-blue-50 text-blue-700' },
    ready_for_review: { label: 'Ready', cls: 'bg-amber-50 text-amber-700' },
    active: { label: 'Active', cls: 'bg-green-50 text-green-700' },
  };

  const plannedCount = skillableActions.filter(a => a.status === 'planned').length;
  const readyCount = skillableActions.filter(a => a.status === 'ready_for_review').length;
  const activeCount = skillableActions.filter(a => a.status === 'active').length;

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-dark-text font-medium">{skillableActions.length} skill-eligible actions</span>
          {activeCount > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-50 text-green-700">{activeCount} active</span>}
          {readyCount > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{readyCount} ready</span>}
        </div>
        {plannedCount > 0 && (
          <button
            onClick={handleGenerateAll}
            disabled={!!generating}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-aa-blue text-white hover:bg-aa-blue/90 disabled:opacity-50 flex items-center gap-1"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            Generate All ({plannedCount})
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {skillableActions.map(action => {
          const badge = STATUS_BADGES[action.status] || STATUS_BADGES.planned;
          const isGenerating = generating === action.id;
          const isActivating = activating === action.id;

          return (
            <div key={action.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-dark-text">{action.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[11px] px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                  {action.agent_key && (
                    <span className="text-[11px] text-secondary-text flex items-center gap-1">
                      <Bot size={10} /> {action.agent_key}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {action.status === 'planned' && (
                  <button
                    onClick={() => handleGenerateSkill(action.id)}
                    disabled={!!generating || !!activating}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-aa-blue/30 text-aa-blue hover:bg-aa-blue/5 disabled:opacity-50 flex items-center gap-1"
                  >
                    {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    Generate
                  </button>
                )}
                {action.status === 'ready_for_review' && (
                  <button
                    onClick={() => handleActivateSkill(action.id)}
                    disabled={!!generating || !!activating}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50 flex items-center gap-1"
                  >
                    {isActivating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                    Activate
                  </button>
                )}
                {action.status === 'active' && (
                  <span className="flex items-center gap-1 text-xs text-green-700">
                    <CheckCircle size={12} /> Deployed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeCount > 0 && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-sm text-green-800">
            {activeCount} skill{activeCount !== 1 ? 's' : ''} deployed to agents. They're now available in agent conversations.
          </div>
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button onClick={onBack} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-secondary-text hover:text-dark-text flex items-center gap-2">
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SOPBuilder() {
  const { tenantId } = useTenantId();
  const [currentStep, setCurrentStep] = useState('select');
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Pipeline data
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [roadmapData, setRoadmapData] = useState([]);
  const [actionsData, setActionsData] = useState([]);

  function markCompleted(step) {
    setCompletedSteps(prev => new Set([...prev, step]));
  }

  function goToStep(step) {
    setCurrentStep(step);
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-aa-blue/10 rounded-lg">
            <Zap size={20} className="text-aa-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-dark-text">SOP Builder</h1>
            <p className="text-sm text-secondary-text">
              Analyze SOPs, generate automation roadmaps, and deploy agent skills.
            </p>
          </div>
        </div>
      </div>

      <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

      {currentStep === 'select' && (
        <SelectStep
          tenantId={tenantId}
          selected={selectedDocs}
          setSelected={setSelectedDocs}
          onNext={() => { markCompleted('select'); goToStep('analyze'); }}
        />
      )}

      {currentStep === 'analyze' && (
        <AnalyzeStep
          tenantId={tenantId}
          selectedDocs={selectedDocs}
          results={analysisResults}
          setResults={setAnalysisResults}
          onNext={() => { markCompleted('analyze'); goToStep('roadmap'); }}
          onBack={() => goToStep('select')}
        />
      )}

      {currentStep === 'roadmap' && (
        <RoadmapStep
          tenantId={tenantId}
          analysisResults={analysisResults}
          roadmapData={roadmapData}
          setRoadmapData={setRoadmapData}
          onNext={() => { markCompleted('roadmap'); goToStep('actions'); }}
          onBack={() => goToStep('analyze')}
        />
      )}

      {currentStep === 'actions' && (
        <ActionsStep
          tenantId={tenantId}
          roadmapData={roadmapData}
          actionsData={actionsData}
          setActionsData={setActionsData}
          onNext={() => { markCompleted('actions'); goToStep('skills'); }}
          onBack={() => goToStep('roadmap')}
        />
      )}

      {currentStep === 'skills' && (
        <SkillsStep
          tenantId={tenantId}
          actionsData={actionsData}
          onBack={() => goToStep('actions')}
        />
      )}
    </div>
  );
}
