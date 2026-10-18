# Context & Vision: Mobile-First In-Browser Document & PDF Scanner

## 1. Product Vision & Problem Statement
Every day, millions of users need to quickly scan paper documents, receipts, contracts, IDs, and handwritten notes into clean, searchable, multi-page PDFs from their mobile phones.

Currently, users face two major frustrations:
1. **Bloated Native Apps**: Native store apps (CamScanner, Adobe Scan, etc.) often demand mandatory subscriptions ($40-$60/yr), intrusive ads, account registrations, and aggressive cloud sync.
2. **Online PDF Converter Websites**: Existing websites require uploading sensitive personal documents to third-party servers, posing serious privacy, security, and data leakage risks.

### The Solution: ApexDoc Scanner (Minimal Apple Web Edition)
A zero-install, mobile-first browser tool that replicates the speed, tactile responsiveness, and aesthetic elegance of Apple's native iOS Document Scanner, running **100% client-side** inside Safari, Chrome, and any modern web browser.

---

## 2. Core Pillars & Value Proposition

### 🔒 100% Privacy by Design (Zero Server Latency)
- All image transformations, perspective corrections, filters, and PDF generation occur in device RAM via client-side Web APIs and HTML5 Canvas.
- No photos or generated PDFs ever touch an external server or database.
- Completely offline capable: once loaded, you can turn on Airplane Mode and scan documents uninterrupted.

### 🍏 Minimal Apple Aesthetic (Human Interface Guidelines)
- **Visuals**: Apple-style frosted glass surfaces (`backdrop-filter: blur(24px)`), deep neutral dark/light themes, subtle hairline borders, and San Francisco typography.
- **Ergonomics**: Mobile thumb-friendly bottom action dock, iOS-style segmented pill selectors, and Cupertino slide-up sheets.
- **Micro-Interactions**: Interactive 4-point corner quad cropping with an **Apple-style circular magnifying loupe** that hovers above the user's finger so the drag target is never obscured.

### ⚡ Instant Static Deployment & Global Accessibility
- Pure static web technology (HTML5, Modern CSS, Vanilla JS, Vite).
- Can be hosted for free on **GitHub Pages**, **Cloudflare Pages**, or **Vercel** with custom domains, automatic HTTPS, and global edge CDN caching.
- Direct repository deployment with one-click GitHub Actions workflow.

### 📱 Progressive Web App (PWA) Capabilities
- Installable directly to the iOS or Android home screen with a single tap ("Add to Home Screen").
- Custom app icon, splash screen, and standalone display mode without browser URL bars.
- Integrated Service Worker caching all assets for instant offline launches.

---

## 3. User Journey & Feature Specifications

1. **Document Ingestion**:
   - Tap camera icon to trigger native mobile camera in high resolution.
   - Upload multiple images from photo gallery or drag-and-drop on desktop.
2. **Perspective Edge Quad & Crop**:
   - Automatic initial boundary estimation.
   - 4 draggable corner handles with touch-offset magnification loupe (2.5x zoom with crosshairs).
   - High-fidelity mathematical perspective warp (homography transform) flattening warped, tilted paper onto an upright rectangular sheet.
3. **Professional Enhancement Filters**:
   - **B&W Clean Document**: Adaptive local thresholding eliminating shadows, table backgrounds, and paper creases, delivering laser-sharp black ink on pure white paper.
   - **Magic Color**: Shadow-removal, saturation boost, and auto-contrast balancing for color documents and diagrams.
   - **Grayscale**: Smooth tone-mapped monochrome for forms, text, and archival papers.
   - **Original / Photo**: Pure unmodified capture with sharpness tuning.
4. **Multi-Page Management**:
   - Horizontal thumbnail reel showing all scanned pages.
   - Add new pages, rotate in 90° increments, reorder pages, or delete specific pages.
5. **PDF Generation & Native Sharing**:
   - Pure client-side PDF compiler (custom page sizes: A4, US Letter, Auto-Fit).
   - Configurable file naming and quality compression.
   - One-tap trigger for native **Web Share API** (AirDrop, WhatsApp, Mail, Save to Files on iOS/Android) or instant local file download.
