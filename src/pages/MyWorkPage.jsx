import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Loader2, CheckCircle, Clock, ArrowRight, Inbox } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useTenantId } from '../contexts/TenantIdContext';
import { useTenantPortal } from '../contexts/TenantPortalContext';

const STATUS_STYLES = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700', icon: Clock },
  in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700', icon: ArrowRight },
  completed: { label: 'Completed', className: 'bg-green-50 text-green-700', icon: CheckCircle },
};

export default function MyWorkPage() {
  const { currentUser } = useUser();
  const { tenantId } = useTenantId();
  const { workspaces, getWorkspacePath } = useTenantPortal();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id || !tenantId) return;

    async function loadTasks() {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenant_user_tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', currentUser.id)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error) setTasks(data || []);
      setLoading(false);
    }

    loadTasks();
  }, [currentUser?.id, tenantId]);

  // Find workspace for the user's department
  const userWorkspace = currentUser?.department_key
    ? workspaces.find(ws => ws.department_key === currentUser.department_key)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-dark-text">My Work</h1>
        <p className="text-sm text-secondary-text mt-1">
          Your tasks and assignments
        </p>
      </div>

      {/* Quick links */}
      {userWorkspace && (
        <button
          onClick={() => navigate(getWorkspacePath(userWorkspace.department_key))}
          className="flex items-center gap-3 w-full p-4 bg-white rounded-lg border border-gray-200 hover:border-aa-blue/30 transition-colors text-left"
        >
          <ClipboardCheck size={20} className="text-aa-blue" />
          <div className="flex-1">
            <div className="text-sm font-medium text-dark-text">{userWorkspace.name}</div>
            <div className="text-xs text-secondary-text">Go to your workspace</div>
          </div>
          <ArrowRight size={16} className="text-secondary-text" />
        </button>
      )}

      {/* Tasks */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-aa-blue animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Inbox size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-dark-text">No pending tasks</p>
          <p className="text-xs text-secondary-text mt-1">
            Tasks from agent outputs and SOP workflows will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const style = STATUS_STYLES[task.status] || STATUS_STYLES.pending;
            const StatusIcon = style.icon;

            return (
              <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-dark-text">{task.title}</div>
                    {task.description && (
                      <p className="text-xs text-secondary-text mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="text-xs text-secondary-text mt-2">
                      {new Date(task.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${style.className}`}>
                    <StatusIcon size={12} />
                    {style.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
