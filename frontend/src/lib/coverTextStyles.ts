import type { CSSProperties } from 'react';

export type TextTexturePreset =
  | 'solid'
  | 'goldFoil'
  | 'silverChrome'
  | 'bronze'
  | 'copper'
  | 'ember'
  | 'ocean'
  | 'neon'
  | 'holographic'
  | 'royal'
  | 'rose'
  | 'forest'
  | 'parchment'
  | 'comicDots'
  | 'ice'
  | 'candy'
  | 'midnight'
  | 'lava'
  | 'sunset'
  | 'aurora'
  | 'marble'
  | 'denim'
  | 'chalk'
  | 'vintage'
  | 'rust'
  | 'sapphire'
  | 'emerald'
  | 'bloodMoon'
  | 'firefly'
  | 'glitch';

export type CoverGradientPreset =
  | 'none'
  | 'bottomNoir'
  | 'topSpotlight'
  | 'centerVignette'
  | 'blueCinema'
  | 'warmPoster'
  | 'purpleDrama'
  | 'leftShadow'
  | 'rightShadow'
  | 'bottomGold'
  | 'skyFade'
  | 'redAlert'
  | 'emeraldGlow'
  | 'splitDual'
  | 'cornerBloom';

export interface CoverTextRenderable {
  id?: string;
  text?: string;
  x?: number;
  y?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  textTransform?: 'none' | 'uppercase' | 'lowercase';
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  rotation?: number;
  opacity?: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  bgEnabled?: boolean;
  bgColor?: string;
  bgPaddingX?: number;
  bgPaddingY?: number;
  bgBorderRadius?: number;
  textBoxWidth?: number;
  texturePreset?: TextTexturePreset;
  strokeEnabled?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  coverGradientEnabled?: boolean;
  coverGradientPreset?: CoverGradientPreset;
  coverGradientOpacity?: number;
}

export const TEXT_TEXTURE_PRESETS: Array<{
  value: TextTexturePreset;
  label: string;
  background: string | null;
  backgroundSize?: string;
}> = [
  { value: 'solid', label: 'Solid Color', background: null },
  { value: 'goldFoil', label: 'Gold Foil', background: 'linear-gradient(135deg, #7c4a03 0%, #f8df72 22%, #fff3b0 42%, #b47608 62%, #f8d45f 82%, #7c4a03 100%)' },
  { value: 'silverChrome', label: 'Silver Chrome', background: 'linear-gradient(120deg, #20242c 0%, #d9e2ef 20%, #ffffff 36%, #7b8794 52%, #eef2f7 70%, #222733 100%)' },
  { value: 'ember', label: 'Ember', background: 'linear-gradient(135deg, #2b0505 0%, #d92d20 28%, #ffb020 58%, #fff1a8 76%, #7a1705 100%)' },
  { value: 'ocean', label: 'Ocean Glass', background: 'linear-gradient(135deg, #042f4f 0%, #0ea5e9 35%, #67e8f9 62%, #e0f2fe 78%, #075985 100%)' },
  { value: 'neon', label: 'Neon Pulse', background: 'linear-gradient(90deg, #22d3ee 0%, #a855f7 32%, #f0abfc 58%, #fb7185 82%, #22d3ee 100%)' },
  { value: 'royal', label: 'Royal Ink', background: 'linear-gradient(135deg, #22104f 0%, #5b21b6 36%, #c4b5fd 58%, #312e81 100%)' },
  { value: 'rose', label: 'Rose Metal', background: 'linear-gradient(135deg, #7f1d1d 0%, #f9a8d4 34%, #fff1f2 52%, #be123c 76%, #4c0519 100%)' },
  { value: 'forest', label: 'Forest Myth', background: 'linear-gradient(135deg, #052e16 0%, #16a34a 30%, #bef264 58%, #166534 100%)' },
  { value: 'parchment', label: 'Parchment', background: 'linear-gradient(135deg, #7c2d12 0%, #fed7aa 24%, #fffbeb 54%, #ca8a04 76%, #78350f 100%)' },
  { value: 'comicDots', label: 'Comic Dots', background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0 18%, transparent 19% 100%), linear-gradient(135deg, #f97316, #dc2626 48%, #7c2d12)', backgroundSize: '10px 10px, 160% 160%' },
  { value: 'ice', label: 'Ice Shard', background: 'linear-gradient(135deg, #ecfeff 0%, #67e8f9 24%, #e0f2fe 45%, #38bdf8 68%, #ffffff 100%)' },
  { value: 'candy', label: 'Candy Stripe', background: 'repeating-linear-gradient(135deg, #fb7185 0 10px, #ffffff 10px 20px, #38bdf8 20px 30px, #ffffff 30px 40px)' },
  { value: 'midnight', label: 'Midnight Star', background: 'radial-gradient(circle at 20% 20%, #ffffff 0 2px, transparent 3px), linear-gradient(135deg, #020617, #1e3a8a 45%, #7c3aed 100%)', backgroundSize: '22px 22px, 160% 160%' },
  { value: 'lava', label: 'Lava Rock', background: 'radial-gradient(circle at 30% 30%, rgba(255,237,213,0.85), transparent 16%), linear-gradient(135deg, #111827 0%, #7f1d1d 32%, #f97316 62%, #1f2937 100%)' },
  { value: 'bronze', label: 'Bronze Age', background: 'linear-gradient(135deg, #451a03 0%, #b45309 24%, #fde68a 46%, #92400e 68%, #78350f 100%)' },
  { value: 'copper', label: 'Copper Wire', background: 'linear-gradient(120deg, #431407 0%, #ea580c 22%, #fdba74 42%, #9a3412 62%, #fed7aa 82%, #431407 100%)' },
  { value: 'holographic', label: 'Holographic', background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 18%, #f472b6 36%, #facc15 54%, #34d399 72%, #60a5fa 90%, #22d3ee 100%)', backgroundSize: '220% 220%' },
  { value: 'sunset', label: 'Sunset Pop', background: 'linear-gradient(135deg, #312e81 0%, #db2777 28%, #fb923c 56%, #fde047 78%, #7c2d12 100%)' },
  { value: 'aurora', label: 'Aurora', background: 'linear-gradient(135deg, #042f2e 0%, #14b8a6 24%, #818cf8 48%, #f472b6 72%, #022c22 100%)' },
  { value: 'marble', label: 'Marble Vein', background: 'linear-gradient(135deg, #e5e7eb 0%, #f8fafc 18%, #cbd5e1 36%, #ffffff 52%, #94a3b8 72%, #f1f5f9 100%)' },
  { value: 'denim', label: 'Denim Stitch', background: 'repeating-linear-gradient(45deg, #1e3a8a 0 6px, #1d4ed8 6px 12px, #172554 12px 18px)' },
  { value: 'chalk', label: 'Chalk Dust', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 28%, #ffffff 52%, #cbd5e1 76%, #94a3b8 100%)' },
  { value: 'vintage', label: 'Vintage Print', background: 'repeating-linear-gradient(0deg, rgba(120,53,15,0.18) 0 1px, transparent 1px 4px), linear-gradient(135deg, #78350f, #d97706 42%, #fef3c7 100%)' },
  { value: 'rust', label: 'Rust Metal', background: 'linear-gradient(135deg, #1c1917 0%, #7c2d12 26%, #ea580c 48%, #451a03 72%, #292524 100%)' },
  { value: 'sapphire', label: 'Sapphire', background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 30%, #93c5fd 54%, #1e3a8a 78%, #020617 100%)' },
  { value: 'emerald', label: 'Emerald Cut', background: 'linear-gradient(135deg, #022c22 0%, #059669 28%, #6ee7b7 52%, #064e3b 76%, #052e16 100%)' },
  { value: 'bloodMoon', label: 'Blood Moon', background: 'radial-gradient(circle at 50% 35%, rgba(254,226,226,0.9) 0 18%, transparent 19%), linear-gradient(135deg, #450a0a, #991b1b 42%, #7f1d1d 100%)' },
  { value: 'firefly', label: 'Firefly Night', background: 'radial-gradient(circle at 18% 24%, #fef08a 0 3px, transparent 4px), radial-gradient(circle at 72% 68%, #fde047 0 2px, transparent 3px), linear-gradient(135deg, #020617, #1e1b4b 100%)', backgroundSize: '100% 100%, 100% 100%, 160% 160%' },
  { value: 'glitch', label: 'Glitch Scan', background: 'repeating-linear-gradient(90deg, #22d3ee 0 8px, #f472b6 8px 16px, #facc15 16px 24px, #111827 24px 32px)' },
];

export const COVER_GRADIENT_PRESETS: Array<{
  value: CoverGradientPreset;
  label: string;
  background: string;
}> = [
  { value: 'none', label: 'None', background: 'transparent' },
  { value: 'bottomNoir', label: 'Bottom Noir', background: 'linear-gradient(to top, rgba(0,0,0,0.88), rgba(0,0,0,0.28) 46%, transparent 78%)' },
  { value: 'topSpotlight', label: 'Top Spotlight', background: 'linear-gradient(to bottom, rgba(0,0,0,0.82), rgba(0,0,0,0.22) 48%, transparent 78%)' },
  { value: 'centerVignette', label: 'Center Vignette', background: 'radial-gradient(circle at center, transparent 22%, rgba(0,0,0,0.42) 68%, rgba(0,0,0,0.82) 100%)' },
  { value: 'blueCinema', label: 'Blue Cinema', background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(29,78,216,0.42) 44%, rgba(2,6,23,0.72))' },
  { value: 'warmPoster', label: 'Warm Poster', background: 'linear-gradient(135deg, rgba(69,26,3,0.72), rgba(234,88,12,0.28) 48%, rgba(17,24,39,0.78))' },
  { value: 'purpleDrama', label: 'Purple Drama', background: 'linear-gradient(135deg, rgba(30,27,75,0.82), rgba(126,34,206,0.34) 50%, rgba(2,6,23,0.78))' },
  { value: 'leftShadow', label: 'Left Shadow', background: 'linear-gradient(to right, rgba(0,0,0,0.86), rgba(0,0,0,0.24) 46%, transparent 82%)' },
  { value: 'rightShadow', label: 'Right Shadow', background: 'linear-gradient(to left, rgba(0,0,0,0.86), rgba(0,0,0,0.24) 46%, transparent 82%)' },
  { value: 'bottomGold', label: 'Bottom Gold', background: 'linear-gradient(to top, rgba(69,26,3,0.88), rgba(180,83,9,0.34) 42%, transparent 78%)' },
  { value: 'skyFade', label: 'Sky Fade', background: 'linear-gradient(to bottom, rgba(14,165,233,0.55), rgba(15,23,42,0.18) 48%, rgba(2,6,23,0.72))' },
  { value: 'redAlert', label: 'Red Alert', background: 'linear-gradient(135deg, rgba(69,10,10,0.82), rgba(220,38,38,0.38) 46%, rgba(2,6,23,0.78))' },
  { value: 'emeraldGlow', label: 'Emerald Glow', background: 'linear-gradient(135deg, rgba(6,78,59,0.82), rgba(16,185,129,0.28) 48%, rgba(2,6,23,0.76))' },
  { value: 'splitDual', label: 'Split Dual', background: 'linear-gradient(90deg, rgba(0,0,0,0.78) 0 50%, rgba(15,23,42,0.72) 50% 100%)' },
  { value: 'cornerBloom', label: 'Corner Bloom', background: 'radial-gradient(circle at top left, rgba(0,0,0,0.82), transparent 42%), radial-gradient(circle at bottom right, rgba(0,0,0,0.82), transparent 42%)' },
];

const TEXTURE_BY_VALUE = new Map(TEXT_TEXTURE_PRESETS.map((preset) => [preset.value, preset]));
const GRADIENT_BY_VALUE = new Map(COVER_GRADIENT_PRESETS.map((preset) => [preset.value, preset]));

function scaled(value: number | undefined, fallback: number, scale: number) {
  return (value ?? fallback) * scale;
}

export function getCoverGradientStyle(overlay: CoverTextRenderable): CSSProperties | null {
  if (!overlay.coverGradientEnabled) return null;

  const preset = GRADIENT_BY_VALUE.get(overlay.coverGradientPreset || 'bottomNoir');
  if (!preset || preset.value === 'none') return null;

  return {
    background: preset.background,
    opacity: overlay.coverGradientOpacity ?? 0.78,
  };
}

export function getCoverTextWrapperStyle(overlay: CoverTextRenderable): CSSProperties {
  return {
    left: `${overlay.x ?? 50}%`,
    top: `${overlay.y ?? 50}%`,
    transform: `translate(-50%, -50%) rotate(${overlay.rotation ?? 0}deg)`,
  };
}

export function getCoverTextBackgroundStyle(overlay: CoverTextRenderable, scale = 1): CSSProperties | null {
  if (!overlay.bgEnabled) return null;

  return {
    position: 'absolute',
    inset: `${-scaled(overlay.bgPaddingY, 8, scale)}px ${-scaled(overlay.bgPaddingX, 12, scale)}px`,
    background: overlay.bgColor || 'rgba(0,0,0,0.5)',
    borderRadius: scaled(overlay.bgBorderRadius, 4, scale),
    pointerEvents: 'none',
  };
}

export function getCoverTextSpanStyle(overlay: CoverTextRenderable, scale = 1): CSSProperties {
  const texture = TEXTURE_BY_VALUE.get(overlay.texturePreset || 'solid') || TEXTURE_BY_VALUE.get('solid')!;
  const shadowStyle = overlay.shadowEnabled
    ? `${scaled(overlay.shadowOffsetX, 2, scale)}px ${scaled(overlay.shadowOffsetY, 4, scale)}px ${scaled(overlay.shadowBlur, 8, scale)}px ${overlay.shadowColor || 'rgba(0,0,0,0.7)'}`
    : 'none';
  const textBoxWidth = overlay.textBoxWidth ? Math.max(24, overlay.textBoxWidth * scale) : undefined;

  return {
    fontFamily: overlay.fontFamily,
    fontSize: Math.max(6, scaled(overlay.fontSize, 48, scale)),
    fontWeight: overlay.fontWeight ?? 700,
    fontStyle: overlay.fontStyle || 'normal',
    color: overlay.color || '#ffffff',
    textTransform: overlay.textTransform || 'none',
    letterSpacing: scaled(overlay.letterSpacing, 0, scale),
    lineHeight: overlay.lineHeight ?? 1.2,
    textAlign: overlay.textAlign || 'center',
    opacity: overlay.opacity ?? 1,
    textShadow: shadowStyle,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    width: textBoxWidth,
    maxWidth: textBoxWidth,
    display: 'block',
    position: 'relative',
    WebkitTextStroke: overlay.strokeEnabled
      ? `${Math.max(0.25, scaled(overlay.strokeWidth, 2, scale))}px ${overlay.strokeColor || '#111827'}`
      : undefined,
    paintOrder: overlay.strokeEnabled ? 'stroke fill' : undefined,
    backgroundImage: texture.background || undefined,
    backgroundSize: texture.background ? texture.backgroundSize || '160% 160%' : undefined,
    backgroundPosition: texture.background ? 'center' : undefined,
    backgroundClip: texture.background ? 'text' : undefined,
    WebkitBackgroundClip: texture.background ? 'text' : undefined,
    WebkitTextFillColor: texture.background ? 'transparent' : undefined,
  };
}
