/**
 * filters.js
 * 
 * Professional Client-Side Document Scanner Image Filters.
 * 
 * Features:
 * 1. Photo (Smooth Real Photo Click - Natural color preservation with subtle clarity)
 * 2. Magic Color (Background shadow flattening + vibrant colors + smooth anti-aliased text)
 * 3. Smooth Grayscale (Continuous-tone monochrome with clean paper and anti-aliased font edges)
 * 4. B&W Document (Clean high-contrast document with subpixel anti-aliasing, no harsh xerox pixelation)
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
 * Estimates overall paper brightness from the upper quartile of the image.
 */
function estimatePaperBrightness(gray, numPixels) {
  const step = Math.max(1, Math.floor(numPixels / 600));
  let sampleSum = 0;
  let count = 0;
  for (let i = 0; i < numPixels; i += step) {
    if (gray[i] > 120) {
      sampleSum += gray[i];
      count++;
    }
  }
  return count > 0 ? (sampleSum / count) : 210;
}

// Pre-computed lookup table for Magic Color smooth S-curve
const MAGIC_LUT = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  const v = i / 255;
  let out;
  if (v > 0.80) {
    const t = (v - 0.80) / 0.20;
    out = 0.80 + t * 0.20 + 0.03 * Math.sin(t * Math.PI);
  } else {
    out = Math.pow(v, 1.15) * (0.80 / Math.pow(0.80, 1.15));
  }
  MAGIC_LUT[i] = Math.max(0, Math.min(255, Math.round(out * 255)));
}

// Pre-computed lookup table for Grayscale smooth S-curve
const GRAY_LUT = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  const v = i / 255;
  let out;
  if (v > 0.82) {
    const t = (v - 0.82) / 0.18;
    out = 0.82 + t * 0.18 + 0.04 * Math.sin(t * Math.PI);
  } else {
    out = Math.pow(v, 1.20) * (0.82 / Math.pow(0.82, 1.20));
  }
  GRAY_LUT[i] = Math.max(0, Math.min(255, Math.round(out * 255)));
}

/**
 * Filter 1: B&W Clean Document (Adaptive Thresholding with Soft Anti-Aliasing)
 * Produces crisp, laser-sharp black ink on pure white paper without
 * harsh 1-bit pixelation or xerox photocopy noise.
 * 
 * @param {ImageData} imageData 
 * @param {number} [windowFraction=0.06] - Neighborhood window size
 * @param {number} [percentageThreshold=0.10] - Threshold sensitivity
 * @returns {ImageData}
 */
export function applyBwFilter(imageData, windowFraction = 0.06, percentageThreshold = 0.10) {
  const { width, height, data } = imageData;
  const { gray, integral } = buildIntegralImage(data, width, height);

  const S = Math.max(16, Math.round(width * windowFraction));
  const s2 = Math.floor(S / 2);
  const stride = width + 1;

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - s2);
    const y2 = Math.min(height, y + s2);
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const pixelVal = gray[rowOffset + x];
      const p = (rowOffset + x) * 4;

      // Fast path: Pixels already brightly lit are pure paper (white)
      if (pixelVal > 210) {
        data[p] = 255;
        data[p + 1] = 255;
        data[p + 2] = 255;
        data[p + 3] = 255;
        continue;
      }

      const x1 = Math.max(0, x - s2);
      const x2 = Math.min(width, x + s2);
      const count = (x2 - x1) * (y2 - y1);

      const sum = integral[y2 * stride + x2]
                - integral[y1 * stride + x2]
                - integral[y2 * stride + x1]
                + integral[y1 * stride + x1];

      const localMean = sum / count;
      const targetThreshold = localMean * (1.0 - percentageThreshold);

      // Smooth anti-aliased edge transition band (span of 14 levels)
      // Prevents harsh 1-bit jagged xerox appearance
      const diff = pixelVal - targetThreshold;
      let out;
      if (diff <= -7) {
        out = 0; // Pure dark ink core
      } else if (diff >= 7) {
        out = 255; // Clean paper
      } else {
        // Smooth linear subpixel anti-aliasing
        out = Math.round(((diff + 7) / 14) * 255);
      }

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
 * Normalizes uneven paper illumination while preserving smooth anti-aliased
 * typography, colored ink, stamps, signatures, and natural textures.
 * 
 * @param {ImageData} imageData 
 * @returns {ImageData}
 */
export function applyMagicColorFilter(imageData) {
  const { width, height, data } = imageData;
  const numPixels = width * height;
  const { gray, integral } = buildIntegralImage(data, width, height);

  const baselinePaper = estimatePaperBrightness(gray, numPixels);
  const minLocalPaper = baselinePaper * 0.65;

  // Wide 20% window to capture low-frequency ambient illumination across sheet
  const S = Math.max(36, Math.round(width * 0.20));
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

      // Local background luminance estimate, clamped to avoid crushing dense text
      const localBg = Math.max(minLocalPaper, sum / count);
      const gain = Math.min(1.85, 245 / Math.max(120, localBg));

      const p = (rowOffset + x) * 4;
      const r = Math.min(255, Math.round(data[p] * gain));
      const g = Math.min(255, Math.round(data[p + 1] * gain));
      const b = Math.min(255, Math.round(data[p + 2] * gain));

      // Apply smooth S-curve LUT: preserves smooth font anti-aliasing and vibrant colors
      data[p] = MAGIC_LUT[r];
      data[p + 1] = MAGIC_LUT[g];
      data[p + 2] = MAGIC_LUT[b];
      data[p + 3] = 255;
    }
  }

  return imageData;
}

/**
 * Filter 3: Smooth Grayscale
 * Dynamic range stretched monochrome with continuous tones and anti-aliased font edges.
 * 
 * @param {ImageData} imageData 
 * @returns {ImageData}
 */
export function applyGrayscaleFilter(imageData) {
  const { data } = imageData;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    const enhanced = GRAY_LUT[lum];
    data[i] = enhanced;
    data[i + 1] = enhanced;
    data[i + 2] = enhanced;
    data[i + 3] = 255;
  }

  return imageData;
}

/**
 * Filter 4: Smooth Photo (Real Photo Click)
 * Delivers clean, true-to-life photographic fidelity with subtle document contrast.
 * 
 * @param {ImageData} imageData 
 * @returns {ImageData}
 */
export function applySmoothPhotoFilter(imageData) {
  // Retains full continuous camera tones with subtle clarity boost
  const { data } = imageData;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    // Gentle 4% contrast boost to give real photo clicks crisp readability
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    data[i] = Math.max(0, Math.min(255, Math.round((r - 128) * 1.04 + 128)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round((g - 128) * 1.04 + 128)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round((b - 128) * 1.04 + 128)));
    data[i + 3] = 255;
  }

  return imageData;
}

/**
 * Applies the selected filter to a given Canvas element and returns
 * a new processed Canvas element.
 * 
 * @param {HTMLCanvasElement} inputCanvas 
 * @param {'photo' | 'original' | 'magic' | 'grayscale' | 'bw'} filterType 
 * @returns {HTMLCanvasElement}
 */
export function processCanvasWithFilter(inputCanvas, filterType) {
  const outCanvas = document.createElement('canvas');
  outCanvas.width = inputCanvas.width;
  outCanvas.height = inputCanvas.height;
  const ctx = outCanvas.getContext('2d');
  ctx.drawImage(inputCanvas, 0, 0);

  // 'original' or 'photo': returns natural real photo click
  if (filterType === 'original') {
    return outCanvas;
  }

  const imgData = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height);

  if (filterType === 'photo') {
    applySmoothPhotoFilter(imgData);
  } else if (filterType === 'magic') {
    applyMagicColorFilter(imgData);
  } else if (filterType === 'grayscale') {
    applyGrayscaleFilter(imgData);
  } else if (filterType === 'bw') {
    applyBwFilter(imgData);
  }

  ctx.putImageData(imgData, 0, 0);
  return outCanvas;
}
