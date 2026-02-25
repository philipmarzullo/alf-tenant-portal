const STORAGE_KEY = 'aa_qbu_history';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getQBUHistory() {
  return readAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function saveQBU({ client, quarter, jobName, formData, agentOutput }) {
  const entries = readAll();
  const entry = {
    id: crypto.randomUUID(),
    client,
    quarter,
    jobName: jobName || '',
    createdAt: new Date().toISOString(),
    status: 'complete',
    formData: {
      ...formData,
      projects: {
        ...formData.projects,
        photos: (formData.projects?.photos || []).map((p) => ({
          name: p.name,
          caption: p.caption,
          location: p.location,
        })),
      },
    },
    agentOutput,
  };
  entries.push(entry);
  writeAll(entries);
  return entry;
}

export function getQBUById(id) {
  return readAll().find((e) => e.id === id) || null;
}

export function deleteQBU(id) {
  const entries = readAll().filter((e) => e.id !== id);
  writeAll(entries);
}
