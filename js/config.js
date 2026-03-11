/**
 * config.js — Config load/save via localStorage
 * Keys: ppd_owner, ppd_project_number, ppd_pat
 */

const KEYS = {
  OWNER:          'ppd_owner',
  PROJECT_NUMBER: 'ppd_project_number',
  PAT:            'ppd_pat',
};

// Default project: logos-co / project 12
const DEFAULTS = {
  owner: 'logos-co',
  projectNumber: 12,
};

// Migrate from old split-PAT keys
function migrate() {
  const write = localStorage.getItem('ppd_pat_write');
  const read  = localStorage.getItem('ppd_pat_read');
  if ((write || read) && !localStorage.getItem(KEYS.PAT)) {
    localStorage.setItem(KEYS.PAT, write || read);
  }
  localStorage.removeItem('ppd_pat_write');
  localStorage.removeItem('ppd_pat_read');
}

export function getConfig() {
  migrate();
  return {
    owner:         localStorage.getItem(KEYS.OWNER) || DEFAULTS.owner,
    projectNumber: parseInt(localStorage.getItem(KEYS.PROJECT_NUMBER) || '0', 10) || DEFAULTS.projectNumber,
    pat:           localStorage.getItem(KEYS.PAT) || '',
  };
}

export function saveConfig({ owner, projectNumber, pat }) {
  if (owner !== undefined) {
    if (owner) localStorage.setItem(KEYS.OWNER, owner.trim());
    else        localStorage.removeItem(KEYS.OWNER);
  }
  if (projectNumber !== undefined) {
    if (projectNumber) localStorage.setItem(KEYS.PROJECT_NUMBER, String(projectNumber));
    else               localStorage.removeItem(KEYS.PROJECT_NUMBER);
  }
  if (pat !== undefined) {
    if (pat) localStorage.setItem(KEYS.PAT, pat.trim());
    else     localStorage.removeItem(KEYS.PAT);
  }
}

export function clearConfig() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}

export function isConfigured() {
  const { owner, projectNumber } = getConfig();
  return Boolean(owner && projectNumber);
}

export function hasPAT() {
  return Boolean(getConfig().pat);
}

// ---------------------------------------------------------------------------
// Admin mode — in-memory only, defaults to false on every page load
// ---------------------------------------------------------------------------

let _adminMode = false;

export function isAdminMode()    { return _adminMode; }
export function toggleAdminMode() { _adminMode = !_adminMode; return _adminMode; }

/** True when a PAT is set AND admin mode is active. Controls all write actions. */
export function hasWritePAT() {
  return Boolean(getConfig().pat && _adminMode);
}

/** PAT for read API calls — always use the stored token when available. */
export function getReadPAT() {
  return getConfig().pat || '';
}

/** PAT for write API calls — only valid in admin mode. */
export function getWritePAT() {
  return _adminMode ? (getConfig().pat || '') : '';
}
