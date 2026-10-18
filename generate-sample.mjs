// Create a realistic sample document SVG and convert or serve it
import fs from 'fs';

const sampleDocSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100">
  <defs>
    <filter id="deskShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="15" dy="25" stdDeviation="18" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <!-- Wooden / Dark Desk Background -->
  <rect width="800" height="1100" fill="#1e1814"/>

  <!-- Tilted Document Sheet on Desk -->
  <g transform="translate(400, 550) rotate(-4) translate(-320, -460)" filter="url(#deskShadow)">
    <!-- Off-white paper with simulated ambient shadow -->
    <rect width="640" height="920" rx="4" fill="#f8f7f2"/>
    
    <!-- Header / Invoice Title -->
    <rect x="50" y="60" width="220" height="28" rx="4" fill="#007aff"/>
    <text x="60" y="80" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff">CONSULTING INVOICE</text>
    <text x="440" y="78" font-family="sans-serif" font-size="14" fill="#555">INV-2026-0891</text>
    
    <!-- Divider -->
    <line x1="50" y1="110" x2="590" y2="110" stroke="#ddd" stroke-width="2"/>
    
    <!-- Client Info -->
    <text x="50" y="145" font-family="sans-serif" font-size="13" font-weight="bold" fill="#222">BILLED TO:</text>
    <text x="50" y="168" font-family="sans-serif" font-size="13" fill="#444">Acme Global Corporation</text>
    <text x="50" y="188" font-family="sans-serif" font-size="13" fill="#666">742 Evergreen Terrace</text>
    <text x="50" y="208" font-family="sans-serif" font-size="13" fill="#666">San Francisco, CA 94107</text>

    <!-- Table Header -->
    <rect x="50" y="250" width="540" height="36" fill="#eae9e4"/>
    <text x="65" y="273" font-family="sans-serif" font-size="12" font-weight="bold" fill="#333">DESCRIPTION</text>
    <text x="350" y="273" font-family="sans-serif" font-size="12" font-weight="bold" fill="#333">HOURS</text>
    <text x="450" y="273" font-family="sans-serif" font-size="12" font-weight="bold" fill="#333">RATE</text>
    <text x="530" y="273" font-family="sans-serif" font-size="12" font-weight="bold" fill="#333">AMOUNT</text>

    <!-- Table Rows -->
    <text x="65" y="315" font-family="sans-serif" font-size="13" fill="#222">Mobile Architecture Design</text>
    <text x="365" y="315" font-family="sans-serif" font-size="13" fill="#222">40</text>
    <text x="455" y="315" font-family="sans-serif" font-size="13" fill="#222">$150</text>
    <text x="530" y="315" font-family="sans-serif" font-size="13" fill="#222">$6,000</text>

    <line x1="50" y1="335" x2="590" y2="335" stroke="#eee" stroke-width="1"/>

    <text x="65" y="365" font-family="sans-serif" font-size="13" fill="#222">Client-Side Homography & Filters</text>
    <text x="365" y="365" font-family="sans-serif" font-size="13" fill="#222">35</text>
    <text x="455" y="365" font-family="sans-serif" font-size="13" fill="#222">$150</text>
    <text x="530" y="365" font-family="sans-serif" font-size="13" fill="#222">$5,250</text>

    <line x1="50" y1="385" x2="590" y2="385" stroke="#eee" stroke-width="1"/>

    <text x="65" y="415" font-family="sans-serif" font-size="13" fill="#222">Apple HIG Glassmorphism UI</text>
    <text x="365" y="415" font-family="sans-serif" font-size="13" fill="#222">25</text>
    <text x="455" y="415" font-family="sans-serif" font-size="13" fill="#222">$150</text>
    <text x="530" y="415" font-family="sans-serif" font-size="13" fill="#222">$3,750</text>

    <line x1="50" y1="440" x2="590" y2="440" stroke="#bbb" stroke-width="2"/>

    <!-- Total -->
    <text x="420" y="480" font-family="sans-serif" font-size="15" font-weight="bold" fill="#111">TOTAL DUE:</text>
    <text x="520" y="480" font-family="sans-serif" font-size="17" font-weight="bold" fill="#007aff">$15,000.00</text>

    <!-- Stamp / Signature -->
    <g transform="translate(390, 680) rotate(-12)">
      <rect width="180" height="60" rx="8" fill="none" stroke="#e02020" stroke-width="3" stroke-dasharray="8 4"/>
      <text x="90" y="40" font-family="sans-serif" font-size="24" font-weight="900" fill="#e02020" text-anchor="middle">APPROVED</text>
    </g>

    <!-- Notes -->
    <text x="50" y="820" font-family="sans-serif" font-size="11" fill="#888">Thank you for your business. Payment due within 30 days via Wire Transfer.</text>
  </g>
</svg>`;

fs.writeFileSync('public/sample-invoice.svg', sampleDocSvg);
console.log('Sample invoice generated at public/sample-invoice.svg');
