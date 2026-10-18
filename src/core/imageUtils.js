/**
 * imageUtils.js
 * 
 * Image file ingestion, orientation normalization, rotation,
 * and thumbnail helpers.
 */

/**
 * Loads a File or Blob into an HTMLImageElement.
 * @param {File | Blob} file 
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to decode image file'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk'));
    reader.readAsDataURL(file);
  });
}

/**
 * Rotates an HTMLCanvasElement by multiples of 90 degrees.
 * 
 * @param {HTMLCanvasElement} canvas 
 * @param {0 | 90 | 180 | 270} degrees 
 * @returns {HTMLCanvasElement}
 */
export function rotateCanvas(canvas, degrees) {
  const normDeg = ((degrees % 360) + 360) % 360;
  if (normDeg === 0) return canvas;

  const out = document.createElement('canvas');
  const ctx = out.getContext('2d');

  if (normDeg === 90 || normDeg === 270) {
    out.width = canvas.height;
    out.height = canvas.width;
  } else {
    out.width = canvas.width;
    out.height = canvas.height;
  }

  ctx.save();
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((normDeg * Math.PI) / 180);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  ctx.restore();

  return out;
}

/**
 * Estimates initial document quad corners with an Apple-style
 * generous margin inset (8% from edges) ready for user adjustment.
 * 
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array<{x: number, y: number}>} [TL, TR, BR, BL]
 */
export function estimateInitialCorners(width, height) {
  const insetX = width * 0.08;
  const insetY = height * 0.08;

  return [
    { x: Math.round(insetX), y: Math.round(insetY) },                      // Top-Left
    { x: Math.round(width - insetX), y: Math.round(insetY) },              // Top-Right
    { x: Math.round(width - insetX), y: Math.round(height - insetY) },      // Bottom-Right
    { x: Math.round(insetX), y: Math.round(height - insetY) }              // Bottom-Left
  ];
}

/**
 * Creates a fast compressed thumbnail data URL from a canvas for the UI carousel.
 * 
 * @param {HTMLCanvasElement} canvas 
 * @param {number} [maxDim=240] 
 * @returns {string} data:image/jpeg URL
 */
export function createThumbnailUrl(canvas, maxDim = 240) {
  const scale = maxDim / Math.max(canvas.width, canvas.height);
  const w = Math.round(canvas.width * Math.min(1, scale));
  const h = Math.round(canvas.height * Math.min(1, scale));

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = w;
  thumbCanvas.height = h;
  const ctx = thumbCanvas.getContext('2d');
  ctx.drawImage(canvas, 0, 0, w, h);

  return thumbCanvas.toDataURL('image/jpeg', 0.82);
}
