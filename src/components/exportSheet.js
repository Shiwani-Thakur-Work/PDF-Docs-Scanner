/**
 * exportSheet.js
 * 
 * Apple iOS Bottom Modal Sheet for PDF Export Settings & System Share.
 */

import { compilePdfDocument, shareOrDownloadPdf, PAPER_FORMATS, QUALITY_PROFILES } from '../core/pdfExport.js';
import { rotateCanvas } from '../core/imageUtils.js';
import { docState } from '../state/documentState.js';
import { showToast } from './toast.js';

export class ExportSheet {
  constructor(containerEl) {
    this.container = containerEl;
    this.selectedFormat = 'a4';
    this.selectedQuality = 'balanced';
    this.initDOM();
    this.attachEvents();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="sheet-backdrop" id="sheetBackdrop">
        <div class="bottom-sheet" id="bottomSheet">
          <div class="sheet-handle"></div>
          
          <div class="sheet-header">
            <span class="sheet-title">Export PDF</span>
            <button class="sheet-close-btn" id="sheetCloseBtn" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Document Filename -->
          <div class="sheet-section">
            <label class="sheet-label" for="exportFilename">Document Name</label>
            <input type="text" id="exportFilename" class="sheet-input" placeholder="Document Name" />
          </div>

          <!-- Paper Format -->
          <div class="sheet-section">
            <span class="sheet-label">Page Format</span>
            <div class="segmented-control" id="formatSegmented">
              <button class="segmented-option active" data-format="a4">A4</button>
              <button class="segmented-option" data-format="letter">Letter</button>
              <button class="segmented-option" data-format="auto">Auto-Fit</button>
            </div>
          </div>

          <!-- Quality Compression -->
          <div class="sheet-section">
            <span class="sheet-label">File Quality</span>
            <div class="segmented-control" id="qualitySegmented">
              <button class="segmented-option" data-quality="compact">Compact</button>
              <button class="segmented-option active" data-quality="balanced">Balanced</button>
              <button class="segmented-option" data-quality="high">High</button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="sheet-actions">
            <button class="btn-primary" id="btnSharePdf">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                <polyline points="16 6 12 2 8 6"></polyline>
                <line x1="12" y1="2" x2="12" y2="15"></line>
              </svg>
              <span>Share / Save to Files</span>
            </button>
            <button class="btn-secondary" id="btnDownloadPdf">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Direct Download</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.backdrop = this.container.querySelector('#sheetBackdrop');
    this.sheet = this.container.querySelector('#bottomSheet');
    this.filenameInput = this.container.querySelector('#exportFilename');
    this.btnClose = this.container.querySelector('#sheetCloseBtn');
    this.formatControl = this.container.querySelector('#formatSegmented');
    this.qualityControl = this.container.querySelector('#qualitySegmented');
    this.btnShare = this.container.querySelector('#btnSharePdf');
    this.btnDownload = this.container.querySelector('#btnDownloadPdf');
  }

  attachEvents() {
    // Dismiss on backdrop click
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    this.btnClose.addEventListener('click', () => this.close());

    // Format selection
    this.formatControl.addEventListener('click', (e) => {
      const btn = e.target.closest('.segmented-option');
      if (!btn) return;
      this.formatControl.querySelectorAll('.segmented-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.selectedFormat = btn.dataset.format;
    });

    // Quality selection
    this.qualityControl.addEventListener('click', (e) => {
      const btn = e.target.closest('.segmented-option');
      if (!btn) return;
      this.qualityControl.querySelectorAll('.segmented-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.selectedQuality = btn.dataset.quality;
    });

    // Share / Save to Files
    this.btnShare.addEventListener('click', () => this.exportPdf(true));

    // Direct Download
    this.btnDownload.addEventListener('click', () => this.exportPdf(false));
  }

  open() {
    // Generate default timestamped filename
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    this.filenameInput.value = `Scan_${dateStr}_${timeStr}.pdf`;

    this.backdrop.classList.add('active');
  }

  close() {
    this.backdrop.classList.remove('active');
    docState.setExporting(false);
  }

  async exportPdf(useShareApi) {
    if (docState.pages.length === 0) {
      showToast('No pages to export', 'error');
      return;
    }

    docState.setProcessing(true, 'Compiling PDF document...');

    setTimeout(async () => {
      try {
        // Collect processed canvases and respect rotation
        const finalCanvases = docState.pages.map(page => {
          if (page.rotation && page.rotation !== 0) {
            return rotateCanvas(page.processedCanvas, page.rotation);
          }
          return page.processedCanvas;
        });

        // Compile multi-page PDF blob
        const pdfBlob = await compilePdfDocument(finalCanvases, {
          format: this.selectedFormat,
          quality: this.selectedQuality,
          margin: this.selectedFormat === 'auto' ? 0 : 5
        });

        let filename = this.filenameInput.value.trim();
        if (!filename) filename = 'Scanned_Document.pdf';
        if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

        if (useShareApi) {
          const result = await shareOrDownloadPdf(pdfBlob, filename);
          if (result.shared) {
            showToast('Document shared successfully', 'success');
          } else {
            showToast('PDF downloaded successfully', 'success');
          }
        } else {
          // Direct download
          const objectUrl = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
          showToast('PDF downloaded successfully', 'success');
        }

        this.close();
      } catch (err) {
        console.error('PDF export failed:', err);
        showToast('Failed to compile PDF: ' + err.message, 'error');
      } finally {
        docState.setProcessing(false);
      }
    }, 50);
  }
}
