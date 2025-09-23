// Le librerie Chart sono caricate globalmente da CDN
const { Chart } = window;

let resourceChartInstance = null;
let dateChartInstance = null;

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
      devicePixelRatio: 3, // For higher resolution PDF export
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

export function renderDateChart(dateStats) {
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
      devicePixelRatio: 3, // For higher resolution PDF export
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      plugins: { legend: { display: false } },
    },
  });
}

export function destroyCharts() {
  if (resourceChartInstance) {
    resourceChartInstance.destroy();
    resourceChartInstance = null;
  }
  if (dateChartInstance) {
    dateChartInstance.destroy();
    dateChartInstance = null;
  }
}
