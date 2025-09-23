// Funzione per normalizzare le stringhe (rimuove accenti, converte in minuscolo)
export function normalizeString(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
