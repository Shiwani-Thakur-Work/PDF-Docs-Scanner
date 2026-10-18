/**
 * main.js
 * 
 * ApexDoc Scanner - Application Entry Point & Orchestrator.
 * 
 * Connects the Apple-style UI layout, document state machine,
 * interactive 4-corner perspective crop engine, adaptive filter pipeline,
 * and client-side PDF compiler.
 */

// Stylesheets
import './styles/tokens.css';
import './styles/app.css';
import './styles/crop.css';
import './styles/sheet.css';

// Core Processing Engines
import { warpPerspective } from './core/homography.js';
import { processCanvasWithFilter } from './core/filters.js';
import { loadImageFromFile, rotateCanvas, createThumbnailUrl, estimateInitialCorners } from './core/imageUtils.js';

// State & UI Components
import { docState } from './state/documentState.js';
import { CropEditor } from './components/cropEditor.js';
import { PageCarousel } from './components/pageCarousel.js';
import { ExportSheet } from './components/exportSheet.js';
import { showToast } from './components/toast.js';

/* ==========================================================================
   DOM Element References
   ========================================================================== */
const elApp = document.getElementById('app');
const elEmptyState = document.getElementById('emptyState');
const elDocumentViewer = document.getElementById('documentViewer');
const elCanvasWrapper = document.getElementById('canvasWrapper');
const elHeaderCenter = document.getElementById('headerCenter');
const elHeaderActions = document.getElementById('headerActions');
const elPageCounterText = document.getElementById('pageCounterText');
const elBottomDock = document.getElementById('bottomDock');
const elFilterTabs = document.querySelectorAll('.filter-tab');
const elPagesCarouselStrip = document.getElementById('pagesCarouselStrip');
const elProcessingOverlay = document.getElementById('processingOverlay');
const elProcessingText = document.getElementById('processingText');

// Buttons
const btnSnapCamera = document.getElementById('btnSnapCamera');
const btnUploadGallery = document.getElementById('btnUploadGallery');
const btnRotatePage = document.getElementById('btnRotatePage');
const btnAdjustCrop = document.getElementById('btnAdjustCrop');
const btnDeletePage = document.getElementById('btnDeletePage');
const btnOpenExport = document.getElementById('btnOpenExport');

// Hidden File Inputs
const inputCamera = document.getElementById('cameraInput');
const inputGallery = document.getElementById('galleryInput');

/* ==========================================================================
   Component Instances
   ========================================================================== */
const cropEditorRoot = document.getElementById('cropEditorRoot');
const exportSheetRoot = document.getElementById('exportSheetRoot');

let cropEditor = null;
let exportSheet = null;
let pageCarousel = null;

/* ==========================================================================
   PWA & Service Worker Registration (100% Offline Support)
   ========================================================================== */
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('[ApexDoc] Offline Service Worker registered'))
      .catch((err) => console.warn('[ApexDoc] Service Worker registration failed:', err));
  });
}

/* ==========================================================================
   Image Ingestion Pipeline
   ========================================================================== */
/**
 * Ingests an array of image files, processes their initial perspective
 * and adaptive B&W thresholding, and adds them to document state.
 * 
 * @param {FileList | Array<File>} files 
 */
async function processIncomingFiles(files) {
  if (!files || files.length === 0) return;

  const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (validFiles.length === 0) {
    showToast('Please select valid image files', 'error');
    return;
  }

  docState.setProcessing(true, `Processing ${validFiles.length} page${validFiles.length > 1 ? 's' : ''}...`);

  try {
    for (const file of validFiles) {
      // 1. Load image into memory
      const img = await loadImageFromFile(file);

      // 2. Compute initial estimated document corners
      const corners = estimateInitialCorners(img.naturalWidth, img.naturalHeight);

      // 3. Perform high-performance homography warp
      const warpedCanvas = warpPerspective(img, corners);

      // 4. Apply clean document thresholding (default 'bw')
      const processedCanvas = processCanvasWithFilter(warpedCanvas, 'bw');

      // 5. Generate high-resolution thumbnail for carousel
      const thumbUrl = createThumbnailUrl(processedCanvas);

      // 6. Create document page object
      const page = {
        id: 'page_' + Math.random().toString(36).substring(2, 9),
        originalImage: img,
        quadPoints: corners,
        rotation: 0,
        activeFilter: 'bw',
        warpedCanvas: warpedCanvas,
        processedCanvas: processedCanvas,
        thumbnailUrl: thumbUrl
      };

      docState.addPage(page);
    }

    showToast(
      validFiles.length === 1 ? 'Page scanned successfully' : `${validFiles.length} pages added`,
      'success'
    );
  } catch (err) {
    console.error('File ingestion failed:', err);
    showToast('Failed to process image: ' + err.message, 'error');
  } finally {
    docState.setProcessing(false);
    // Reset file input values so the same image can be re-selected if desired
    inputCamera.value = '';
    inputGallery.value = '';
  }
}

/* ==========================================================================
   UI Synchronization & State Subscribers
   ========================================================================== */
function syncUIWithState() {
  const { pages, currentPageIndex, isProcessing, processingMessage } = docState;
  const hasPages = pages.length > 0;
  const currentPage = docState.getCurrentPage();

  // 1. Processing Overlay
  if (isProcessing) {
    elProcessingOverlay.style.display = 'flex';
    elProcessingText.textContent = processingMessage || 'Processing...';
  } else {
    elProcessingOverlay.style.display = 'none';
  }

  // 2. Viewport visibility toggle: Empty Hero vs. Document View
  if (!hasPages) {
    elEmptyState.style.display = 'flex';
    elDocumentViewer.style.display = 'none';
    elHeaderCenter.style.display = 'none';
    elHeaderActions.style.display = 'none';
    elBottomDock.style.display = 'none';
    elPagesCarouselStrip.style.display = 'none';
    elCanvasWrapper.innerHTML = '';
    return;
  }

  elEmptyState.style.display = 'none';
  elDocumentViewer.style.display = 'flex';
  elHeaderCenter.style.display = 'block';
  elHeaderActions.style.display = 'flex';
  elBottomDock.style.display = 'flex';

  // 3. Update Page Counter Pill (e.g. "Page 1 of 3")
  elPageCounterText.textContent = `Page ${currentPageIndex + 1} of ${pages.length}`;

  // 4. Update Filter Tabs selection to match active page
  const activeFilter = currentPage ? currentPage.activeFilter : 'bw';
  elFilterTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === activeFilter);
  });

  // 5. Render Active Processed Document Canvas with rotation
  if (currentPage && currentPage.processedCanvas) {
    elCanvasWrapper.innerHTML = '';

    // Create rotated display canvas if needed
    let displayCanvas = currentPage.processedCanvas;
    if (currentPage.rotation && currentPage.rotation !== 0) {
      displayCanvas = rotateCanvas(currentPage.processedCanvas, currentPage.rotation);
    }

    elCanvasWrapper.appendChild(displayCanvas);
  }
}

/* ==========================================================================
   Filter Switcher Logic
   ========================================================================== */
function applyFilterToCurrentPage(filterType) {
  const page = docState.getCurrentPage();
  if (!page || page.activeFilter === filterType) return;

  docState.setProcessing(true, 'Applying filter...');

  setTimeout(() => {
    try {
      page.activeFilter = filterType;
      // Re-filter from the un-degraded warped base canvas
      page.processedCanvas = processCanvasWithFilter(page.warpedCanvas, filterType);
      page.thumbnailUrl = createThumbnailUrl(page.processedCanvas);
      docState.notify();
    } catch (err) {
      console.error('Filter application error:', err);
      showToast('Could not apply filter', 'error');
    } finally {
      docState.setProcessing(false);
    }
  }, 20);
}

/* ==========================================================================
   Event Listeners & User Interactions
   ========================================================================== */
function setupEventListeners() {
  // Trigger Camera Capture
  btnSnapCamera.addEventListener('click', () => {
    inputCamera.click();
  });

  // Trigger Photo Library Upload
  btnUploadGallery.addEventListener('click', () => {
    inputGallery.click();
  });

  // Try Sample Document Demo
  const btnTrySample = document.getElementById('btnTrySample');
  if (btnTrySample) {
    btnTrySample.addEventListener('click', async () => {
      try {
        docState.setProcessing(true, 'Loading sample document...');
        const res = await fetch('./sample-invoice.svg');
        const blob = await res.blob();
        const file = new File([blob], 'Sample_Invoice.svg', { type: 'image/svg+xml' });
        await processIncomingFiles([file]);
      } catch (err) {
        console.error('Failed to load sample document:', err);
        showToast('Could not load sample document', 'error');
        docState.setProcessing(false);
      }
    });
  }

  // Native input change handlers
  inputCamera.addEventListener('change', (e) => {
    processIncomingFiles(e.target.files);
  });

  inputGallery.addEventListener('change', (e) => {
    processIncomingFiles(e.target.files);
  });

  // Rotate Page 90° Clockwise
  btnRotatePage.addEventListener('click', () => {
    docState.rotateCurrentPage();
    showToast('Rotated 90°', 'info', 1500);
  });

  // Open 4-Corner Perspective Adjustment Mode
  btnAdjustCrop.addEventListener('click', () => {
    const page = docState.getCurrentPage();
    if (!page) return;
    docState.setCropping(true);
    cropEditor.open(page);
  });

  // Delete Current Page
  btnDeletePage.addEventListener('click', () => {
    const { pages, currentPageIndex } = docState;
    if (pages.length === 0) return;

    docState.deletePage(currentPageIndex);
    showToast('Page removed', 'info');
  });

  // Filter Segmented Pill Clicks
  elFilterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filterType = tab.dataset.filter;
      applyFilterToCurrentPage(filterType);
    });
  });

  // Open Export PDF Bottom Sheet
  btnOpenExport.addEventListener('click', () => {
    docState.setExporting(true);
    exportSheet.open();
  });

  // Drag and drop support on desktop
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files) {
      processIncomingFiles(e.dataTransfer.files);
    }
  });
}

/* ==========================================================================
   Application Initialization
   ========================================================================== */
function initApp() {
  // Initialize Crop Editor
  cropEditor = new CropEditor(
    cropEditorRoot,
    (updatedPage) => {
      // On crop completion: update warped base and current view
      updatedPage.warpedCanvas = warpPerspective(updatedPage.originalImage, updatedPage.quadPoints);
      updatedPage.processedCanvas = processCanvasWithFilter(updatedPage.warpedCanvas, updatedPage.activeFilter);
      updatedPage.thumbnailUrl = createThumbnailUrl(updatedPage.processedCanvas);
      docState.setCropping(false);
      docState.notify();
      showToast('Edges adjusted', 'success');
    },
    () => {
      // On crop cancel
      docState.setCropping(false);
      cropEditor.close();
    }
  );

  // Initialize Export Modal Sheet
  exportSheet = new ExportSheet(exportSheetRoot);

  // Initialize Multi-Page Thumbnail Strip
  pageCarousel = new PageCarousel(elPagesCarouselStrip, () => {
    // When "+" is clicked in thumbnail strip, open gallery or camera
    inputGallery.click();
  });

  // Subscribe UI to State updates
  docState.subscribe(syncUIWithState);

  // Attach User Interaction Listeners
  setupEventListeners();

  // Initial Sync
  syncUIWithState();

  console.log('[ApexDoc] Initialized successfully in minimal Apple mode');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
