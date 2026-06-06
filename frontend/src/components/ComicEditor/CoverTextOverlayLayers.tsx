import {
  getCoverGradientStyle,
  getCoverTextBackgroundStyle,
  getCoverTextSpanStyle,
  getCoverTextWrapperStyle,
  type CoverTextRenderable,
} from '@/lib/coverTextStyles';

interface CoverTextOverlayLayersProps {
  overlays?: CoverTextRenderable[] | null;
  scale?: number;
}

export default function CoverTextOverlayLayers({ overlays, scale = 1 }: CoverTextOverlayLayersProps) {
  if (!overlays?.length) return null;

  return (
    <>
      {overlays.map((overlay) => {
        const gradientStyle = getCoverGradientStyle(overlay);
        if (!gradientStyle) return null;
        return (
          <div
            key={`${overlay.id}-cover-gradient`}
            className="pointer-events-none absolute inset-0"
            style={{ ...gradientStyle, zIndex: 12 }}
          />
        );
      })}
      {overlays.map((overlay) => (
        <div
          key={overlay.id}
          className="pointer-events-none absolute"
          style={{
            ...getCoverTextWrapperStyle(overlay),
            zIndex: 15,
          }}
        >
          {overlay.bgEnabled && (
            <div style={getCoverTextBackgroundStyle(overlay, scale) || undefined} />
          )}
          <span style={getCoverTextSpanStyle(overlay, scale)}>
            {overlay.text}
          </span>
        </div>
      ))}
    </>
  );
}
