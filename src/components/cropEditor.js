/**
 * cropEditor.js
 * 
 * Interactive 4-Corner Perspective Crop Editor.
 * 
 * Features:
 * - 4 touch-draggable corner nodes with wide touch targets (44px)
 * - Semi-transparent mask outside the selected document polygon
 * - Real-time Apple-style Circular Magnifying Loupe floating above touch point
 * - High-precision coordinate mapping between viewport canvas and full-res image
 */

import { warpPerspective } from '../core/homography.js';
import { processCanvasWithFilter } from '../core/filters.js';
import { createThumbnailUrl, estimateInitialCorners } from '../core/imageUtils.js';
import { docState } from '../state/documentState.js';

export class CropEditor {
  constructor(containerEl, onComplete, onCancel) {
    this.container = containerEl;
    this.onComplete = onComplete;
    this.onCancel = onCancel;

    this.activeCornerIndex = -1;
    this.corners = []; // [TL, TR, BR, BL] in image coordinates
    this.imgElement = null;

    // Canvas scaling & transformation cache
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.canvasW = 0;
    this.canvasH = 0;

    this.initDOM();
    this.attachEvents();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="crop-editor-container">
        <header class="crop-top-bar">
          <button class="btn-text cancel" id="cropCancelBtn">Cancel</button>
          <span class="crop-bar-title">Adjust Edges</span>
          <div style="display: flex; gap: 8px;">
            <button class="btn-text" id="cropResetBtn">Reset</button>
            <button class="btn-text bold" id="cropDoneBtn">Keep Scan</button>
          </div>
        </header>

        <div class="crop-canvas-area" id="cropCanvasArea">
          <canvas id="cropCanvas"></canvas>
          <div class="magnifying-loupe" id="cropLoupe">
            <canvas class="loupe-canvas" id="loupeCanvas" width="160" height="160"></canvas>
            <div class="loupe-reticle"></div>
            <div class="loupe-center-dot"></div>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#cropCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvasArea = this.container.querySelector('#cropCanvasArea');

    this.loupe = this.container.querySelector('#cropLoupe');
    this.loupeCanvas = this.container.querySelector('#loupeCanvas');
    this.loupeCtx = this.loupeCanvas.getContext('2d');

    this.btnCancel = this.container.querySelector('#cropCancelBtn');
    this.btnReset = this.container.querySelector('#cropResetBtn');
    this.btnDone = this.container.querySelector('#cropDoneBtn');
  }

  attachEvents() {
    this.btnCancel.addEventListener('click', () => {
      if (this.onCancel) this.onCancel();
    });

    this.btnReset.addEventListener('click', () => {
      if (this.imgElement) {
        this.corners = estimateInitialCorners(this.imgElement.naturalWidth, this.imgElement.naturalHeight);
        this.render();
      }
    });

    this.btnDone.addEventListener('click', () => {
      this.applyCropAndFinish();
    });

    // Touch & Mouse Pointer tracking
    const onPointerDown = (e) => this.handlePointerDown(e);
    const onPointerMove = (e) => this.handlePointerMove(e);
    const onPointerUp = (e) => this.handlePointerUp(e);

    this.canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    this.canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchcancel', onPointerUp);

    // Auto resize
    window.addEventListener('resize', () => {
      if (docState.isCropping) {
        this.resizeCanvas();
        this.render();
      }
    });
  }

  /**
   * Opens the crop editor with the specified scanned page.
   * @param {ScannedPage} page 
   */
  open(page) {
    this.imgElement = page.originalImage;
    // Clone corners or calculate initial
    this.corners = page.quadPoints ? JSON.parse(JSON.stringify(page.quadPoints)) : estimateInitialCorners(this.imgElement.naturalWidth, this.imgElement.naturalHeight);
    this.container.style.display = 'block';

    setTimeout(() => {
      this.resizeCanvas();
      this.render();
    }, 50);
  }

  close() {
    this.container.style.display = 'none';
    this.loupe.classList.remove('visible');
    this.activeCornerIndex = -1;
  }

  resizeCanvas() {
    if (!this.imgElement) return;

    const rect = this.canvasArea.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvasW = rect.width;
    this.canvasH = rect.height;

    this.canvas.width = this.canvasW * dpr;
    this.canvas.height = this.canvasH * dpr;
    this.canvas.style.width = `${this.canvasW}px`;
    this.canvas.style.height = `${this.canvasH}px`;

    this.ctx.scale(dpr, dpr);

    // Calculate aspect ratio fit
    const imgW = this.imgElement.naturalWidth;
    const imgH = this.imgElement.naturalHeight;
    const scaleX = (this.canvasW - 40) / imgW;
    const scaleY = (this.canvasH - 40) / imgH;
    this.scale = Math.min(scaleX, scaleY);

    this.offsetX = (this.canvasW - imgW * this.scale) / 2;
    this.offsetY = (this.canvasH - imgH * this.scale) / 2;
  }

  /**
   * Converts image coordinate to screen canvas coordinate.
   */
  imgToCanvas(pt) {
    return {
      x: this.offsetX + pt.x * this.scale,
      y: this.offsetY + pt.y * this.scale
    };
  }

  /**
   * Converts screen canvas coordinate to raw image coordinate.
   */
  canvasToImg(pt) {
    return {
      x: Math.max(0, Math.min(this.imgElement.naturalWidth, (pt.x - this.offsetX) / this.scale)),
      y: Math.max(0, Math.min(this.imgElement.naturalHeight, (pt.y - this.offsetY) / this.scale))
    };
  }

  getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      screenX: clientX,
      screenY: clientY
    };
  }

  handlePointerDown(e) {
    if (e.touches && e.touches.length > 1) return;
    if (e.cancelable) e.preventDefault();

    const pos = this.getPointerPos(e);
    const hitRadius = 38; // Generous touch hit radius for mobile thumbs

    let closestIdx = -1;
    let minDistance = Infinity;

    for (let i = 0; i < 4; i++) {
      const cPos = this.imgToCanvas(this.corners[i]);
      const dist = Math.hypot(cPos.x - pos.x, cPos.y - pos.y);
      if (dist < hitRadius && dist < minDistance) {
        minDistance = dist;
        closestIdx = i;
      }
    }

    if (closestIdx !== -1) {
      this.activeCornerIndex = closestIdx;
      this.updateLoupe(pos);
      this.render();
    }
  }

  handlePointerMove(e) {
    if (this.activeCornerIndex === -1) return;
    if (e.cancelable) e.preventDefault();

    const pos = this.getPointerPos(e);
    const imgPos = this.canvasToImg(pos);

    // Update active corner in image coordinate space
    this.corners[this.activeCornerIndex] = {
      x: Math.round(imgPos.x),
      y: Math.round(imgPos.y)
    };

    this.updateLoupe(pos);
    this.render();
  }

  handlePointerUp() {
    if (this.activeCornerIndex !== -1) {
      this.activeCornerIndex = -1;
      this.loupe.classList.remove('visible');
      this.render();
    }
  }

  /**
   * Renders the magnified loupe circle 75px above the touch position.
   */
  updateLoupe(pos) {
    if (!this.imgElement || this.activeCornerIndex === -1) return;

    const corner = this.corners[this.activeCornerIndex];
    const canvasAreaRect = this.canvasArea.getBoundingClientRect();

    // Position loupe centered horizontally above the finger
    const loupeX = pos.x + this.canvas.offsetLeft;
    const loupeY = pos.y + this.canvas.offsetTop;

    this.loupe.style.left = `${loupeX}px`;
    this.loupe.style.top = `${loupeY}px`;
    this.loupe.classList.add('visible');

    // Sample magnified patch from original full-resolution image
    const zoomLevel = 2.5;
    const patchW = 160 / zoomLevel;
    const patchH = 160 / zoomLevel;
    const sx = Math.max(0, Math.min(this.imgElement.naturalWidth - patchW, corner.x - patchW / 2));
    const sy = Math.max(0, Math.min(this.imgElement.naturalHeight - patchH, corner.y - patchH / 2));

    this.loupeCtx.clearRect(0, 0, 160, 160);
    this.loupeCtx.drawImage(this.imgElement, sx, sy, patchW, patchH, 0, 0, 160, 160);
  }

  /**
   * Main Canvas Render Loop
   */
  render() {
    if (!this.imgElement) return;

    this.ctx.clearRect(0, 0, this.canvasW, this.canvasH);

    // 1. Draw base photo
    const drawW = this.imgElement.naturalWidth * this.scale;
    const drawH = this.imgElement.naturalHeight * this.scale;
    this.ctx.drawImage(this.imgElement, this.offsetX, this.offsetY, drawW, drawH);

    const screenCorners = this.corners.map(c => this.imgToCanvas(c));

    // 2. Darkened translucent mask outside document polygon
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    this.ctx.beginPath();
    // Outer boundary (entire canvas)
    this.ctx.rect(0, 0, this.canvasW, this.canvasH);
    // Inner cutout polygon (reverse path for cutout)
    this.ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
    this.ctx.lineTo(screenCorners[3].x, screenCorners[3].y);
    this.ctx.lineTo(screenCorners[2].x, screenCorners[2].y);
    this.ctx.lineTo(screenCorners[1].x, screenCorners[1].y);
    this.ctx.closePath();
    this.ctx.fill('evenodd');
    this.ctx.restore();

    // 3. Document outline border (Apple System Blue)
    this.ctx.save();
    this.ctx.strokeStyle = '#007aff';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
    for (let i = 1; i < 4; i++) {
      this.ctx.lineTo(screenCorners[i].x, screenCorners[i].y);
    }
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.restore();

    // 4. Circular Apple-style corner handles
    screenCorners.forEach((sc, idx) => {
      const isActive = (idx === this.activeCornerIndex);
      const radius = isActive ? 15 : 12;

      this.ctx.save();
      // Drop shadow
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetY = 2;

      // Outer White Ring
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(sc.x, sc.y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Inner Blue Pill Dot
      this.ctx.shadowColor = 'transparent';
      this.ctx.fillStyle = '#007aff';
      this.ctx.beginPath();
      this.ctx.arc(sc.x, sc.y, radius - 4, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    });
  }

  /**
   * Applies the warp and filter, updates documentState, and finishes.
   */
  applyCropAndFinish() {
    docState.setProcessing(true, 'Straightening & enhancing...');

    setTimeout(() => {
      try {
        const page = docState.getCurrentPage();
        if (!page) return;

        // 1. Perspective warp original image with adjusted corners
        const warped = warpPerspective(this.imgElement, this.corners);

        // 2. Re-apply active filter (default 'photo' or current)
        const processed = processCanvasWithFilter(warped, page.activeFilter || 'photo');
        const thumbUrl = createThumbnailUrl(processed);

        // 3. Update page record
        page.quadPoints = JSON.parse(JSON.stringify(this.corners));
        page.processedCanvas = processed;
        page.thumbnailUrl = thumbUrl;

        this.close();
        if (this.onComplete) this.onComplete(page);
      } catch (err) {
        console.error('Error in perspective warp:', err);
      } finally {
        docState.setProcessing(false);
      }
    }, 40);
  }
}
