import { setupFileUpload } from './file-handler.js';
import { processAndAnalyze } from './data.js';
import { getCustomMappings, saveCustomMappings, getExclusions, saveExclusions } from './storage.js';
import * as ui from './ui.js';
import { renderResourceChart, destroyCharts } from './charts.js';
import * as exporter from './export.js';
import { getDemoData } from './demo.js';

// --- STATE MANAGEMENT ---
const state = {
  file1Data: null,
  file2Data: null,
  analysisData: null,
  // Store the current layout preference
  resourceChartSort: localStorage.getItem('resource_chart_sort_preference') || 'alphabetical',
  pivotLayout: localStorage.getItem('pivot_layout_preference') || 'vertical',
  discrepancyFilter: localStorage.getItem('discrepancy_filter_preference') === 'true',
};

// --- DOM ELEMENTS ---
const processBtn = document.getElementById('processBtn');
const demoBtn = document.getElementById('demoBtn');
const teamsModal = document.getElementById('teamsModal');
const exportContainer = document.querySelector('.export-buttons');
const mappingBtn = document.getElementById('mappingBtn');
const mappingModal = document.getElementById('mappingModal');
const managementSection = document.getElementById('managementSection');
const exclusionBtn = document.getElementById('exclusionBtn');
const exclusionModal = document.getElementById('exclusionModal');
const filterResourceGlobal = document.getElementById('filterResourceGlobal');
const filterCommessaGlobal = document.getElementById('filterCommessaGlobal');
const filterDiscrepancy = document.getElementById('filterDiscrepancy');
const resetBtn = document.getElementById('resetBtn');
const pivotsWrapper = document.getElementById('pivots-wrapper');
const viewVerticalBtn = document.getElementById('viewVerticalBtn');
const viewHorizontalBtn = document.getElementById('viewHorizontalBtn');
const sortResourceAlpha = document.getElementById('sortResourceAlpha');
const sortResourceValue = document.getElementById('sortResourceValue');

// --- CORE FUNCTIONS ---
function checkFilesReady() {
  processBtn.disabled = !(state.file1Data && state.file2Data); // Abilita processBtn solo se entrambi i file sono caricati
  resetBtn.disabled = !(state.file1Data || state.file2Data); // Abilita resetBtn se almeno un file è caricato
}

function handleProcess() {
  ui.showLoading();
  ui.hideResults();

  // setTimeout permette all'UI di aggiornarsi (mostrando il loading) prima di iniziare l'elaborazione pesante
  setTimeout(() => {
    try {
      // Pulisce i filtri prima di una nuova elaborazione
      filterResourceGlobal.value = '';
      filterCommessaGlobal.value = '';

      const customMappings = getCustomMappings();
      const exclusions = getExclusions();
      state.analysisData = processAndAnalyze(state.file1Data, state.file2Data, customMappings, exclusions);
      // Render dashboard and charts, respecting the saved sort order
      ui.renderDashboard(state.analysisData, state.resourceChartSort);
      // Render pivot tables, respecting all active filters (including discrepancy filter)
      handleFilterChange();

      ui.showResults();
      managementSection.style.display = 'block';
    } catch (error) {
      console.error(error);
      ui.showError(`Errore durante l'elaborazione: ${error.message}`);
    } finally {
      ui.hideLoading();
    }
  }, 50);
}

function handleDemoLoad() {
  const { file1Data, file2Data } = getDemoData();
  state.file1Data = file1Data;
  state.file2Data = file2Data;

  demoBtn.disabled = true; // Disabilita il pulsante demo dopo il caricamento dei dati demo
  // Pulisce i filtri quando si caricano i dati demo
  filterResourceGlobal.value = '';
  filterCommessaGlobal.value = '';

  ui.updateDemoUI();
  checkFilesReady();
}

function handleReset() {
  state.file1Data = null;
  state.file2Data = null;
  state.analysisData = null;

  // Reset UI elements
  document.getElementById('filename1').textContent = '';
  document.getElementById('filename1').style.display = 'none';
  document.getElementById('filename2').textContent = '';
  document.getElementById('filename2').style.display = 'none';
  document.getElementById('pivot1Container').innerHTML = '';
  document.getElementById('pivot2Container').innerHTML = '';
  document.getElementById('errorMessage').style.display = 'none';
  destroyCharts();
  const demoInfo = document.querySelector('.demo-info');
  if (demoInfo) demoInfo.remove();

  filterResourceGlobal.value = '';
  filterCommessaGlobal.value = '';
  filterDiscrepancy.checked = false;
  state.resourceChartSort = 'alphabetical';
  sortResourceAlpha.classList.add('active');
  sortResourceValue.classList.remove('active');
  localStorage.setItem('discrepancy_filter_preference', 'false');
  localStorage.setItem('resource_chart_sort_preference', 'alphabetical');

  ui.hideResults();
  managementSection.style.display = 'none';
  demoBtn.disabled = false; // Riabilita il pulsante demo
  checkFilesReady(); // Aggiorna lo stato dei pulsanti process e reset
}

function handleFilterChange() {
  if (!state.analysisData) return;

  const filters = {
    risorsa: filterResourceGlobal.value.toLowerCase(),
    commessa: filterCommessaGlobal.value.toLowerCase(),
    discrepancyOnly: filterDiscrepancy.checked,
  };

  localStorage.setItem('discrepancy_filter_preference', filters.discrepancyOnly);

  ui.renderFilteredPivotTables(state.analysisData, filters);
}

// --- EVENT LISTENERS SETUP ---
function setupEventListeners() {
  processBtn.addEventListener('click', handleProcess);
  demoBtn.addEventListener('click', handleDemoLoad);
  resetBtn.addEventListener('click', handleReset);

  // File Uploads
  setupFileUpload(document.getElementById('upload1'), document.getElementById('file1'), document.getElementById('filename1'), (data) => {
    state.file1Data = data;
    demoBtn.disabled = true;
    checkFilesReady();
  });

  setupFileUpload(document.getElementById('upload2'), document.getElementById('file2'), document.getElementById('filename2'), (data) => {
    state.file2Data = data;
    demoBtn.disabled = true;
    checkFilesReady();
  });

  sortResourceAlpha.addEventListener('click', () => {
    if (state.resourceChartSort !== 'alphabetical') {
      state.resourceChartSort = 'alphabetical';
      localStorage.setItem('resource_chart_sort_preference', 'alphabetical');
      sortResourceAlpha.classList.add('active');
      sortResourceValue.classList.remove('active');
      if (state.analysisData) {
        renderResourceChart(state.analysisData.resourceStats, state.resourceChartSort);
      }
    }
  });

  sortResourceValue.addEventListener('click', () => {
    if (state.resourceChartSort !== 'value') {
      state.resourceChartSort = 'value';
      localStorage.setItem('resource_chart_sort_preference', 'value');
      sortResourceValue.classList.add('active');
      sortResourceAlpha.classList.remove('active');
      if (state.analysisData) {
        renderResourceChart(state.analysisData.resourceStats, state.resourceChartSort);
      }
    }
  });

  // Teams Modal (con event delegation)
  teamsModal.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('close-modal') || target.id === 'teamsModal') {
      ui.closeTeamsModal();
    }
    if (target.classList.contains('copy-btn-small')) {
      ui.copyToClipboard(target);
    }
  });

  // Scroll Sync for Pivot Tables
  const pivot1Container = document.getElementById('pivot1Container');
  const pivot2Container = document.getElementById('pivot2Container');
  let isSyncing1 = false;
  let isSyncing2 = false;

  pivot1Container.addEventListener(
    'scroll',
    (e) => {
      if (e.target.className !== 'table-container') return;
      const scroll1El = e.target;
      const scroll2El = pivot2Container.querySelector('.table-container');

      if (!isSyncing1 && scroll2El) {
        isSyncing2 = true;
        scroll2El.scrollLeft = scroll1El.scrollLeft;
      }
      isSyncing1 = false;
    },
    true
  );

  pivot2Container.addEventListener(
    'scroll',
    (e) => {
      if (e.target.className !== 'table-container') return;
      const scroll2El = e.target;
      const scroll1El = pivot1Container.querySelector('.table-container');

      if (!isSyncing2 && scroll1El) {
        isSyncing1 = true;
        scroll1El.scrollLeft = scroll2El.scrollLeft;
      }
      isSyncing2 = false;
    },
    true
  );

  mappingBtn.addEventListener('click', () => {
    if (state.analysisData) {
      ui.showMappingModal(state.analysisData);
    }
  });

  mappingModal.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('close-modal') || target.id === 'mappingModal') {
      ui.closeMappingModal();
    }

    if (target.id === 'saveMappingBtn') {
      const fromNorm = document.getElementById('mapFromFile1').value;
      const toNorm = document.getElementById('mapToFile2').value;

      if (fromNorm && toNorm) {
        const mappings = getCustomMappings();
        mappings[fromNorm] = toNorm;
        saveCustomMappings(mappings);
        ui.closeMappingModal();
        handleProcess(); // Ricarica l'analisi
      } else {
        alert('Seleziona una commessa da entrambi i menu.');
      }
    }

    if (target.classList.contains('delete-mapping-btn')) {
      const item = target.closest('.mapping-item');
      const fromNorm = item.dataset.fromNorm;
      if (fromNorm) {
        const mappings = getCustomMappings();
        delete mappings[fromNorm];
        saveCustomMappings(mappings);
        ui.closeMappingModal();
        handleProcess(); // Ricarica l'analisi
      }
    }
  });

  exclusionBtn.addEventListener('click', () => {
    if (state.analysisData) {
      ui.showExclusionModal(state.analysisData);
    }
  });

  exclusionModal.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('close-modal') || target.id === 'exclusionModal') {
      ui.closeExclusionModal();
    }

    const handleAddExclusion = (type, selectId) => {
      const select = document.getElementById(selectId);
      const value = select.value;
      if (value) {
        const exclusions = getExclusions();
        if (!exclusions[type].includes(value)) {
          exclusions[type].push(value);
          saveExclusions(exclusions);
          ui.closeExclusionModal();
          handleProcess();
        }
      }
    };

    if (target.id === 'addResourceExclusionBtn') {
      handleAddExclusion('resources', 'excludeResourceSelect');
    }

    if (target.id === 'addCommessaExclusionBtn') {
      handleAddExclusion('commesse', 'excludeCommessaSelect');
    }

    if (target.classList.contains('delete-exclusion-btn')) {
      const item = target.closest('.exclusion-item');
      const value = item.dataset.value;
      const type = item.dataset.type;
      if (value && type) {
        const exclusions = getExclusions();
        exclusions[type] = exclusions[type].filter((ex) => ex !== value);
        saveExclusions(exclusions);
        ui.closeExclusionModal();
        handleProcess();
      }
    }
  });

  // Filtri per le tabelle pivot
  const filterInputs = [filterResourceGlobal, filterCommessaGlobal];
  filterInputs.forEach((input) => {
    input.addEventListener('keyup', handleFilterChange);
  });
  filterDiscrepancy.addEventListener('change', handleFilterChange);

  // Export Buttons (con event delegation)
  exportContainer.addEventListener('click', (e) => {
    const button = e.target.closest('.btn-export');
    if (!button || !state.analysisData) return;

    try {
      switch (button.id) {
        case 'exportExcel':
          exporter.exportToExcel(state.analysisData);
          break;
        case 'exportPDF':
          exporter.exportToPDF(state.analysisData);
          break;
        case 'exportSummary':
          exporter.exportSummaryReport(state.analysisData);
          break;
        case 'exportTeams':
          ui.showTeamsModal(state.analysisData);
          break;
      }
    } catch (error) {
      console.error(`Errore durante l'export (${button.id}):`, error);
      alert("Errore durante l'export. Controlla la console per dettagli.");
    }
  });
}

function setupLayoutToggle() {
  // Apply saved layout on load
  if (state.pivotLayout === 'horizontal') {
    pivotsWrapper.classList.add('horizontal-layout');
    viewHorizontalBtn.classList.add('active');
    viewVerticalBtn.classList.remove('active');
  } else {
    pivotsWrapper.classList.remove('horizontal-layout');
    viewVerticalBtn.classList.add('active');
    viewHorizontalBtn.classList.remove('active');
  }

  viewVerticalBtn.addEventListener('click', () => {
    pivotsWrapper.classList.remove('horizontal-layout');
    viewVerticalBtn.classList.add('active');
    viewHorizontalBtn.classList.remove('active');
    localStorage.setItem('pivot_layout_preference', 'vertical');
  });

  viewHorizontalBtn.addEventListener('click', () => {
    pivotsWrapper.classList.add('horizontal-layout');
    viewHorizontalBtn.classList.add('active');
    viewVerticalBtn.classList.remove('active');
    localStorage.setItem('pivot_layout_preference', 'horizontal');
  });
}

function setupInitialState() {
  // Set checkbox from localStorage
  filterDiscrepancy.checked = state.discrepancyFilter;
  // Set initial sort button state based on localStorage
  if (state.resourceChartSort === 'value') {
    sortResourceValue.classList.add('active');
    sortResourceAlpha.classList.remove('active');
  } else {
    // 'alphabetical' or default
    sortResourceAlpha.classList.add('active');
    sortResourceValue.classList.remove('active');
  }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupLayoutToggle();
  setupInitialState();
});
