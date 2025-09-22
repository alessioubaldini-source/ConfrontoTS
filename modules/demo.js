export function getDemoData() {
  const file1Data = [
    ['Risorsa', 'Descrizione Commessa', 'Data', 'Ore'],
    ['Rossi Mario', 'CMS-UFI-MIGRAZIONE APEX-MODULO 1', '2024-05-20', 8],
    ['Rossi Mario', 'CMS-UFI-MIGRAZIONE APEX-MODULO 1', '2024-05-21', 6],
    ['Rossi Mario', 'APP-SVI-NUOVA FUNZIONE', '2024-05-21', 2],
    ['Bianchi Laura', 'CMS-UFI-MIGRAZIONE APEX-MODULO 1', '2024-05-20', 7],
    ['Bianchi Laura', 'APP-SVI-NUOVA FUNZIONE', '2024-05-20', 1],
    ['Bianchi Laura', 'APP-SVI-NUOVA FUNZIONE', '2024-05-21', 8],
    ['Verdi Giuseppe', 'DB-MANUTENZIONE', '2024-05-20', 8],
    ['Verdi Giuseppe', 'DB-MANUTENZIONE', '2024-05-21', 4],
    ['Verdi Giuseppe', 'CMS-UFI-MIGRAZIONE APEX-MODULO 1', '2024-05-21', 4],
    ['Neri Anna', 'APP-SVI-NUOVA FUNZIONE', '2024-05-20', 6],
    ['Neri Anna', 'DB-MANUTENZIONE', '2024-05-20', 2],
    ['Neri Anna', 'APP-SVI-NUOVA FUNZIONE', '2024-05-21', 8],
  ];

  const file2Data = [
    ['Name', 'Project Name', 'Calendar Date', 'Processed Hours'],
    ['Rossi, Mario', 'UFICMS - MIGRAZIONE APEX - MODULO 1', '2024-05-20', 8],
    ['Rossi, Mario', 'UFICMS - MIGRAZIONE APEX - MODULO 1', '2024-05-21', 7], // Differenza: 7 vs 6
    ['Rossi, Mario', 'APP SVI - NUOVA FUNZIONE', '2024-05-21', 1], // Differenza: 1 vs 2
    ['Bianchi, Laura', 'UFICMS - MIGRAZIONE APEX - MODULO 1', '2024-05-20', 7],
    ['Bianchi, Laura', 'APP SVI - NUOVA FUNZIONE', '2024-05-20', 1],
    ['Bianchi, Laura', 'APP SVI - NUOVA FUNZIONE', '2024-05-21', 8],
    ['Verdi, Giuseppe', 'DB MANUTENZIONE', '2024-05-20', 8],
    ['Verdi, Giuseppe', 'DB MANUTENZIONE', '2024-05-21', 5], // Differenza: 5 vs 4
    ['Verdi, Giuseppe', 'UFICMS - MIGRAZIONE APEX - MODULO 1', '2024-05-21', 3], // Differenza: 3 vs 4
    ['Neri, Anna', 'APP SVI - NUOVA FUNZIONE', '2024-05-20', 8], // Differenza: 8 vs 6
    ['Neri, Anna', 'DB MANUTENZIONE', '2024-05-20', 2],
    // Anna Neri manca il 21/05 su APP SVI (differenza: 0 vs 8)
    ['Blu, Francesco', 'PROGETTO-EXTRA', '2024-05-20', 4], // Risorsa presente solo nel secondo file
    ['Blu, Francesco', 'PROGETTO-EXTRA', '2024-05-21', 6],
  ];

  return { file1Data, file2Data };
}
