import { supabase } from '../lib/supabase';
import { getTenantId } from '../agents/api';

const LS_KEY = 'aa_qbu_history';
const LS_MIGRATED_KEY = 'aa_qbu_migrated_to_supabase';
const BUCKET = 'qbu-files';

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
    deckPath: row.deck_path || null,
  }));
}

// ── Photo upload helpers ─────────────────────────────────

/** Upload a single photo File to Supabase Storage, return the storage path */
async function uploadPhotoFile(tenantId, submissionId, file, index) {
  // Sanitize filename — keep extension, replace non-alphanumeric chars
  const ext = file.name?.split('.').pop() || 'jpg';
  const safeName = `photo_${index}.${ext}`;
  const path = `${tenantId}/photos/${submissionId}/${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });

  if (error) {
    console.error(`Failed to upload photo ${safeName}:`, error);
    return null;
  }
  return path;
}

/** Upload photos to storage, return array with storagePath instead of base64 */
async function uploadPhotos(tenantId, submissionId, photos) {
  return Promise.all(
    (photos || []).map(async (p, i) => {
      let storagePath = p.storagePath || null;

      // Upload File objects to storage
      if (p.file instanceof File) {
        storagePath = await uploadPhotoFile(tenantId, submissionId, p.file, i);
      }
      // If it's a legacy base64 entry with no storagePath, keep the base64
      // (old entries that haven't been re-uploaded)
      const base64 = (!storagePath && p.base64) ? p.base64 : undefined;

      return {
        name: p.name,
        caption: p.caption,
        location: p.location,
        type: p.type || 'general',
        ...(storagePath ? { storagePath } : {}),
        ...(base64 ? { base64 } : {}),
      };
    })
  );
}

/** Get a signed URL for a photo stored in Supabase Storage */
export async function getPhotoSignedUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600); // 1 hour expiry
  if (error) {
    console.error('Failed to create signed URL:', error);
    return null;
  }
  return data.signedUrl;
}

/** Download a stored photo as base64 data URL (for PPTX generation) */
export async function getPhotoAsBase64(storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);
  if (error) {
    console.error('Failed to download photo:', error);
    return null;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(data);
  });
}

// ── PPTX deck storage ────────────────────────────────────

/** Upload a PPTX blob to storage, return the storage path */
export async function uploadDeck(tenantId, filename, blob) {
  const path = `${tenantId}/decks/${filename}.pptx`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      upsert: true,
    });
  if (error) {
    console.error('Failed to upload deck:', error);
    return null;
  }
  return path;
}

/** Get a signed download URL for a stored deck */
export async function getDeckSignedUrl(deckPath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(deckPath, 3600);
  if (error) {
    console.error('Failed to create deck signed URL:', error);
    return null;
  }
  return data.signedUrl;
}

/** Save deck_path to the tool_submissions row */
export async function saveDeckPath(submissionId, deckPath) {
  const { error } = await supabase
    .from('tool_submissions')
    .update({ deck_path: deckPath })
    .eq('id', submissionId);
  if (error) console.error('Failed to save deck_path:', error);
}

// ── Main save/load ───────────────────────────────────────

export async function saveQBU({ client, quarter, jobName, formData, agentOutput }) {
  const tenantId = getTenantId();
  const { data: { user } } = await supabase.auth.getUser();

  // Step 1: Insert row without photos to get the submission ID
  const row = {
    tenant_id: tenantId,
    tool_key: 'qbu',
    title: `${client} — ${quarter}`,
    form_data: {
      ...formData,
      projects: { ...formData.projects, photos: [] },
      roadmap: { ...formData.roadmap, photos: [] },
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
    return { id: crypto.randomUUID(), client, quarter, jobName, createdAt: new Date().toISOString(), status: 'complete', formData: row.form_data, agentOutput };
  }

  const submissionId = data.id;

  // Step 2: Upload photos to storage and update the row with storage paths
  const [projectPhotos, roadmapPhotos] = await Promise.all([
    uploadPhotos(tenantId, submissionId, formData.projects?.photos),
    uploadPhotos(tenantId, submissionId, formData.roadmap?.photos),
  ]);

  const updatedFormData = {
    ...formData,
    projects: { ...formData.projects, photos: projectPhotos },
    roadmap: { ...formData.roadmap, photos: roadmapPhotos },
  };

  await supabase
    .from('tool_submissions')
    .update({ form_data: updatedFormData })
    .eq('id', submissionId);

  return {
    id: submissionId,
    client,
    quarter,
    jobName,
    createdAt: data.created_at,
    status: data.status,
    formData: updatedFormData,
    agentOutput: data.agent_output,
    deckPath: null,
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
    deckPath: data.deck_path || null,
  };
}

export async function updateQBU(id, { agentOutput }) {
  const { data, error } = await supabase
    .from('tool_submissions')
    .update({ agent_output: agentOutput })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update QBU:', error);
    return null;
  }
  return data;
}

export async function deleteQBU(id) {
  // Also clean up storage files for this submission
  const tenantId = getTenantId();
  if (tenantId) {
    // Delete photos folder
    const { data: photoFiles } = await supabase.storage
      .from(BUCKET)
      .list(`${tenantId}/photos/${id}`);
    if (photoFiles?.length) {
      await supabase.storage
        .from(BUCKET)
        .remove(photoFiles.map(f => `${tenantId}/photos/${id}/${f.name}`));
    }
  }

  // Check for deck_path and delete the deck too
  const { data: row } = await supabase
    .from('tool_submissions')
    .select('deck_path')
    .eq('id', id)
    .single();
  if (row?.deck_path) {
    await supabase.storage.from(BUCKET).remove([row.deck_path]);
  }

  const { error } = await supabase
    .from('tool_submissions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete QBU:', error);
  }
}
