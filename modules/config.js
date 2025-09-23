import { normalizeString } from './utils.js';

// Configuration for the first file: "Estrazione TS Bridge"
export const config1 = {
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
export const config2 = {
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
