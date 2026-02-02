import { showError } from './ui.js';

// La libreria XLSX è caricata globalmente da CDN
const { XLSX } = window;

function readFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      return reject(new Error('Seleziona un file Excel valido (.xlsx o .xls)'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        resolve(data);
      } catch (error) {
        reject(new Error(`Errore nella lettura del file: ${error.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Impossibile leggere il file.'));
    reader.readAsBinaryString(file);
  });
}

export function setupFileUpload(uploadBox, fileInput, filenameDiv, onFileLoaded) {
  const spinnerContainer = uploadBox.querySelector('.upload-spinner-container');

  const handleFile = (file) => {
    if (!file) return;
    filenameDiv.textContent = file.name;
    filenameDiv.style.display = 'block';

    if (spinnerContainer) spinnerContainer.style.display = 'flex';

    readFile(file)
      .then(onFileLoaded)
      .catch((err) => showError(err.message))
      .finally(() => {
        if (spinnerContainer) spinnerContainer.style.display = 'none';
      });
  };

  ['dragover', 'dragleave', 'drop'].forEach((eventName) => {
    uploadBox.addEventListener(eventName, (e) => e.preventDefault());
  });

  uploadBox.addEventListener('dragover', () => uploadBox.classList.add('dragover'));
  uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('dragover'));
  uploadBox.addEventListener('drop', (e) => {
    uploadBox.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
}
