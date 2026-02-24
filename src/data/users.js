const STORAGE_KEY = 'aa_portal_users';
const CURRENT_USER_KEY = 'aa_portal_current_user';
const SEED_VERSION_KEY = 'aa_portal_seed_version';
const CURRENT_SEED_VERSION = 2; // Bump when SEED_USERS changes

export const MODULE_DEFINITIONS = [
  { key: 'hr', label: 'HR', group: 'WORKSPACES', path: '/hr' },
  { key: 'finance', label: 'Finance', group: 'WORKSPACES', path: '/finance' },
  { key: 'purchasing', label: 'Purchasing', group: 'WORKSPACES', path: '/purchasing' },
  { key: 'sales', label: 'Sales', group: 'WORKSPACES', path: '/sales' },
  { key: 'ops', label: 'Operations', group: 'WORKSPACES', path: '/ops' },
  { key: 'qbu', label: 'QBU Builder', group: 'TOOLS', path: '/tools/qbu' },
  { key: 'salesDeck', label: 'Sales Deck Builder', group: 'TOOLS', path: '/tools/sales-deck' },
  { key: 'admin', label: 'Admin', group: 'ADMIN', path: '/admin' },
];

const SEED_USERS = [
  {
    id: 'user-1',
    name: 'Philip Marzullo',
    email: 'pmarzullo@aaefs.com',
    title: 'Director of Innovation',
    role: 'admin',
    modules: ['hr', 'finance', 'purchasing', 'sales', 'ops', 'qbu', 'salesDeck', 'admin'],
    active: true,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'user-2',
    name: 'Maria Santos',
    email: 'msantos@aaefs.com',
    title: 'Sales Manager',
    role: 'user',
    modules: ['sales', 'salesDeck'],
    active: true,
    createdAt: '2024-03-10T14:30:00Z',
  },
  {
    id: 'user-3',
    name: 'James Chen',
    email: 'jchen@aaefs.com',
    title: 'QA Supervisor',
    role: 'user',
    modules: ['qbu'],
    active: true,
    createdAt: '2024-04-22T09:15:00Z',
  },
  {
    id: 'user-4',
    name: 'Angela Rivera',
    email: 'arivera@aaefs.com',
    title: 'Finance Analyst',
    role: 'user',
    modules: ['finance'],
    active: true,
    createdAt: '2024-06-01T11:00:00Z',
  },
  {
    id: 'user-5',
    name: 'David Thompson',
    email: 'dthompson@aaefs.com',
    title: 'HR Coordinator',
    role: 'user',
    modules: ['hr'],
    active: false,
    createdAt: '2024-07-18T08:45:00Z',
  },
  {
    id: 'user-6',
    name: 'Carlos Rivera',
    email: 'crivera@aaefs.com',
    title: 'VP Operations',
    role: 'user',
    modules: ['ops'],
    active: true,
    createdAt: '2024-02-01T09:00:00Z',
  },
  {
    id: 'user-7',
    name: 'Edita Gargovic',
    email: 'egargovic@aaefs.com',
    title: 'VP Operations',
    role: 'user',
    modules: ['ops'],
    active: true,
    createdAt: '2024-02-01T09:00:00Z',
  },
  {
    id: 'user-8',
    name: 'Elgar Quijandria',
    email: 'equijandria@aaefs.com',
    title: 'VP Operations',
    role: 'user',
    modules: ['ops'],
    active: true,
    createdAt: '2024-02-01T09:00:00Z',
  },
  {
    id: 'user-9',
    name: 'Eric Wheeler',
    email: 'ewheeler@aaefs.com',
    title: 'VP Operations',
    role: 'user',
    modules: ['ops'],
    active: true,
    createdAt: '2024-02-01T09:00:00Z',
  },
  {
    id: 'user-10',
    name: 'Jaimie Restrepo',
    email: 'jrestrepo@aaefs.com',
    title: 'VP Operations',
    role: 'user',
    modules: ['ops'],
    active: true,
    createdAt: '2024-02-01T09:00:00Z',
  },
];

export function getUsers() {
  const storedVersion = Number(localStorage.getItem(SEED_VERSION_KEY) || 0);
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored && storedVersion >= CURRENT_SEED_VERSION) {
    return JSON.parse(stored);
  }

  // Merge: keep existing user edits, add any missing seed users
  if (stored) {
    const existing = JSON.parse(stored);
    const existingIds = new Set(existing.map((u) => u.id));
    const merged = [...existing];
    for (const seed of SEED_USERS) {
      if (!existingIds.has(seed.id)) {
        merged.push(seed);
      }
    }
    // Also ensure existing seed users get updated modules (e.g., ops added to Philip)
    for (const seed of SEED_USERS) {
      const idx = merged.findIndex((u) => u.id === seed.id);
      if (idx !== -1) {
        const existing = merged[idx];
        const missingModules = seed.modules.filter((m) => !existing.modules.includes(m));
        if (missingModules.length > 0) {
          merged[idx] = { ...existing, modules: [...existing.modules, ...missingModules] };
        }
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    localStorage.setItem(SEED_VERSION_KEY, String(CURRENT_SEED_VERSION));
    return merged;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_USERS));
  localStorage.setItem(SEED_VERSION_KEY, String(CURRENT_SEED_VERSION));
  return SEED_USERS;
}

export function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export function createUser({ name, email, title, role, modules }) {
  const users = getUsers();
  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email,
    title,
    role,
    modules: role === 'admin' ? MODULE_DEFINITIONS.map((m) => m.key) : modules,
    active: true,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

export function updateUser(id, updates) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  if (updates.role === 'admin') {
    updates.modules = MODULE_DEFINITIONS.map((m) => m.key);
  }
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return users[idx];
}

export function getCurrentUserId() {
  return localStorage.getItem(CURRENT_USER_KEY) || 'user-1';
}

export function setCurrentUserId(id) {
  localStorage.setItem(CURRENT_USER_KEY, id);
}
