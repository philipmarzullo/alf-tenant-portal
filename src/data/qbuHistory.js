import { supabase } from '../lib/supabase';

function getTenantId() {
  return import.meta.env.VITE_TENANT_ID || null;
}

export async function getQBUHistory() {
  const tenantId = getTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('tool_submissions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('tool_key', 'qbu')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load QBU history:', error);
    return [];
  }

  // Map DB shape to the shape QBUBuilder expects
  return (data || []).map(row => ({
    id: row.id,
    client: row.form_data?.cover?.clientName || row.title || 'Untitled',
    quarter: row.form_data?.cover?.quarter || '',
    jobName: row.form_data?.cover?.jobName || '',
    createdAt: row.created_at,
    status: row.status || 'complete',
    formData: row.form_data || {},
    agentOutput: row.agent_output || '',
  }));
}

export async function saveQBU({ client, quarter, jobName, formData, agentOutput }) {
  const tenantId = getTenantId();
  const { data: { user } } = await supabase.auth.getUser();

  const row = {
    tenant_id: tenantId,
    tool_key: 'qbu',
    title: `${client} — ${quarter}`,
    form_data: {
      ...formData,
      projects: {
        ...formData.projects,
        // Strip file blobs — only keep metadata
        photos: (formData.projects?.photos || []).map((p) => ({
          name: p.name,
          caption: p.caption,
          location: p.location,
        })),
      },
    },
    agent_output: agentOutput,
    status: 'complete',
    created_by: user?.id || null,
  };

  const { data, error } = await supabase
    .from('tool_submissions')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('Failed to save QBU:', error);
    // Fallback: return a local-only entry so the UI doesn't break
    return { id: crypto.randomUUID(), client, quarter, jobName, createdAt: new Date().toISOString(), status: 'complete', formData: row.form_data, agentOutput };
  }

  return {
    id: data.id,
    client,
    quarter,
    jobName,
    createdAt: data.created_at,
    status: data.status,
    formData: data.form_data,
    agentOutput: data.agent_output,
  };
}

export async function getQBUById(id) {
  const { data, error } = await supabase
    .from('tool_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    client: data.form_data?.cover?.clientName || data.title || 'Untitled',
    quarter: data.form_data?.cover?.quarter || '',
    jobName: data.form_data?.cover?.jobName || '',
    createdAt: data.created_at,
    status: data.status || 'complete',
    formData: data.form_data || {},
    agentOutput: data.agent_output || '',
  };
}

export async function deleteQBU(id) {
  const { error } = await supabase
    .from('tool_submissions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete QBU:', error);
  }
}
