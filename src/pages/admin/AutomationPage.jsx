import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Zap } from 'lucide-react';
import AutomationInsightsPage from './AutomationInsightsPage';
import AutomationPreferencesPage from './AutomationPreferencesPage';
import AutomationSchedulesTab from './AutomationSchedulesTab';
import AutomationConditionsTab from './AutomationConditionsTab';
import AutomationRunsTab from './AutomationRunsTab';
import { useUser } from '../../contexts/UserContext';

const TABS = [
  { key: 'insights', label: 'Insights' },
  { key: 'sop-builder', label: 'SOP Builder' },
  { key: 'schedules', label: 'Schedules' },
  { key: 'conditions', label: 'Conditions' },
  { key: 'runs', label: 'Workflow Runs' },
  { key: 'preferences', label: 'Preferences' },
];

export default function AutomationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSuperAdmin } = useUser();
  const activeTab = searchParams.get('tab') || 'insights';

  // Preferences tab only visible to super_admin
  const visibleTabs = isSuperAdmin ? TABS : TABS.filter(t => t.key !== 'preferences');

  function setTab(key) {
    setSearchParams({ tab: key });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-aa-blue" />
          <h1 className="text-xl font-semibold text-dark-text">Automation</h1>
        </div>
        <p className="text-sm text-secondary-text mt-1">
          SOP analysis, agent skills, and execution preferences
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {visibleTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-aa-blue'
                : 'text-secondary-text hover:text-dark-text'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-aa-blue rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'insights' && <AutomationInsightsPage embedded />}
      {activeTab === 'sop-builder' && <AutomationInsightsPage embedded initialTab="skills" />}
      {activeTab === 'schedules' && <AutomationSchedulesTab />}
      {activeTab === 'conditions' && <AutomationConditionsTab />}
      {activeTab === 'runs' && <AutomationRunsTab />}
      {activeTab === 'preferences' && isSuperAdmin && <AutomationPreferencesPage embedded />}
    </div>
  );
}
