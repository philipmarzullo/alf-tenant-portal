import { supabase } from '../lib/supabase';
import { getTenantId } from '../agents/api';

const LS_KEY = 'aa_qbu_history';
const LS_MIGRATED_KEY = 'aa_qbu_migrated_to_supabase';

/** One-time: migrate any localStorage QBU entries into Supabase tool_submissions */
async function migrateLocalStorage(tenantId) {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(LS_MIGRATED_KEY)) return;

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) { localStorage.setItem(LS_MIGRATED_KEY, '1'); return; }
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries) || entries.length === 0) { localStorage.setItem(LS_MIGRATED_KEY, '1'); return; }

    const { data: { user } } = await supabase.auth.getUser();

    const rows = entries.map((e) => ({
      tenant_id: tenantId,
      tool_key: 'qbu',
      title: `${e.client || 'Untitled'} — ${e.quarter || ''}`,
      form_data: e.formData || {},
      agent_output: e.agentOutput || '',
      status: e.status || 'complete',
      created_by: user?.id || null,
      created_at: e.createdAt || new Date().toISOString(),
    }));

    const { error } = await supabase.from('tool_submissions').insert(rows);
    if (error) {
      console.error('localStorage → Supabase migration failed:', error);
      return; // don't mark as migrated so it retries next load
    }

    localStorage.setItem(LS_MIGRATED_KEY, '1');
    console.log(`Migrated ${rows.length} QBU entries from localStorage to Supabase`);
  } catch (err) {
    console.error('localStorage migration error:', err);
  }
}

export async function getQBUHistory() {
  const tenantId = getTenantId();
  if (!tenantId) return [];

  // Migrate any old localStorage entries on first load
  await migrateLocalStorage(tenantId);

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

/** Convert a File to base64 data URL */
function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

/** Convert photo array — preserve base64 so any user can generate the PPTX */
async function serializePhotos(photos) {
  return Promise.all(
    (photos || []).map(async (p) => {
      const base64 = p.file instanceof File ? await fileToBase64(p.file) : (p.base64 || null);
      return {
        name: p.name,
        caption: p.caption,
        location: p.location,
        type: p.type || 'general',
        base64,
      };
    })
  );
}

export async function saveQBU({ client, quarter, jobName, formData, agentOutput }) {
  const tenantId = getTenantId();
  const { data: { user } } = await supabase.auth.getUser();

  // Serialize photos to base64 so any user can download the PPTX with images
  const [projectPhotos, roadmapPhotos] = await Promise.all([
    serializePhotos(formData.projects?.photos),
    serializePhotos(formData.roadmap?.photos),
  ]);

  const row = {
    tenant_id: tenantId,
    tool_key: 'qbu',
    title: `${client} — ${quarter}`,
    form_data: {
      ...formData,
      projects: {
        ...formData.projects,
        photos: projectPhotos,
      },
      roadmap: {
        ...formData.roadmap,
        photos: roadmapPhotos,
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
