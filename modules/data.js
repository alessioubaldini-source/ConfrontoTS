import { normalizeString } from './utils.js';
import { config1, config2 } from './config.js';

function formatDate(dateValue, configType) {
  if (!dateValue) return '';
  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim();

    // Rimuove eventuale parte oraria per il matching regex (es. "1/2/26 0:00" -> "1/2/26")
    const datePart = trimmed.split(' ')[0];

    // Gestione specifica per formati data con slash
    const match = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
      let day, month, year;

      if (configType === 2) {
        // TC Kirey: MM/DD/YY (es. 1/2/26 -> 2 Gennaio)
        month = match[1].padStart(2, '0');
        day = match[2].padStart(2, '0');
        year = match[3];
      } else {
        // TS Bridge: DD/MM/YY (es. 2/1/26 -> 2 Gennaio)
        day = match[1].padStart(2, '0');
        month = match[2].padStart(2, '0');
        year = match[3];
      }

      if (year.length === 2) {
        year = `20${year}`; // Assume anni 20xx
      }
      return `${year}-${month}-${day}`;
    }

    // Gestione Excel serial number passato come stringa
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const date = new Date((parseFloat(trimmed) - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    }

    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    return trimmed;
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

function parseExcelData(data, config) {
  if (!data || data.length < 1) {
    const fileId = config.type === 1 ? '"Estrazione TS Bridge"' : '"Estrazione TC Kirey"';
    throw new Error(`Il file ${fileId} è vuoto o ha un formato non valido.`);
  }

  const headers = data[0].map((h) =>
    String(h || '')
      .trim()
      .toLowerCase(),
  );

  // DEBUG: Log headers found
  console.log(`[DEBUG] Parsing ${config.type === 1 ? 'TS Bridge' : 'TC Kirey'}. Headers:`, headers);

  // Trova dinamicamente gli indici delle colonne in base al nome dell'intestazione (case-insensitive)
  const findIndex = (headerName) => headers.findIndex((h) => h === headerName.toLowerCase());

  const risorsaIdx = findIndex(config.columns.risorsa);
  const commessaIdx = findIndex(config.columns.commessa);
  const dataIdx = findIndex(config.columns.data);
  const oreIdx = findIndex(config.columns.ore);

  // DEBUG: Log indices
  console.log(`[DEBUG] Indices: Risorsa=${risorsaIdx}, Commessa=${commessaIdx}, Data=${dataIdx}, Ore=${oreIdx}`);

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
    .map((row, idx) => {
      if (!row || row.length === 0) return null;

      const risorsaRaw = String(row[risorsaIdx] || '').trim();
      const commessaRaw = String(row[commessaIdx] || '').trim();

      const risorsaNorm = config.normalize.risorsa(risorsaRaw);
      const commessaNorm = config.normalize.commessa(commessaRaw);

      const dateVal = formatDate(row[dataIdx], config.type);

      // Gestione ore con virgola e parsing sicuro
      let oreVal = row[oreIdx];
      if (typeof oreVal === 'string') {
        oreVal = parseFloat(oreVal.replace(',', '.')) || 0;
      } else {
        oreVal = parseFloat(oreVal) || 0;
      }

      // DEBUG: Log first 5 rows
      if (idx < 5) {
        console.log(`[DEBUG] Row ${idx}: DateRaw="${row[dataIdx]}"->"${dateVal}", OreRaw="${row[oreIdx]}"->${oreVal}`);
      }

      return {
        risorsa: { raw: risorsaRaw, norm: risorsaNorm },
        commessa: { raw: commessaRaw, norm: commessaNorm },
        data: dateVal,
        ore: oreVal,
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

  // Reformat resource names for pivot2 display ("Cognome, Nome" -> "Cognome Nome")
  for (const key in pivot2.grouped) {
    const risorsa = pivot2.grouped[key].risorsa;
    if (risorsa && risorsa.includes(',')) {
      const parts = risorsa.split(',').map((p) => p.trim());
      if (parts.length === 2) {
        pivot2.grouped[key].risorsa = `${parts[0]} ${parts[1]}`.trim();
      }
    }
  }
  const allDates = [...new Set([...pivot1.sortedDates, ...pivot2.sortedDates])].sort();
  pivot1.sortedDates = allDates;
  pivot2.sortedDates = allDates;

  const analysis = analyzeDiscrepancies(pivot1, pivot2, allDates);

  // Crea un set di date che hanno almeno una discrepanza, da passare alla UI
  // Questo evita di ricalcolarlo ogni volta e risolve il bug del filtro
  const datesWithDiscrepancies = new Set();
  for (const date in analysis.dateStats) {
    if (analysis.dateStats[date].discrepancies > 0) {
      datesWithDiscrepancies.add(date);
    }
  }

  return {
    ...analysis,
    datesWithDiscrepancies,
    pivot1,
    pivot2,
    unmatchedForUI,
    customMappings,
    allResourcesForUI,
    allCommesseForUI,
    exclusions,
  };
}
