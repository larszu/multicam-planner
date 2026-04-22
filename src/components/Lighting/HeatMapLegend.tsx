import { useMemo } from 'react';
import { luxToColor, luxToColorTarget } from '../../utils/lightCalc';

interface Props {
  targetLux: number;
  scaleLux: number;
  /** How to position the legend box. Absolute coords within its parent (which must be relative). */
  position?: 'bottom-left' | 'bottom-right' | 'top-right' | 'top-left';
  /** Orientation of the gradient bar. Defaults to horizontal. */
  orientation?: 'horizontal' | 'vertical';
  /** Number of sample steps for the gradient. */
  steps?: number;
}

/**
 * Compact HTML legend overlay for the photometric heat-map.
 * Renders a gradient strip + labelled lux tick marks, matching the colour
 * mapping used by HeatMapOverlay (Konva) and HeatMapFloor3D (three.js).
 */
export default function HeatMapLegend({
  targetLux,
  scaleLux,
  position = 'bottom-left',
  orientation = 'horizontal',
  steps = 64,
}: Props) {
  const useTarget = targetLux > 0;
  const max = useTarget ? targetLux * 2 : Math.max(1, scaleLux);

  const gradient = useMemo(() => {
    const stops: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lux = t * max;
      const [r, g, b, a] = useTarget ? luxToColorTarget(lux, targetLux) : luxToColor(lux, scaleLux);
      const alpha = a / 255;
      stops.push(`rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)}) ${(t * 100).toFixed(1)}%`);
    }
    const dir = orientation === 'horizontal' ? 'to right' : 'to top';
    return `linear-gradient(${dir}, ${stops.join(', ')})`;
  }, [steps, max, orientation, targetLux, scaleLux, useTarget]);

  const ticks = useMemo(() => {
    if (useTarget) {
      return [
        { t: 0, label: '0' },
        { t: 0.4, label: `${Math.round(targetLux * 0.8)}` },
        { t: 0.5, label: `${Math.round(targetLux)} lx (target)`, strong: true },
        { t: 0.6, label: `${Math.round(targetLux * 1.2)}` },
        { t: 1, label: `${Math.round(targetLux * 2)}+` },
      ];
    }
    return [
      { t: 0, label: '0' },
      { t: 0.25, label: `${Math.round(scaleLux * 0.25)}` },
      { t: 0.5, label: `${Math.round(scaleLux * 0.5)}` },
      { t: 0.75, label: `${Math.round(scaleLux * 0.75)}` },
      { t: 1, label: `${Math.round(scaleLux)} lx` },
    ];
  }, [useTarget, targetLux, scaleLux]);

  const posStyle: React.CSSProperties = {
    position: 'absolute',
    ...(position.includes('bottom') ? { bottom: 10 } : { top: 10 }),
    ...(position.includes('left') ? { left: 10 } : { right: 10 }),
    zIndex: 15,
  };

  const barStyle: React.CSSProperties =
    orientation === 'horizontal'
      ? { width: 180, height: 12, background: gradient }
      : { width: 12, height: 180, background: gradient };

  return (
    <div
      style={{
        ...posStyle,
        background: 'rgba(12, 17, 29, 0.88)',
        border: '1px solid #334155',
        borderRadius: 6,
        padding: '8px 10px',
        color: '#e2e8f0',
        fontSize: 10,
        fontFamily: 'monospace',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: '#cbd5e1' }}>
        Illuminance {useTarget ? '(target mode)' : '(absolute)'}
      </div>
      <div style={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #1e293b', ...barStyle }} />
      <div
        style={{
          display: 'flex',
          flexDirection: orientation === 'horizontal' ? 'row' : 'column-reverse',
          justifyContent: 'space-between',
          marginTop: 3,
          fontSize: 9,
          lineHeight: 1.1,
          color: '#94a3b8',
          ...(orientation === 'horizontal' ? { width: 180 } : { height: 180 }),
        }}
      >
        {ticks.map((tk, i) => (
          <span
            key={i}
            style={{
              fontWeight: tk.strong ? 700 : 400,
              color: tk.strong ? '#e2e8f0' : '#94a3b8',
              whiteSpace: 'nowrap',
            }}
          >
            {tk.label}
          </span>
        ))}
      </div>
    </div>
  );
}
