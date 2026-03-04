import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import KnowledgePage from './KnowledgePage';
import AgentInstructionsPage from './AgentInstructionsPage';

const TABS = [
  { key: 'documents', label: 'Documents' },
  { key: 'instructions', label: 'Instructions' },
];

export default function AgentKnowledgePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = TABS.some(t => t.key === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'documents';
  const [activeTab, setActiveTab] = useState(initialTab);

  function switchTab(key) {
    setActiveTab(key);
    if (key === 'documents') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', key);
    }
    setSearchParams(searchParams, { replace: true });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-dark-text">Agent Knowledge</h1>
        <p className="text-sm text-secondary-text mt-1">
          Manage documents and instructions that shape how your AI agents work.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-aa-blue text-aa-blue'
                : 'border-transparent text-secondary-text hover:text-dark-text hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'documents' && <KnowledgePage embedded />}
      {activeTab === 'instructions' && <AgentInstructionsPage embedded />}
    </div>
  );
}
