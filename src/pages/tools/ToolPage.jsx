import { useState } from 'react';
import { Bot, Download, FileText, Loader2 } from 'lucide-react';
import { getTool } from '../../data/toolRegistry';
import AgentActionButton from '../../components/shared/AgentActionButton';
import AgentChatPanel from '../../components/shared/AgentChatPanel';
import { useToast } from '../../components/shared/ToastProvider';
import { callAgent } from '../../agents/api';

function FormField({ field, value, onChange }) {
  const baseClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue';

  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={baseClass}
        />
      );
    case 'textarea':
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={`${baseClass} resize-none`}
        />
      );
    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
        />
      );
    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseClass} bg-white`}
        >
          <option value="">Select...</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case 'checkboxGroup':
      return (
        <div className="grid grid-cols-2 gap-2">
          {(field.options || []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={(value || []).includes(opt)}
                onChange={() => {
                  const arr = value || [];
                  onChange(arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt]);
                }}
                className="w-4 h-4 rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
              />
              <span className="text-sm text-dark-text group-hover:text-aa-blue transition-colors">{opt}</span>
            </label>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export default function ToolPage({ toolKey }) {
  const tool = getTool(toolKey);
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const toast = useToast();

  if (!tool) {
    return (
      <div className="text-center py-20">
        <div className="text-secondary-text text-sm">Tool not found: {toolKey}</div>
      </div>
    );
  }

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleGenerate = async () => {
    // Check required fields
    const missing = (tool.intakeSchema || [])
      .filter(f => f.required && !form[f.key])
      .map(f => f.label);
    if (missing.length) {
      toast(`Missing required fields: ${missing.join(', ')}`, 'error');
      return;
    }

    setGenerating(true);
    try {
      const output = await callAgent(tool.agentKey, tool.actionKey, form);
      setResult(output);
      toast(`${tool.label} generated`);
    } catch (err) {
      toast(err.message || 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html>
        <head><title>${tool.label}</title>
        <style>body { font-family: system-ui, sans-serif; padding: 2rem; line-height: 1.6; max-width: 800px; margin: 0 auto; } pre { white-space: pre-wrap; }</style>
        </head>
        <body><h1>${tool.label}</h1><pre>${result}</pre></body>
      </html>
    `);
    printWin.document.close();
    printWin.print();
  };

  const handleReset = () => {
    setForm({});
    setResult(null);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
        <h1 className="text-2xl font-light text-dark-text">{tool.label}</h1>
        <button
          onClick={() => setChatOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
        >
          <Bot size={16} />
          Ask Agent
        </button>
      </div>
      <p className="text-sm text-secondary-text mb-6">{tool.description}</p>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left: Intake Form */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            {(tool.intakeSchema || []).map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-secondary-text mb-1">
                  {field.label}{field.required && ' *'}
                </label>
                <FormField field={field} value={form[field.key]} onChange={(v) => updateField(field.key, v)} />
              </div>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <AgentActionButton
                label={generating ? 'Generating...' : `Generate ${tool.label.replace(' Builder', '').replace(' Generator', '')}`}
                variant="primary"
                onClick={handleGenerate}
                disabled={generating}
              />
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-secondary-text border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reset Form
              </button>
            </div>
          </div>
        </div>

        {/* Right: Output */}
        <div className="md:col-span-2">
          {generating ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Loader2 size={24} className="text-aa-blue animate-spin mx-auto mb-3" />
              <div className="text-sm text-secondary-text">Generating...</div>
            </div>
          ) : result ? (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider">Generated Content</div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1 text-xs font-medium text-aa-blue hover:text-aa-blue/80 transition-colors"
                  >
                    <Download size={12} /> Save as PDF
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(result); toast('Copied to clipboard'); }}
                    className="text-xs font-medium text-aa-blue hover:text-aa-blue/80 transition-colors"
                  >
                    Copy All
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-dark-text leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                {result}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
              <FileText size={32} className="text-gray-300 mx-auto mb-3" />
              <div className="text-sm font-medium text-dark-text mb-1">No content generated yet</div>
              <div className="text-xs text-secondary-text">
                Fill in the intake form and click Generate to create your {tool.label.toLowerCase()}.
              </div>
            </div>
          )}
        </div>
      </div>

      <AgentChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        agentKey={tool.agentKey}
        agentName={`${tool.label.replace(' Builder', '').replace(' Generator', '')} Agent`}
        context={tool.description}
      />
    </div>
  );
}
