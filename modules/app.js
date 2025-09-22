import { setupFileUpload } from './file-handler.js';
import { processAndAnalyze, getCustomMappings, saveCustomMappings, getExclusions, saveExclusions } from './data.js';
import * as ui from './ui.js';
import * as exporter from './export.js';
import { getDemoData } from './demo.js';

// --- STATE MANAGEMENT ---
const state = {
  file1Data: null,
  file2Data: null,
  analysisData: null,
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

// --- CORE FUNCTIONS ---
function checkFilesReady() {
  processBtn.disabled = !(state.file1Data && state.file2Data);
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
      ui.renderAllResults(state.analysisData);
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

  // Pulisce i filtri quando si caricano i dati demo
  filterResourceGlobal.value = '';
  filterCommessaGlobal.value = '';

  ui.updateDemoUI();
  checkFilesReady();
}

function handleFilterChange() {
  if (!state.analysisData) return;

  const filters = {
    risorsa: filterResourceGlobal.value.toLowerCase(),
    commessa: filterCommessaGlobal.value.toLowerCase(),
  };

  ui.renderFilteredPivotTables(state.analysisData, filters);
}

// --- EVENT LISTENERS SETUP ---
function setupEventListeners() {
  processBtn.addEventListener('click', handleProcess);
  demoBtn.addEventListener('click', handleDemoLoad);

  // File Uploads
  setupFileUpload(document.getElementById('upload1'), document.getElementById('file1'), document.getElementById('filename1'), (data) => {
    state.file1Data = data;
    checkFilesReady();
  });

  setupFileUpload(document.getElementById('upload2'), document.getElementById('file2'), document.getElementById('filename2'), (data) => {
    state.file2Data = data;
    checkFilesReady();
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
  let scroll1El,
    scroll2El,
    isSyncing1 = false,
    isSyncing2 = false;

  pivot1Container.addEventListener(
    'scroll',
    (e) => {
      scroll1El = scroll1El || e.target;
      scroll2El = scroll2El || pivot2Container.querySelector('.table-container');

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
      scroll2El = scroll2El || e.target;
      scroll1El = scroll1El || pivot1Container.querySelector('.table-container');

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
    input.addEventListener('keyup', handleFilterChange); // Usiamo keyup per un'esperienza migliore
  });

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

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', setupEventListeners);
