/**
 * Stockly WMS Official Brand Data Assets
 * Clean vector SVG logos for system headers and document branding
 */

export const STOCKLY_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="stk-top" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3DE1A0" />
      <stop offset="100%" stop-color="var(--accent-primary)" />
    </linearGradient>
    <linearGradient id="stk-left" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B7B5B" />
      <stop offset="100%" stop-color="#06543C" />
    </linearGradient>
    <linearGradient id="stk-right" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00BF88" />
      <stop offset="100%" stop-color="#089166" />
    </linearGradient>
  </defs>
  <polygon points="50,14 84,33 50,52 16,33" fill="url(#stk-top)" stroke="#042F2C" stroke-width="2.5" stroke-linejoin="round" />
  <polygon points="16,33 50,52 50,86 16,67" fill="url(#stk-left)" stroke="#042F2C" stroke-width="2.5" stroke-linejoin="round" />
  <polygon points="50,52 84,33 84,67 50,86" fill="url(#stk-right)" stroke="#042F2C" stroke-width="2.5" stroke-linejoin="round" />
  <line x1="58" y1="52" x2="58" y2="76" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.9" />
  <line x1="64" y1="49" x2="64" y2="73" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" opacity="0.8" />
  <line x1="70" y1="46" x2="70" y2="70" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.9" />
  <line x1="76" y1="43" x2="76" y2="67" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" opacity="0.8" />
  <circle cx="50" cy="52" r="4" fill="#FFFFFF" />
</svg>`;

export const STOCKLY_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(STOCKLY_LOGO_SVG)}`;

// Legacy aliases for backward compatibility
export const THE_CALM_LOGO_DATA_URL = STOCKLY_LOGO_DATA_URL;
export const STONE_RESIDENCE_LOGO_DATA_URL = STOCKLY_LOGO_DATA_URL;
