/**
 * filters.js
 * 
 * Professional Client-Side Document Scanner Image Filters.
 * 
 * Features:
 * 1. B&W Document (Adaptive Local Window Thresholding - shadow/wrinkle killer)
 * 2. Magic Color (Background equalization + saturation boost for colored stamps/logos)
 * 3. High-Contrast Grayscale (Levels optimization for forms and receipts)
 * 4. Original Photo (Natural color preservation)
 */

/**
 * Converts an RGB image to an 8-bit grayscale array and builds
 * an Integral Image (Summed-Area Table) for O(1) constant-time
 * local neighborhood calculations.
 * 
 * @param {Uint8ClampedArray} data - RGBA pixel buffer
 * @param {number} width 
 * @param {number} height 
 * @returns {{gray: Uint8Array, integral: Float64Array}}
 */
function buildIntegralImage(data, width, height) {
  const numPixels = width * height;
  const gray = new Uint8Array(numPixels);
  const integral = new Float64Array((width + 1) * (height + 1));

  // Step 1: Compute grayscale values using ITU-R BT.601 luminance
  for (let i = 0, p = 0; i < numPixels; i++, p += 4) {
    gray[i] = (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) >> 8;
  }

  // Step 2: Build 2D Integral Table
  const stride = width + 1;
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    const grayRowOffset = y * width;
    const intRowOffset = (y + 1) * stride;
    const prevIntRowOffset = y * stride;

    for (let x = 0; x < width; x++) {
      rowSum += gray[grayRowOffset + x];
      integral[intRowOffset + x + 1] = integral[prevIntRowOffset + x + 1] + rowSum;
    }
  }

  return { gray, integral };
}

/**
 * Filter 1: B&W Clean Document (Adaptive Thresholding)
 * Eliminates hand shadows, dark room gradients, and paper folds.
 * Produces crisp, laser-sharp black ink on pure white background.
 * 
 * @param {ImageData} imageData 
 * @param {number} [windowFraction=0.04] - Size of neighborhood window relative to width
 * @param {number} [percentageThreshold=0.12] - Sensitivity threshold (12% darker than local mean)
 * @returns {ImageData}
 */
export function applyBwFilter(imageData, windowFraction = 0.04, percentageThreshold = 0.12) {
  const { width, height, data } = imageData;
  const { gray, integral } = buildIntegralImage(data, width, height);

  // Dynamic window size based on document resolution
  const S = Math.max(12, Math.round(width * windowFraction));
  const s2 = Math.floor(S / 2);
  const stride = width + 1;

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - s2);
    const y2 = Math.min(height, y + s2);
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - s2);
      const x2 = Math.min(width, x + s2);
      const count = (x2 - x1) * (y2 - y1);

      // Fast O(1) rectangular sum via integral image
      const sum = integral[y2 * stride + x2]
                - integral[y1 * stride + x2]
                - integral[y2 * stride + x1]
                + integral[y1 * stride + x1];

      const localMean = sum / count;
      const pixelVal = gray[rowOffset + x];

      // If pixel is darker than local mean by threshold, it's ink (0 = black); otherwise paper (255 = white)
      const isInk = pixelVal < localMean * (1.0 - percentageThreshold);
      const out = isInk ? 0 : 255;

      const p = (rowOffset + x) * 4;
      data[p] = out;
      data[p + 1] = out;
      data[p + 2] = out;
      data[p + 3] = 255;
    }
  }

  return imageData;
}

/**
 * Filter 2: Magic Color (Document Color Mode)
 * Normalizes uneven background paper illumination while preserving
 * and boosting the vibrancy of stamps, signatures, colored ink, and photos.
 * 
 * @param {ImageData} imageData 
 * @returns {ImageData}
 */
export function applyMagicColorFilter(imageData) {
  const { width, height, data } = imageData;
  const { gray, integral } = buildIntegralImage(data, width, height);

  const S = Math.max(20, Math.round(width * 0.08));
  const s2 = Math.floor(S / 2);
  const stride = width + 1;

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - s2);
    const y2 = Math.min(height, y + s2);
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - s2);
      const x2 = Math.min(width, x + s2);
      const count = (x2 - x1) * (y2 - y1);

      const sum = integral[y2 * stride + x2]
                - integral[y1 * stride + x2]
                - integral[y2 * stride + x1]
                + integral[y1 * stride + x1];

      // Background illumination estimate
      const bgLum = Math.max(30, sum / count);
      const p = (rowOffset + x) * 4;

      let r = data[p];
      let g = data[p + 1];
      let b = data[p + 2];

      // Divide by local background brightness to flatten shadows
      const scale = 255 / bgLum;
      r = Math.min(255, Math.pow(r * scale / 255, 1.25) * 255);
      g = Math.min(255, Math.pow(g * scale / 255, 1.25) * 255);
      b = Math.min(255, Math.pow(b * scale / 255, 1.25) * 255);

      // Contrast stretching
      data[p] = Math.max(0, Math.min(255, (r - 128) * 1.35 + 128));
      data[p + 1] = Math.max(0, Math.min(255, (g - 128) * 1.35 + 128));
      data[p + 2] = Math.max(0, Math.min(255, (b - 128) * 1.35 + 128));
      data[p + 3] = 255;
    }
  }

  return imageData;
}

/**
 * Filter 3: High-Contrast Grayscale
 * Dynamic range stretched monochrome with automatic levels adjustment.
 * 
 * @param {ImageData} imageData 
 * @returns {ImageData}
 */
export function applyGrayscaleFilter(imageData) {
  const { data } = imageData;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    // Apply gentle S-curve to boost dark text and whiten background
    let enhanced = lum;
    if (lum > 170) {
      enhanced = Math.min(255, lum + (255 - lum) * 0.45);
    } else if (lum < 90) {
      enhanced = Math.max(0, lum * 0.7);
    }
    data[i] = enhanced;
    data[i + 1] = enhanced;
    data[i + 2] = enhanced;
    data[i + 3] = 255;
  }

  return imageData;
}

/**
 * Applies the selected filter to a given Canvas element and returns
 * a new processed Canvas element.
 * 
 * @param {HTMLCanvasElement} inputCanvas 
 * @param {'bw' | 'magic' | 'grayscale' | 'original'} filterType 
 * @returns {HTMLCanvasElement}
 */
export function processCanvasWithFilter(inputCanvas, filterType) {
  const outCanvas = document.createElement('canvas');
  outCanvas.width = inputCanvas.width;
  outCanvas.height = inputCanvas.height;
  const ctx = outCanvas.getContext('2d');
  ctx.drawImage(inputCanvas, 0, 0);

  if (filterType === 'original') {
    return outCanvas;
  }

  const imgData = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height);

  if (filterType === 'bw') {
    applyBwFilter(imgData);
  } else if (filterType === 'magic') {
    applyMagicColorFilter(imgData);
  } else if (filterType === 'grayscale') {
    applyGrayscaleFilter(imgData);
  }

  ctx.putImageData(imgData, 0, 0);
  return outCanvas;
}
