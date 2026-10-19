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
 * Estimates initial document quad corners.
 * Defaults to the full pristine image bounds so no headers, footers, or margins
 * are accidentally clipped on ingestion. Users can adjust corners in Crop mode anytime.
 * 
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array<{x: number, y: number}>} [TL, TR, BR, BL]
 */
export function estimateInitialCorners(width, height) {
  return [
    { x: 0, y: 0 },                  // Top-Left
    { x: width, y: 0 },              // Top-Right
    { x: width, y: height },         // Bottom-Right
    { x: 0, y: height }              // Bottom-Left
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
