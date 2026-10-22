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

// Pre-computed Photo S-curve LUT for gentle, natural contrast enhancement.
// Creates a smooth sigmoid that lifts shadows without clipping highlights.
const PHOTO_LUT = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  const v = i / 255;
  // Soft sigmoid contrast: lifts dark tones, compresses near-white gently
  const contrast = 1.0 / (1.0 + Math.exp(-7.5 * (v - 0.45)));
  // Blend 60% sigmoid with 40% linear for natural feel
  const blended = 0.60 * contrast + 0.40 * v;
  PHOTO_LUT[i] = Math.max(0, Math.min(255, Math.round(blended * 255)));
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
 * Filter 4: Smooth Photo (Professional Photo Scanner)
 * 
 * Delivers professional scanner-quality results like CamScanner / Adobe Scan / MS Lens.
 * This is NOT just a contrast bump — it performs:
 *   1. Local luminance normalization (flattens shadows & uneven lighting)
 *   2. Auto white-balance via per-channel gain correction
 *   3. Gentle photo-natural S-curve contrast via LUT
 *   4. Subtle saturation boost for vivid, life-like colors
 *   5. Lightweight unsharp-mask sharpening for crisp text & edges
 * 
 * The result preserves full color fidelity while making the document
 * look clean, bright, and professionally scanned.
 * 
 * @param {ImageData} imageData 
 * @returns {ImageData}
 */
export function applySmoothPhotoFilter(imageData) {
  const { width, height, data } = imageData;
  const numPixels = width * height;

  // ── Step 1: Build grayscale + integral image for local background estimation ──
  const { gray, integral } = buildIntegralImage(data, width, height);
  const baselinePaper = estimatePaperBrightness(gray, numPixels);

  // ── Step 2: Estimate per-channel white-balance gains from bright paper samples ──
  // Sample bright pixels to determine the paper's actual color temperature
  const step = Math.max(1, Math.floor(numPixels / 800));
  let rSum = 0, gSum = 0, bSum = 0, wbCount = 0;
  for (let i = 0; i < numPixels; i += step) {
    if (gray[i] > 180) {
      const p = i * 4;
      rSum += data[p];
      gSum += data[p + 1];
      bSum += data[p + 2];
      wbCount++;
    }
  }

  // Per-channel gains to neutralize paper color cast (normalize to ~245 target white)
  let rGain = 1.0, gGain = 1.0, bGain = 1.0;
  if (wbCount > 10) {
    const rAvg = rSum / wbCount;
    const gAvg = gSum / wbCount;
    const bAvg = bSum / wbCount;
    const targetWhite = 245;
    rGain = Math.min(1.6, targetWhite / Math.max(100, rAvg));
    gGain = Math.min(1.6, targetWhite / Math.max(100, gAvg));
    bGain = Math.min(1.6, targetWhite / Math.max(100, bAvg));
  }

  // ── Step 3: Local luminance normalization + white-balance + S-curve + saturation ──
  // Use a wide 15% window to flatten ambient shadow gradients
  const S = Math.max(32, Math.round(width * 0.15));
  const s2 = Math.floor(S / 2);
  const stride = width + 1;
  const minLocalPaper = baselinePaper * 0.55;

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

      // Local background luminance, clamped to protect dense ink regions
      const localBg = Math.max(minLocalPaper, sum / count);

      // Gentle gain to lift shadows toward even brightness
      // Uses softer gain (max 1.45) than Magic Color to preserve natural photo look
      const gain = Math.min(1.45, 240 / Math.max(130, localBg));

      const p = (rowOffset + x) * 4;

      // Apply white-balance and local luminance normalization
      let r = Math.min(255, Math.round(data[p] * gain * rGain));
      let g = Math.min(255, Math.round(data[p + 1] * gain * gGain));
      let b = Math.min(255, Math.round(data[p + 2] * gain * bGain));

      // Apply natural S-curve contrast via LUT
      r = PHOTO_LUT[r];
      g = PHOTO_LUT[g];
      b = PHOTO_LUT[b];

      // Subtle saturation boost (1.15x) for vivid, life-like colors
      // Convert to HSL-like luminance, then push channels away from gray
      const lum = (r * 77 + g * 150 + b * 29) >> 8;
      const satBoost = 1.15;
      r = Math.max(0, Math.min(255, Math.round(lum + (r - lum) * satBoost)));
      g = Math.max(0, Math.min(255, Math.round(lum + (g - lum) * satBoost)));
      b = Math.max(0, Math.min(255, Math.round(lum + (b - lum) * satBoost)));

      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = 255;
    }
  }

  // ── Step 4: Lightweight unsharp mask for crisp text edges ──
  // Apply a simple 3x3 sharpen pass with gentle intensity
  applyUnsharpMask(data, width, height, 0.35);

  return imageData;
}

/**
 * Applies a lightweight 3x3 unsharp mask (sharpen) to pixel data.
 * Enhances text edges and fine details without introducing harsh artifacts.
 * 
 * @param {Uint8ClampedArray} data - RGBA pixel buffer (modified in-place)
 * @param {number} width 
 * @param {number} height 
 * @param {number} [amount=0.35] - Sharpening strength (0 = none, 1 = full)
 */
function applyUnsharpMask(data, width, height, amount = 0.35) {
  // Create a copy of the current pixel data for neighbor sampling
  const copy = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        // 3x3 box blur sample (average of 8 neighbors + center)
        const idx = p + c;
        const blur = (
          copy[idx - width * 4 - 4] + copy[idx - width * 4] + copy[idx - width * 4 + 4] +
          copy[idx - 4]             + copy[idx]              + copy[idx + 4] +
          copy[idx + width * 4 - 4] + copy[idx + width * 4]  + copy[idx + width * 4 + 4]
        ) / 9;

        // Unsharp mask: original + amount * (original - blur)
        const sharp = copy[idx] + amount * (copy[idx] - blur);
        data[idx] = Math.max(0, Math.min(255, Math.round(sharp)));
      }
    }
  }
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

  // Use willReadFrequently for filters that do pixel manipulation,
  // and set high-quality image smoothing for best color fidelity
  const needsPixelWork = filterType !== 'original';
  const ctx = outCanvas.getContext('2d', {
    willReadFrequently: needsPixelWork,
    alpha: false
  });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(inputCanvas, 0, 0);

  // 'original': returns the raw camera capture with zero processing
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
