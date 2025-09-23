// Le librerie Chart e jsPDF sono caricate globalmente da CDN
const { Chart } = window;

let resourceChartInstance = null;
let dateChartInstance = null;

// --- RENDER FUNCTIONS ---

export function renderDashboard(data, resourceChartSortOrder = 'alphabetical') {
  document.getElementById('totalHours1').textContent = data.totalHours1.toFixed(1);
  document.getElementById('totalHours2').textContent = data.totalHours2.toFixed(1);
  document.getElementById('totalDifferences').textContent = data.discrepancies.length;
  document.getElementById('accuracyPercentage').textContent = `${data.accuracy.toFixed(1)}%`;

  const accuracyFill = document.getElementById('accuracyFill');
  const accuracyText = document.getElementById('accuracyText');
  accuracyFill.style.width = '0%'; // Reset for animation

  setTimeout(() => {
    accuracyFill.style.width = `${data.accuracy}%`;
    accuracyText.textContent = `${data.accuracy.toFixed(1)}%`;
    if (data.accuracy < 70) {
      accuracyFill.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    } else if (data.accuracy < 90) {
      accuracyFill.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    } else {
      accuracyFill.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    }
  }, 100);

  renderResourceChart(data.resourceStats, resourceChartSortOrder);
  renderDateChart(data.dateStats);
}

function renderPivotTable(pivotData, containerId, otherPivotData = null, datesWithDiscrepancies = new Set(), discrepancyOnlyColumns = false) {
  const container = document.getElementById(containerId);
  const { grouped, sortedDates } = pivotData;

  // Determine which dates to render based on the filter
  const datesToRender = discrepancyOnlyColumns ? Array.from(datesWithDiscrepancies).sort() : sortedDates;

  // Crea l'HTML dell'intestazione, usando il set pre-calcolato di date con discrepanze
  const headerHtml = datesToRender
    .map((date) => {
      const [_, month, day] = date.split('-'); // YYYY-MM-DD
      const thClass = datesWithDiscrepancies.has(date) ? 'class="has-discrepancy"' : '';
      return `<th ${thClass}>${day}-${month}</th>`;
    })
    .join('');

  const bodyHtml = Object.keys(grouped)
    .sort()
    .map((key) => {
      const row = grouped[key];
      let total = 0;
      let hasDiscrepancyInRow = false;

      const dateCellsHtml = datesToRender
        .map((date) => {
          const hours = row.dates[date] || 0;
          total += hours;
          let cellClass = '';
          let cellValue = hours.toFixed(2);

          if (otherPivotData) {
            const otherRow = otherPivotData.grouped[key];
            const otherHours = otherRow ? otherRow.dates[date] || 0 : 0;
            if (Math.abs(hours - otherHours) > 0.01) {
              cellClass = 'difference';
              cellValue = `${hours.toFixed(2)} (${otherHours.toFixed(2)})`;
              hasDiscrepancyInRow = true;
            }
          }
          return `<td class="${cellClass}">${hours > 0 ? cellValue : ''}</td>`;
        })
        .join('');

      const rowClass = hasDiscrepancyInRow ? 'row-has-discrepancy' : '';

      return `
      <tr class="${rowClass}">
        <td>${row.risorsa}</td>
        <td>${row.commessa}</td>
        ${dateCellsHtml}
        <td><strong>${total.toFixed(2)}</strong></td>
      </tr>`;
    })
    .join('');

  container.innerHTML = `
    <div class="table-container">
      <table class="pivot-table">
        <thead>
          <tr>
            <th>Risorsa</th>
            <th>Commessa</th>
            ${headerHtml}
            <th>Totale</th>
          </tr>
        </thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>`;
}

export function renderResourceChart(resourceStats, sortOrder = 'alphabetical') {
  const ctx = document.getElementById('resourceChart').getContext('2d');
  if (resourceChartInstance) {
    resourceChartInstance.destroy();
  }

  let sortedResources;
  if (sortOrder === 'value') {
    // Sort by number of discrepancies, descending
    sortedResources = Object.keys(resourceStats).sort((a, b) => resourceStats[b].discrepancies - resourceStats[a].discrepancies);
  } else {
    // Default: alphabetical sort
    sortedResources = Object.keys(resourceStats).sort((a, b) => a.localeCompare(b));
  }

  if (sortedResources.length === 0) return;

  resourceChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sortedResources,
      datasets: [
        {
          label: 'Discrepanze',
          data: sortedResources.map((r) => resourceStats[r].discrepancies),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
        },
        {
          label: 'Totale Celle',
          data: sortedResources.map((r) => resourceStats[r].total),
          backgroundColor: 'rgba(102, 126, 234, 0.7)',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

function renderDateChart(dateStats) {
  const ctx = document.getElementById('dateChart').getContext('2d');
  if (dateChartInstance) {
    dateChartInstance.destroy();
  }
  const dates = Object.keys(dateStats).sort();
  if (dates.length === 0) return;

  dateChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Discrepanze per Data',
          data: dates.map((d) => dateStats[d].discrepancies),
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      plugins: { legend: { display: false } },
    },
  });
}

function filterPivotData(pivotData, filters, otherPivotData) {
  const { risorsa, commessa, discrepancyOnly } = filters;

  if (!risorsa && !commessa && !discrepancyOnly) {
    return pivotData;
  }

  const filteredGrouped = {};
  for (const key in pivotData.grouped) {
    const row = pivotData.grouped[key];
    const risorsaMatch = !risorsa || row.risorsa.toLowerCase().includes(risorsa);
    const commessaMatch = !commessa || row.commessa.toLowerCase().includes(commessa);

    if (risorsaMatch && commessaMatch) {
      if (discrepancyOnly) {
        const otherRow = otherPivotData.grouped[key];
        const hasDiscrepancy = pivotData.sortedDates.some((date) => {
          const hours1 = row.dates[date] || 0;
          const hours2 = otherRow?.dates[date] || 0;
          return Math.abs(hours1 - hours2) > 0.01;
        });

        if (hasDiscrepancy) {
          filteredGrouped[key] = row;
        }
      } else {
        filteredGrouped[key] = row;
      }
    }
  }

  return { ...pivotData, grouped: filteredGrouped };
}

export function renderFilteredPivotTables(analysisData, filters) {
  const filteredPivot1 = filterPivotData(analysisData.pivot1, filters, analysisData.pivot2);
  const filteredPivot2 = filterPivotData(analysisData.pivot2, filters, analysisData.pivot1);

  // Calculate datesWithDiscrepancies based on the *filtered* data
  const filteredDatesWithDiscrepancies = new Set();
  const allFilteredKeys = new Set([...Object.keys(filteredPivot1.grouped), ...Object.keys(filteredPivot2.grouped)]);

  // Iterate over all possible dates from the original analysis,
  // but check for discrepancies only within the currently filtered rows.
  analysisData.pivot1.sortedDates.forEach((date) => {
    // Use the full set of dates from original analysis
    let dateHasDiscrepancyInFilteredData = false;
    for (const key of allFilteredKeys) {
      const row1 = filteredPivot1.grouped[key];
      const row2 = filteredPivot2.grouped[key];
      const hours1 = row1?.dates[date] || 0;
      const hours2 = row2?.dates[date] || 0;
      if (Math.abs(hours1 - hours2) > 0.01) {
        dateHasDiscrepancyInFilteredData = true;
        break;
      }
    }
    if (dateHasDiscrepancyInFilteredData) {
      filteredDatesWithDiscrepancies.add(date);
    }
  });

  renderPivotTable(filteredPivot1, 'pivot1Container', filteredPivot2, filteredDatesWithDiscrepancies, filters.discrepancyOnly);
  renderPivotTable(filteredPivot2, 'pivot2Container', filteredPivot1, filteredDatesWithDiscrepancies, filters.discrepancyOnly);
}
// --- UI STATE FUNCTIONS ---

export function showLoading() {
  document.getElementById('loading').style.display = 'block';
}
export function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}
export function showResults() {
  document.getElementById('results').style.display = 'block';
}
export function hideResults() {
  document.getElementById('results').style.display = 'none';
}

export function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => (errorDiv.style.display = 'none'), 5000);
}

export function updateDemoUI() {
  document.getElementById('filename1').textContent = 'Sistema_Gestionale_Interno.xlsx (DEMO)';
  document.getElementById('filename1').style.display = 'block';
  document.getElementById('filename2').textContent = 'Sistema_HR_Esterno.xlsx (DEMO)';
  document.getElementById('filename2').style.display = 'block';

  const uploadSection = document.querySelector('.upload-section');
  let demoInfo = uploadSection.querySelector('.demo-info');
  if (!demoInfo) {
    demoInfo = document.createElement('div');
    demoInfo.className = 'demo-info';
    demoInfo.style.cssText = `
      background: rgba(16, 185, 129, 0.1); color: #059669; padding: 15px;
      border-radius: 10px; margin-top: 20px; text-align: center;
      border: 1px solid rgba(16, 185, 129, 0.3);`;
    uploadSection.appendChild(demoInfo);
  }
  demoInfo.innerHTML = `
    <strong>📊 Dati Demo Caricati!</strong><br>
    <small>Clicca "Elabora Timesheet" per vedere le differenze evidenziate.</small>`;
}

// --- TEAMS MODAL ---

export function showTeamsModal(data) {
  const container = document.getElementById('teamsMessages');
  const modal = document.getElementById('teamsModal');

  if (data.discrepancies.length === 0) {
    container.innerHTML = '<p style="text-align: center;">Nessuna discrepanza trovata. Ottimo lavoro!</p>';
    modal.style.display = 'block';
    return;
  }

  const discrepanciesByResource = data.discrepancies.reduce((acc, d) => {
    if (!acc[d.risorsa]) acc[d.risorsa] = [];
    acc[d.risorsa].push(d);
    return acc;
  }, {});

  const allMessagesHtml = Object.entries(discrepanciesByResource)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([resource, discrepancies]) => {
      let message = `Ciao ${resource},\n\n`;
      message += `ci sono le seguenti discrepanze nel tuo timesheet:\n\n`;
      discrepancies.forEach((d) => {
        message += `* Data: ${d.data}, Commessa: ${d.commessa}\n`;
        message += `  - Ore TS Bridge: ${d.hours1.toFixed(1)}h\n`;
        message += `  - Ore TC Kirey: ${d.hours2.toFixed(1)}h\n\n`;
      });
      message += `Grazie per la collaborazione.`;

      return `
        <div class="resource-message">
            <div class="resource-header">
                <div class="resource-name">${resource}</div>
                <button class="copy-btn-small">Copia Messaggio</button>
            </div>
            <pre class="teams-message">${message}</pre>
        </div>`;
    })
    .join('');

  container.innerHTML = allMessagesHtml;
  modal.style.display = 'block';
}

export function closeTeamsModal() {
  document.getElementById('teamsModal').style.display = 'none';
}

export function copyToClipboard(button) {
  const messageContainer = button.closest('.resource-message').querySelector('.teams-message');
  navigator.clipboard.writeText(messageContainer.textContent).then(() => {
    button.textContent = 'Copiato!';
    setTimeout(() => (button.textContent = 'Copia Messaggio'), 2000);
  });
}

export function showMappingModal(analysisData) {
  const { unmatchedForUI, customMappings } = analysisData;
  const modal = document.getElementById('mappingModal');
  const fromSelect = document.getElementById('mapFromFile1');
  const toSelect = document.getElementById('mapToFile2');
  const mappingsContainer = document.getElementById('currentMappingsContainer');

  // Popola i menu a tendina con le commesse non abbinate
  fromSelect.innerHTML = '<option value="">Seleziona Commessa File 1</option>' + unmatchedForUI.file1.map((c) => `<option value="${c.norm}">${c.raw}</option>`).join('');
  toSelect.innerHTML = '<option value="">Seleziona Commessa File 2</option>' + unmatchedForUI.file2.map((c) => `<option value="${c.norm}">${c.raw}</option>`).join('');

  // Mostra i mapping attualmente salvati
  const mappingEntries = Object.entries(customMappings);
  if (mappingEntries.length > 0) {
    mappingsContainer.innerHTML = mappingEntries
      .map(
        ([from, to]) => `
      <div class="mapping-item" data-from-norm="${from}">
        <span class="mapping-text">${from} ➡️ ${to}</span>
        <button class="delete-mapping-btn" title="Elimina Mapping">X</button>
      </div>
    `
      )
      .join('');
  } else {
    mappingsContainer.innerHTML = '<p>Nessun mapping personalizzato salvato.</p>';
  }

  modal.style.display = 'block';
}

export function closeMappingModal() {
  document.getElementById('mappingModal').style.display = 'none';
}

export function showExclusionModal(analysisData) {
  const { allResourcesForUI, allCommesseForUI, exclusions } = analysisData;
  const modal = document.getElementById('exclusionModal');

  const resourceSelect = document.getElementById('excludeResourceSelect');
  const commessaSelect = document.getElementById('excludeCommessaSelect');
  const resourceList = document.getElementById('currentResourceExclusions');
  const commessaList = document.getElementById('currentCommessaExclusions');

  const populateSelect = (select, options, currentExclusions) => {
    const availableOptions = options.filter((opt) => !currentExclusions.includes(opt));
    select.innerHTML = '<option value="">Seleziona per escludere...</option>' + availableOptions.map((opt) => `<option value="${opt}">${opt}</option>`).join('');
  };

  const renderList = (container, items, type) => {
    if (items.length > 0) {
      container.innerHTML = items
        .map(
          (item) => `
        <div class="exclusion-item" data-value="${item}" data-type="${type}">
          <span>${item}</span>
          <button class="delete-exclusion-btn" title="Rimuovi esclusione">X</button>
        </div>
      `
        )
        .join('');
    } else {
      container.innerHTML = '<p style="font-size: 0.9rem; color: #64748b;">Nessuna esclusione attiva.</p>';
    }
  };

  populateSelect(resourceSelect, allResourcesForUI, exclusions.resources);
  populateSelect(commessaSelect, allCommesseForUI, exclusions.commesse);

  renderList(resourceList, exclusions.resources, 'resources');
  renderList(commessaList, exclusions.commesse, 'commesse');

  modal.style.display = 'block';
}

export function closeExclusionModal() {
  document.getElementById('exclusionModal').style.display = 'none';
}
