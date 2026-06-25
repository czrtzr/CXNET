// The CXNET crest as a standalone SVG string, for places that cannot render the
// React <Crest> component: ImageResponse / Satori in the OG and icon routes.
// Mirrors components/svg/Crest.tsx exactly. `stroke` is any CSS color; the
// monogram and rules fill to match it.
export function crestSvg(stroke: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 80" fill="none">
  <path d="M32 2.5 L59 11.5 V40 C59 58.4 47.2 70.4 32 77.5 C16.8 70.4 5 58.4 5 40 V11.5 Z" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M32 8 L53.5 15.2 V39.4 C53.5 54.6 43.7 64.7 32 71.2 C20.3 64.7 10.5 54.6 10.5 39.4 V15.2 Z" stroke="${stroke}" stroke-width="0.75" opacity="0.5" stroke-linejoin="round"/>
  <path d="M32 16 l3 3 -3 3 -3 -3 Z" stroke="${stroke}" stroke-width="0.9" stroke-linejoin="round"/>
  <text x="32" y="48" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="500" letter-spacing="-0.5" fill="${stroke}">CX</text>
  <line x1="20" y1="56" x2="44" y2="56" stroke="${stroke}" stroke-width="1"/>
  <line x1="23" y1="59" x2="41" y2="59" stroke="${stroke}" stroke-width="0.6" opacity="0.5"/>
</svg>`;
}

// A ready-to-use data URI for an <img src> inside ImageResponse.
export function crestDataUri(stroke: string): string {
  return `data:image/svg+xml,${encodeURIComponent(crestSvg(stroke))}`;
}
