/**
 * pdfExport.js
 * 
 * Client-Side PDF Compilation and Native System Share Integration.
 * 
 * Uses jsPDF to assemble multi-page documents entirely in-browser.
 * Hooks into the Web Share API (navigator.share) so iOS/Android users
 * can instantly send to AirDrop, WhatsApp, Apple "Save to Files", or Mail.
 */

import { jsPDF } from 'jspdf';

/**
 * Standard paper formats supported (in millimeters).
 */
export const PAPER_FORMATS = {
  a4: { name: 'A4', width: 210, height: 297 },
  letter: { name: 'US Letter', width: 215.9, height: 279.4 },
  auto: { name: 'Auto-Fit (Match Document)', width: null, height: null }
};

/**
 * Compression quality profiles.
 */
export const QUALITY_PROFILES = {
  high: { label: 'High (Best Quality)', jpegQuality: 0.92 },
  balanced: { label: 'Balanced (Recommended)', jpegQuality: 0.80 },
  compact: { label: 'Compact (Smallest File)', jpegQuality: 0.65 }
};

/**
 * Compiles an array of processed canvas pages into a single PDF Blob.
 * 
 * @param {Array<HTMLCanvasElement>} pages - List of processed page canvases
 * @param {object} options
 * @param {'a4' | 'letter' | 'auto'} [options.format='a4']
 * @param {'high' | 'balanced' | 'compact'} [options.quality='balanced']
 * @param {number} [options.margin=5] - Margin in millimeters
 * @returns {Promise<Blob>}
 */
export async function compilePdfDocument(pages, options = {}) {
  if (!pages || pages.length === 0) {
    throw new Error('No pages provided to compile into PDF');
  }

  const format = options.format || 'a4';
  const qualityKey = options.quality || 'balanced';
  const margin = options.margin !== undefined ? options.margin : 5;
  const jpegQuality = QUALITY_PROFILES[qualityKey]?.jpegQuality || 0.80;

  let doc = null;

  for (let i = 0; i < pages.length; i++) {
    const canvas = pages[i];
    const imgDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
    const canvasAspect = canvas.width / canvas.height;

    let pageWidth, pageHeight;
    let imgX, imgY, imgW, imgH;

    if (format === 'auto') {
      // Auto-fit: Page matches the aspect ratio of the document canvas exactly
      pageWidth = 210;
      pageHeight = 210 / canvasAspect;
      imgX = 0;
      imgY = 0;
      imgW = pageWidth;
      imgH = pageHeight;
    } else {
      // Fixed page size (A4 or US Letter)
      const standard = PAPER_FORMATS[format] || PAPER_FORMATS.a4;
      const isLandscape = canvasAspect > 1.0;
      pageWidth = isLandscape ? standard.height : standard.width;
      pageHeight = isLandscape ? standard.width : standard.height;

      // Usable printable area inside margins
      const maxPrintW = pageWidth - margin * 2;
      const maxPrintH = pageHeight - margin * 2;

      // Fit image proportionally inside printable area
      if (canvasAspect > maxPrintW / maxPrintH) {
        imgW = maxPrintW;
        imgH = maxPrintW / canvasAspect;
      } else {
        imgH = maxPrintH;
        imgW = maxPrintH * canvasAspect;
      }

      // Center the image within the page
      imgX = (pageWidth - imgW) / 2;
      imgY = (pageHeight - imgH) / 2;
    }

    if (i === 0) {
      // Initialize jsPDF document with the first page's orientation and size
      doc = new jsPDF({
        orientation: pageWidth > pageHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pageWidth, pageHeight],
        compress: true
      });
    } else {
      // Add subsequent pages
      doc.addPage(
        [pageWidth, pageHeight],
        pageWidth > pageHeight ? 'landscape' : 'portrait'
      );
    }

    doc.addImage(imgDataUrl, 'JPEG', imgX, imgY, imgW, imgH, undefined, 'FAST');
  }

  return doc.output('blob');
}

/**
 * Triggers native mobile sharing or direct browser download.
 * 
 * @param {Blob} pdfBlob - Compiled PDF blob
 * @param {string} filename - Desired filename (e.g., 'Scan_2026-10-18.pdf')
 * @returns {Promise<{shared: boolean}>}
 */
export async function shareOrDownloadPdf(pdfBlob, filename = 'Scanned_Document.pdf') {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const file = new File([pdfBlob], safeFilename, { type: 'application/pdf' });

  // Check if Web Share API with file support is available (iOS Safari / Android Chrome)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: safeFilename,
        text: 'Scanned with ApexDoc'
      });
      return { shared: true };
    } catch (err) {
      if (err.name === 'AbortError') {
        // User simply dismissed the share sheet; not an error
        return { shared: false };
      }
      console.warn('Web Share failed, falling back to download:', err);
    }
  }

  // Fallback: Direct browser download trigger
  const objectUrl = URL.createObjectURL(pdfBlob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = safeFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
  return { shared: false };
}
