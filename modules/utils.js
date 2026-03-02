// Funzione per normalizzare le stringhe (rimuove accenti, converte in minuscolo)
export function normalizeString(str) {
  const result = String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  // NOTA: Questo log può essere molto verboso.
  console.log(`[DEBUG] normalizeString - Input: "${str}", Output: "${result}"`);
  return result;
}
