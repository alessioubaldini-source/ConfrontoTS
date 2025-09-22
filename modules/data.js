function formatDate(dateValue) {
  if (!dateValue) return '';
  if (typeof dateValue === 'string') {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    return dateValue;
  }
  if (typeof dateValue === 'number') {
    const date = new Date((dateValue - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }
  return String(dateValue);
}

// Funzione per normalizzare le stringhe (rimuove accenti, converte in minuscolo)
function normalizeString(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

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

function parseExcelData(data, config) {
  if (!data || data.length < 1) {
    const fileId = config.type === 1 ? '"Estrazione TS Bridge"' : '"Estrazione TC Kirey"';
    throw new Error(`Il file ${fileId} è vuoto o ha un formato non valido.`);
  }

  const headers = data[0].map((h) =>
    String(h || '')
      .trim()
      .toLowerCase()
  );

  // Trova dinamicamente gli indici delle colonne in base al nome dell'intestazione (case-insensitive)
  const findIndex = (headerName) => headers.findIndex((h) => h === headerName.toLowerCase());

  const risorsaIdx = findIndex(config.columns.risorsa);
  const commessaIdx = findIndex(config.columns.commessa);
  const dataIdx = findIndex(config.columns.data);
  const oreIdx = findIndex(config.columns.ore);

  // Controlla se tutte le colonne necessarie sono state trovate e restituisce un errore specifico in caso contrario
  const missingCols = [];
  if (risorsaIdx === -1) missingCols.push(`'${config.columns.risorsa}'`);
  if (commessaIdx === -1) missingCols.push(`'${config.columns.commessa}'`);
  if (dataIdx === -1) missingCols.push(`'${config.columns.data}'`);
  if (oreIdx === -1) missingCols.push(`'${config.columns.ore}'`);

  if (missingCols.length > 0) {
    const fileId = config.type === 1 ? '"Estrazione TS Bridge"' : '"Estrazione TC Kirey"';
    throw new Error(`Nel file ${fileId}, non sono state trovate le seguenti colonne: ${missingCols.join(', ')}.`);
  }

  return data
    .slice(1)
    .map((row) => {
      if (!row || row.length === 0) return null;

      const risorsaRaw = String(row[risorsaIdx] || '').trim();
      const commessaRaw = String(row[commessaIdx] || '').trim();

      const risorsaNorm = config.normalize.risorsa(risorsaRaw);
      const commessaNorm = config.normalize.commessa(commessaRaw);

      return {
        risorsa: { raw: risorsaRaw, norm: risorsaNorm },
        commessa: { raw: commessaRaw, norm: commessaNorm },
        data: formatDate(row[dataIdx]),
        ore: parseFloat(row[oreIdx]) || 0,
      };
    })
    .filter((item) => item && item.risorsa.raw && item.commessa.raw && item.data && item.ore > 0);
}

function createPivotTable(data) {
  const grouped = {};
  const dates = new Set();
  data.forEach((item) => {
    const key = `${item.risorsa.norm}|${item.commessa.norm}`;
    if (!grouped[key]) {
      grouped[key] = { risorsa: item.risorsa.raw, commessa: item.commessa.raw, dates: {} };
    }
    grouped[key].dates[item.data] = (grouped[key].dates[item.data] || 0) + item.ore;
    dates.add(item.data);
  });
  return { grouped, sortedDates: Array.from(dates).sort() };
}

function analyzeDiscrepancies(pivot1, pivot2, allDates) {
  const discrepancies = [];
  const resourceStats = {};
  const dateStats = {};
  let totalHours1 = 0;
  let totalHours2 = 0;
  let totalCells = 0;
  let matchingCells = 0;

  const allKeys = new Set([...Object.keys(pivot1.grouped), ...Object.keys(pivot2.grouped)]);

  allKeys.forEach((key) => {
    const [risorsa, commessa] = key.split('|');
    const row1 = pivot1.grouped[key];
    const row2 = pivot2.grouped[key];
    const risorsaRaw = row1?.risorsa || row2?.risorsa; // Get raw name for display
    if (!risorsaRaw) return; // Skip if no raw resource name is found

    if (!resourceStats[risorsaRaw]) resourceStats[risorsaRaw] = { discrepancies: 0, total: 0 };

    allDates.forEach((date) => {
      const hours1 = row1?.dates[date] || 0;
      const hours2 = row2?.dates[date] || 0;

      if (hours1 > 0 || hours2 > 0) {
        totalHours1 += hours1;
        totalHours2 += hours2;
        totalCells++;
        if (!dateStats[date]) dateStats[date] = { discrepancies: 0, total: 0 };
        dateStats[date].total++;
        resourceStats[risorsaRaw].total++;

        if (Math.abs(hours1 - hours2) > 0.01) {
          discrepancies.push({
            risorsa: risorsaRaw,
            commessa: row1?.commessa || row2?.commessa, // Get raw commessa name
            data: date,
            hours1,
            hours2,
            difference: Math.abs(hours1 - hours2),
          });
          resourceStats[risorsaRaw].discrepancies++;
          dateStats[date].discrepancies++;
        } else {
          matchingCells++;
        }
      }
    });
  });

  const accuracy = totalCells > 0 ? (matchingCells / totalCells) * 100 : 100;
  return { discrepancies, resourceStats, dateStats, totalHours1, totalHours2, accuracy, totalCells, matchingCells };
}

export function processAndAnalyze(file1Data, file2Data, customMappings, exclusions) {
  // Configuration for the first file: "Estrazione TS Bridge"
  const config1 = {
    type: 1,
    columns: { risorsa: 'Risorsa', commessa: 'Descrizione Commessa', data: 'Data', ore: 'Ore' },
    normalize: {
      // Format: "Cognome Nome" -> no change needed, just trim
      risorsa: (name) =>
        normalizeString(name)
          .replace(/[^a-z0-9\s]/g, '')
          .trim(),
      // Normalizzazione per nome progetto
      commessa: (proj) => {
        // Pulisce la stringa da spazi e trattini e la mette in minuscolo
        let normalized = normalizeString(proj).replace(/[\s-]/g, '').replace(/a511/g, '');
        // Rimuove i prefissi dopo aver pulito la stringa
        if (normalized.startsWith('uficms')) {
          normalized = normalized.substring(6);
        } else if (normalized.startsWith('cmsufi')) {
          normalized = normalized.substring(6);
        }
        return normalized.trim();
      },
    },
  };

  // Configuration for the second file: "Estrazione TC Kirey"
  const config2 = {
    type: 2,
    columns: { risorsa: 'Name', commessa: 'Project Name', data: 'Calendar Date', ore: 'Processed Hours' },
    normalize: {
      // Format: "Cognome, Nome" -> "Cognome Nome"
      risorsa: (name) =>
        normalizeString(name)
          .replace(',', '')
          .replace(/[^a-z0-9\s]/g, '')
          .trim(),
      // Normalizzazione per nome progetto
      commessa: (proj) => {
        // Pulisce la stringa da spazi e trattini e la mette in minuscolo
        let normalized = normalizeString(proj).replace(/[\s-]/g, '').replace(/a511/g, '');
        // Rimuove i prefissi dopo aver pulito la stringa
        if (normalized.startsWith('uficms')) {
          normalized = normalized.substring(6);
        } else if (normalized.startsWith('cmsufi')) {
          normalized = normalized.substring(6);
        }
        return normalized.trim();
      },
    },
  };

  const originalParsed1 = parseExcelData(file1Data, config1);
  const originalParsed2 = parseExcelData(file2Data, config2);

  // Colleziona tutte le risorse e commesse PRIMA di applicare le esclusioni, per la UI
  const allResourcesForUI = [...new Set([...originalParsed1.map((i) => i.risorsa.raw), ...originalParsed2.map((i) => i.risorsa.raw)])].sort();
  const allCommesseForUI = [...new Set([...originalParsed1.map((i) => i.commessa.raw), ...originalParsed2.map((i) => i.commessa.raw)])].sort();

  // Applica le esclusioni
  const parsedData1Filtered = originalParsed1.filter((item) => !exclusions.resources.includes(item.risorsa.raw) && !exclusions.commesse.includes(item.commessa.raw));
  const parsedData2Filtered = originalParsed2.filter((item) => !exclusions.resources.includes(item.risorsa.raw) && !exclusions.commesse.includes(item.commessa.raw));

  let parsedData1 = parsedData1Filtered;
  const parsedData2 = parsedData2Filtered;

  // Applica i mapping personalizzati ai dati del primo file
  if (Object.keys(customMappings).length > 0) {
    parsedData1 = parsedData1.map((item) => {
      const mappedNorm = customMappings[item.commessa.norm];
      if (mappedNorm) {
        return { ...item, commessa: { ...item.commessa, norm: mappedNorm } };
      }
      return item;
    });
  }

  // Trova le commesse ancora non abbinate per mostrarle nella UI di mapping
  const allCommesse1 = new Map();
  parsedData1.forEach((item) => !allCommesse1.has(item.commessa.norm) && allCommesse1.set(item.commessa.norm, item.commessa.raw));
  const allCommesse2 = new Map();
  parsedData2.forEach((item) => !allCommesse2.has(item.commessa.norm) && allCommesse2.set(item.commessa.norm, item.commessa.raw));

  const commesse1Norm = new Set(allCommesse1.keys());
  const commesse2Norm = new Set(allCommesse2.keys());

  const unmatchedCommesse1 = [...commesse1Norm].filter((c) => !commesse2Norm.has(c));
  const unmatchedCommesse2 = [...commesse2Norm].filter((c) => !commesse1Norm.has(c));

  const unmatchedForUI = {
    file1: unmatchedCommesse1.map((norm) => ({ norm, raw: allCommesse1.get(norm) })).sort((a, b) => a.raw.localeCompare(b.raw)),
    file2: unmatchedCommesse2.map((norm) => ({ norm, raw: allCommesse2.get(norm) })).sort((a, b) => a.raw.localeCompare(b.raw)),
  };

  const pivot1 = createPivotTable(parsedData1);
  const pivot2 = createPivotTable(parsedData2);

  const allDates = [...new Set([...pivot1.sortedDates, ...pivot2.sortedDates])].sort();
  pivot1.sortedDates = allDates;
  pivot2.sortedDates = allDates;

  const analysis = analyzeDiscrepancies(pivot1, pivot2, allDates);

  return {
    ...analysis,
    pivot1,
    pivot2,
    unmatchedForUI,
    customMappings,
    allResourcesForUI,
    allCommesseForUI,
    exclusions,
  };
}
