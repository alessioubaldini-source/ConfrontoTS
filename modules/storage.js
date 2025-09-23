const MAPPINGS_KEY = 'timesheet_commesse_mappings';
const EXCLUSIONS_KEY = 'timesheet_exclusions';

export function getCustomMappings() {
  try {
    const mappings = localStorage.getItem(MAPPINGS_KEY);
    return mappings ? JSON.parse(mappings) : {};
  } catch (e) {
    console.error('Error reading custom mappings from localStorage', e);
    return {};
  }
}

export function saveCustomMappings(mappings) {
  try {
    localStorage.setItem(MAPPINGS_KEY, JSON.stringify(mappings));
  } catch (e) {
    console.error('Error saving custom mappings to localStorage', e);
  }
}

export function getExclusions() {
  try {
    const exclusions = localStorage.getItem(EXCLUSIONS_KEY);
    const parsed = exclusions ? JSON.parse(exclusions) : { resources: [], commesse: [] };
    // Ensure structure is correct
    if (!parsed.resources) parsed.resources = [];
    if (!parsed.commesse) parsed.commesse = [];
    return parsed;
  } catch (e) {
    console.error('Error reading exclusions from localStorage', e);
    return { resources: [], commesse: [] };
  }
}

export function saveExclusions(exclusions) {
  try {
    localStorage.setItem(EXCLUSIONS_KEY, JSON.stringify(exclusions));
  } catch (e) {
    console.error('Error saving exclusions to localStorage', e);
  }
}
