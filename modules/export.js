// Le librerie XLSX e jsPDF sono caricate globalmente da CDN
const { XLSX } = window;
const { jsPDF } = window.jspdf;

export function exportToExcel(data) {
  const wb = XLSX.utils.book_new();

  const discrepancyData = [['Risorsa', 'Commessa', 'Data', 'Ore TS Bridge', 'Ore TC Kirey', 'Differenza']];
  data.discrepancies.forEach((d) => {
    discrepancyData.push([d.risorsa, d.commessa, d.data, d.hours1, d.hours2, d.difference.toFixed(2)]);
  });
  const ws1 = XLSX.utils.aoa_to_sheet(discrepancyData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Discrepanze');

  const statsData = [
    ['Metrica', 'Valore'],
    ['Ore Totali TS Bridge', data.totalHours1.toFixed(1)],
    ['Ore Totali TC Kirey', data.totalHours2.toFixed(1)],
    ['Numero Discrepanze', data.discrepancies.length],
    ['Accuratezza %', `${data.accuracy.toFixed(1)}%`],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(statsData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Statistiche');

  XLSX.writeFile(wb, `analisi_timesheet_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportToPDF(data) {
  const doc = new jsPDF({
    orientation: 'landscape', // Usa l'orientamento orizzontale per tabelle più larghe
  });

  // --- PAGINA 1: RIEPILOGO ---
  let y = 20;

  // Titolo
  doc.setFontSize(22);
  doc.text('Report Analisi Timesheet', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
  y += 15;

  // Statistiche Generali
  doc.setFontSize(16);
  doc.text('Statistiche Generali', 14, y);
  y += 8;
  doc.autoTable({
    startY: y,
    theme: 'grid',
    head: [['Metrica', 'Valore']],
    body: [
      ['Ore Totali TS Bridge', data.totalHours1.toFixed(1)],
      ['Ore Totali TC Kirey', data.totalHours2.toFixed(1)],
      ['Numero Discrepanze', data.discrepancies.length],
      ['Accuratezza', `${data.accuracy.toFixed(1)}%`],
    ],
    tableWidth: 'auto',
    styles: { cellPadding: 2, fontSize: 10 },
    headStyles: { fillColor: [102, 126, 234] }, // Colore intestazione
  });

  // --- PAGINA 2: GRAFICO RISORSE ---
  doc.addPage();
  y = 20;
  doc.setFontSize(22);
  doc.text('Grafico: Discrepanze per Risorsa', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
  y += 15;

  try {
    const resourceChartCanvas = document.getElementById('resourceChart');
    const resourceChartImg = resourceChartCanvas.toDataURL('image/png', 1.0);
    const page_width = doc.internal.pageSize.getWidth();
    const margin = 14;
    const chartWidth = page_width - margin * 2;
    const chartHeight = 150; // Altezza aumentata per migliore leggibilità
    doc.addImage(resourceChartImg, 'PNG', margin, y, chartWidth, chartHeight);
  } catch (e) {
    console.error("Errore nell'aggiungere il grafico risorse al PDF:", e);
    doc.setTextColor(255, 0, 0);
    doc.text('Impossibile generare il grafico per risorsa.', 14, y + 10);
    doc.setTextColor(0, 0, 0);
  }

  // --- PAGINA 3: GRAFICO DATE ---
  doc.addPage();
  y = 20;
  doc.setFontSize(22);
  doc.text('Grafico: Discrepanze per Data', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
  y += 15;

  try {
    const dateChartCanvas = document.getElementById('dateChart');
    const dateChartImg = dateChartCanvas.toDataURL('image/png', 1.0);
    const page_width = doc.internal.pageSize.getWidth();
    const margin = 14;
    const chartWidth = page_width - margin * 2;
    const chartHeight = 150; // Altezza aumentata per migliore leggibilità
    doc.addImage(dateChartImg, 'PNG', margin, y, chartWidth, chartHeight);
  } catch (e) {
    console.error("Errore nell'aggiungere il grafico date al PDF:", e);
    doc.setTextColor(255, 0, 0);
    doc.text('Impossibile generare il grafico per data.', 14, y + 10);
    doc.setTextColor(0, 0, 0);
  }

  // --- PAGINE SUCCESSIVE: TABELLE PIVOT ---
  const generatePivotTableForPdf = (doc, title, pivotData) => {
    doc.addPage();
    doc.setFontSize(18);
    doc.text(title, 14, 20);

    const head = [
      [
        'Risorsa',
        'Commessa',
        ...pivotData.sortedDates.map((date) => {
          const [_, month, day] = date.split('-');
          return `${day}-${month}`;
        }),
        'Totale',
      ],
    ];
    const body = Object.values(pivotData.grouped).map((row) => {
      let total = 0;
      const dateValues = pivotData.sortedDates.map((date) => {
        const hours = row.dates[date] || 0;
        total += hours;
        return hours > 0 ? hours.toFixed(2) : '';
      });
      return [row.risorsa, row.commessa, ...dateValues, total.toFixed(2)];
    });

    doc.autoTable({
      startY: 30,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [102, 126, 234], fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
  };

  generatePivotTableForPdf(doc, 'Pivot TS Bridge', data.pivot1);
  generatePivotTableForPdf(doc, 'Pivot TC Kirey', data.pivot2);

  // Salva il PDF
  doc.save(`report_timesheet_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportSummaryReport(data) {
  const summary = `
REPORT ANALISI TIMESHEET
================================

STATISTICHE GENERALI:
• Ore Totali TS Bridge: ${data.totalHours1.toFixed(1)} ore
• Ore Totali TC Kirey: ${data.totalHours2.toFixed(1)} ore
• Differenza Totale: ${Math.abs(data.totalHours1 - data.totalHours2).toFixed(1)} ore
• Accuratezza: ${data.accuracy.toFixed(1)}%
• Discrepanze Trovate: ${data.discrepancies.length}

RISORSE CON PIÙ DISCREPANZE:
${Object.entries(data.resourceStats)
  .sort((a, b) => b[1].discrepancies - a[1].discrepancies)
  .slice(0, 5)
  .map(([resource, stats]) => `• ${resource}: ${stats.discrepancies} discrepanze su ${stats.total} celle`)
  .join('\n')}

DATE CON PIÙ DISCREPANZE:
${Object.entries(data.dateStats)
  .sort((a, b) => b[1].discrepancies - a[1].discrepancies)
  .slice(0, 5)
  .map(([date, stats]) => `• ${date}: ${stats.discrepancies} discrepanze`)
  .join('\n')}

Data Report: ${new Date().toLocaleDateString('it-IT')}
  `.trim();

  const blob = new Blob([summary], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'riassunto_timesheet.txt';
  a.click();
  URL.revokeObjectURL(url);
}
