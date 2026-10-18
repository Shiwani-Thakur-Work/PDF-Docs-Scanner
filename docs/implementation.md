# Implementation Plan: ApexDoc Scanner (Minimal Apple Web Edition)

## 1. Directory Structure

```
PDF-Docs-Scanner/
├── docs/
│   ├── context.md               # Product context, goals, and privacy philosophy
│   ├── architecture.md          # System architecture, homography math, pipeline
│   ├── implementation.md        # Technical breakdown, algorithms, file map
│   ├── non-coder-guide.md       # Simple non-technical guide explaining how it works
│   └── deployment.md            # Step-by-step GitHub Pages & Cloudflare setup
├── public/
│   ├── favicon.svg              # Apple-style minimal document scanner SVG icon
│   ├── icon-192.png             # PWA app icon 192x192
│   ├── icon-512.png             # PWA app icon 512x512
│   ├── apple-touch-icon.png     # iOS home screen bookmark icon
│   ├── manifest.webmanifest     # Web App Manifest for mobile installability
│   └── sw.js                    # Service Worker for 100% offline functionality
├── src/
│   ├── core/
│   │   ├── homography.js        # Mathematical 4-point projective warp solver
│   │   ├── filters.js           # Adaptive threshold, Magic Color, Grayscale
│   │   ├── imageUtils.js        # EXIF normalization, image loader, dimensions
│   │   └── pdfExport.js         # Pure client-side jsPDF compiler & Web Share
│   ├── components/
│   │   ├── cropEditor.js        # 4-corner interactive canvas with magnifying loupe
│   │   ├── pageCarousel.js      # Multi-page thumbnail manager & page operations
│   │   ├── exportSheet.js       # Apple iOS-style bottom sheet for PDF options
│   │   └── toast.js             # Minimal iOS-style feedback pill notifications
│   ├── state/
│   │   └── documentState.js     # Reactive state store for document pages & settings
│   ├── styles/
│   │   ├── tokens.css           # Apple HIG design tokens, colors, blurs, springs
│   │   ├── app.css              # Main layout, typography, glassmorphism
│   │   ├── crop.css             # Corner handles, quad polygons, magnifying loupe
│   │   └── sheet.css            # iOS bottom sheet modal, segmented controls
│   └── main.js                  # Application entry point and event orchestrator
├── index.html                   # HTML5 mobile-first app shell & meta branding
├── package.json                 # Project dependencies (vite, jspdf)
├── vite.config.js               # Vite static build configuration
└── .gitignore                   # Standard clean git exclusions
```

---

## 2. Core Mathematical Algorithms

### A. Perspective Homography Transform (`src/core/homography.js`)
Given 4 source points $(u_i, v_i)$ (corners of the paper in the photo) and 4 destination points $(x_i, y_i)$ (corners of the flat rectangular output), we solve for the $3 \times 3$ transformation matrix $H$:

$$\begin{bmatrix} x \\ y \\ 1 \end{bmatrix} = \begin{bmatrix} h_{00} & h_{01} & h_{02} \\ h_{10} & h_{11} & h_{12} \\ h_{20} & h_{21} & 1 \end{bmatrix} \begin{bmatrix} u \\ v \\ 1 \end{bmatrix}$$

- **Gaussian Elimination**: Solves the resulting system of 8 linear equations.
- **Piecewise Affine / Grid Bilinear Subdivision**: We divide the target quad into fine-grained triangles or mesh cells and map them onto an offscreen canvas using native `CanvasRenderingContext2D.setTransform()` and clipping paths, resulting in hardware-accelerated warp rendering with zero external library overhead.

### B. Adaptive Local Thresholding for B&W Documents (`src/core/filters.js`)
Normal thresholding fails when shadows or uneven room lighting fall across a page.
We implement an **Integral Image Fast Window Filter**:
1. Compute the Integral Image (summed-area table) of grayscale values:
   $$I(x, y) = \sum_{x' \le x, y' \le y} p(x', y')$$
2. For every pixel $(x, y)$, calculate the local neighborhood mean $\mu(x, y)$ in $O(1)$ constant time using a rectangular window (size $W = \text{width} / 32$).
3. If $p(x, y) < \mu(x, y) \times (1 - T)$, set pixel to pure black ($0$); otherwise pure white ($255$).
4. Result: Crystal-clear laser scanner output completely stripped of phone shadows and room lighting gradients.

### C. Magic Color Document Enhancement (`src/core/filters.js`)
1. **Luminance Normalization**: Estimate local background paper color and stretch contrast.
2. **Color Balance & Saturation**: Scale RGB channels relative to local background brightness, restoring vibrant highlighter colors, stamps, and colored headers without dulling the text.

---

## 3. Step-by-Step Implementation Sequence

1. **Step 1: Project Initialization & Build Setup**:
   - Initialize `package.json` with `vite` and `jspdf`.
   - Setup `vite.config.js` with relative base paths (`base: './'`) for seamless deployment on both GitHub Pages and Cloudflare Pages.
   - Configure `.gitignore`.

2. **Step 2: Core Algorithm Engines**:
   - Implement `homography.js` (pure JS projective warp solver).
   - Implement `filters.js` (B&W adaptive threshold, Magic Color, Grayscale, Original).
   - Implement `imageUtils.js` (file to image, canvas cloning, orientation fixes).

3. **Step 3: Apple UI & CSS Design System**:
   - Create `tokens.css`, `app.css`, `crop.css`, `sheet.css` following Apple iOS Human Interface Guidelines.
   - Design frosted glass headers, floating dock, iOS-style segmented filter pill, and bottom export sheet.

4. **Step 4: Interactive Touch Crop Editor with Magnifying Loupe**:
   - Implement `cropEditor.js` with 4 draggable touch handles.
   - Implement floating circular magnifying loupe at $2.5\times$ zoom with crosshairs offset from the user's thumb.
   - Auto-calculate sensible initial document margins.

5. **Step 5: Multi-Page Document State & Page Carousel**:
   - Implement `documentState.js` reactive store.
   - Implement `pageCarousel.js` for adding pages, rotating 90°, reordering, and deleting.

6. **Step 6: PDF Generation & Native Sharing**:
   - Implement `pdfExport.js` using `jspdf`.
   - Support A4, US Letter, and Auto-Fit with quality controls.
   - Hook into `navigator.share()` for direct iOS / Android system Share Sheet (AirDrop, Files, Mail, WhatsApp) with instant fallback to direct file download.

7. **Step 7: PWA, Offline Service Worker & Branding Assets**:
   - Create Apple-style SVG and PNG icons, favicon, and Web App Manifest.
   - Implement `sw.js` (Service Worker) caching all assets for 100% offline usage.

8. **Step 8: Non-Coder & Deployment Documentation**:
   - Create `docs/non-coder-guide.md` and `docs/deployment.md`.
   - Document git commands and GitHub Actions workflow.

9. **Step 9: Testing & Verification**:
   - Test build locally with `npm run build`.
   - Start local dev server and perform end-to-end verification.
