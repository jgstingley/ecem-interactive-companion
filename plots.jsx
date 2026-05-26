// plots.jsx — reusable SVG plot primitives.
// Components are exported to window for cross-file use.

const { useMemo, useRef, useState, useEffect, useCallback } = React;
const { linScale, logScale, niceTicks, logTicks, linePath, fmt } = window.ECEM;

// ===== Axes =====
function AxesG({ sx, sy, xTicks, yTicks, xLabel, yLabel, w, h, xFmt = fmt, yFmt = fmt, yLog, xLog }) {
  return (
    <g className="axis">
      {/* grid */}
      <g className="grid">
        {xTicks.map((t, i) => (
          <line key={'gx' + i} x1={sx(t)} x2={sx(t)} y1={sy.range[1]} y2={sy.range[0]} />
        ))}
        {yTicks.map((t, i) => (
          <line key={'gy' + i} x1={sx.range[0]} x2={sx.range[1]} y1={sy(t)} y2={sy(t)} />
        ))}
      </g>
      {/* frame */}
      <rect x={sx.range[0]} y={sy.range[1]} width={sx.range[1] - sx.range[0]} height={sy.range[0] - sy.range[1]} fill="none" stroke="var(--ink-faint)" strokeWidth="0.8" />
      {/* x ticks */}
      <g>
        {xTicks.map((t, i) => (
          <g key={'tx' + i} transform={`translate(${sx(t)},${sy.range[0]})`}>
            <line y1="0" y2="4" stroke="var(--ink-faint)" strokeWidth="0.8" />
            <text y="14" textAnchor="middle">{xFmt(t)}</text>
          </g>
        ))}
      </g>
      {/* y ticks */}
      <g>
        {yTicks.map((t, i) => (
          <g key={'ty' + i} transform={`translate(${sx.range[0]},${sy(t)})`}>
            <line x1="-4" x2="0" stroke="var(--ink-faint)" strokeWidth="0.8" />
            <text x="-7" y="3" textAnchor="end">{yFmt(t)}</text>
          </g>
        ))}
      </g>
      {/* axis labels */}
      {xLabel && (
        <text className="label" x={(sx.range[0] + sx.range[1]) / 2} y={sy.range[0] + 32} textAnchor="middle">
          {typeof xLabel === 'string' ? <SvgS text={xLabel} /> : xLabel}
        </text>
      )}
      {yLabel && (
        <text className="label" x={-(sy.range[0] + sy.range[1]) / 2} y={sx.range[0] - 36} textAnchor="middle" transform="rotate(-90)">
          {typeof yLabel === 'string' ? <SvgS text={yLabel} /> : yLabel}
        </text>
      )}
    </g>
  );
}

// ===== Generic multi-line plot =====
function MultiLinePlot({
  series,             // [{ name, color, x: [], y: [] }, ...]
  width = 480,
  height = 280,
  margin = { top: 12, right: 12, bottom: 38, left: 50 },
  xDomain, yDomain,
  xLog = false, yLog = false,
  xLabel, yLabel,
  xFmt, yFmt,
  hLines = [],        // [{y, color, dash}, ...]
  vLines = [],        // [{x, color, dash, label}, ...]
  overlays,           // <g>… </g> rendered on top
  onPointerMove,      // (xData, yData, event) =>
  cursorX = null,     // numeric x to mark with vertical line
  highlightIdx = null, // marker dot at this series-index in series[0]
}) {
  const W = width, H = height;
  const px0 = margin.left, px1 = W - margin.right;
  const py0 = H - margin.bottom, py1 = margin.top;
  const clipId = React.useId();

  const { sx, sy, xTicks, yTicks } = useMemo(() => {
    let xD = xDomain;
    let yD = yDomain;
    if (!xD || !yD) {
      let xmn = Infinity, xmx = -Infinity, ymn = Infinity, ymx = -Infinity;
      for (const s of series) {
        for (let i = 0; i < s.x.length; i++) {
          if (Number.isFinite(s.x[i])) { if (s.x[i] < xmn) xmn = s.x[i]; if (s.x[i] > xmx) xmx = s.x[i]; }
          if (Number.isFinite(s.y[i])) { if (s.y[i] < ymn) ymn = s.y[i]; if (s.y[i] > ymx) ymx = s.y[i]; }
        }
      }
      if (!xD) xD = [xmn, xmx];
      if (!yD) {
        const pad = (ymx - ymn) * 0.08 || 1e-3;
        yD = [ymn - pad, ymx + pad];
      }
    }
    const sx = xLog ? logScale(xD[0], xD[1], px0, px1) : linScale(xD[0], xD[1], px0, px1);
    const sy = yLog ? logScale(yD[0], yD[1], py0, py1) : linScale(yD[0], yD[1], py0, py1);
    const xTicks = xLog ? logTicks(xD[0], xD[1]) : niceTicks(xD[0], xD[1], 5);
    const yTicks = yLog ? logTicks(yD[0], yD[1]) : niceTicks(yD[0], yD[1], 4);
    return { sx, sy, xTicks, yTicks };
  }, [series, xDomain, yDomain, xLog, yLog, px0, px1, py0, py1]);

  const handleMove = useCallback((e) => {
    if (!onPointerMove) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    if (x < px0 || x > px1 || y < py1 || y > py0) { onPointerMove(null, null, e); return; }
    onPointerMove(sx.invert(x), sy.invert(y), e);
  }, [sx, sy, onPointerMove, W, H, px0, px1, py0, py1]);

  return (
    <svg className="plot-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
      onPointerMove={handleMove}
      onPointerLeave={() => onPointerMove && onPointerMove(null, null)}>
      <defs>
        <clipPath id={clipId}>
          <rect x={px0} y={py1} width={px1 - px0} height={py0 - py1} />
        </clipPath>
      </defs>
      <AxesG sx={sx} sy={sy} xTicks={xTicks} yTicks={yTicks}
        xLabel={xLabel} yLabel={yLabel}
        xFmt={xFmt} yFmt={yFmt} xLog={xLog} yLog={yLog} w={W} h={H} />
      {/* hLines */}
      {hLines.map((h, i) => (
        <line key={'hl' + i}
          x1={px0} x2={px1}
          y1={sy(h.y)} y2={sy(h.y)}
          stroke={h.color || 'var(--ink-faint)'}
          strokeWidth={h.width || 0.8}
          strokeDasharray={h.dash || '4 3'} />
      ))}
      {/* vLines */}
      {vLines.map((v, i) => (
        <g key={'vl' + i}>
          <line
            x1={sx(v.x)} x2={sx(v.x)}
            y1={py1} y2={py0}
            stroke={v.color || 'var(--ink-faint)'}
            strokeWidth={v.width || 1}
            strokeDasharray={v.dash || '4 3'} />
          {v.label && (
            <text className="anno" x={sx(v.x) + 4} y={py1 + 12}>{v.label}</text>
          )}
        </g>
      ))}
      {/* series */}
      <g clipPath={`url(#${clipId})`}>
        {series.map((s, i) => (
          <path key={'s' + i}
            d={linePath(s.x, s.y, sx, sy)}
            fill="none"
            stroke={s.color || 'var(--ink)'}
            strokeWidth={s.width || 1.4}
            strokeOpacity={s.opacity ?? 1}
            strokeDasharray={s.dash || undefined} />
        ))}
      </g>
      {/* cursor crosshair */}
      {cursorX !== null && Number.isFinite(cursorX) && (
        <line className="crosshair" x1={sx(cursorX)} x2={sx(cursorX)} y1={py1} y2={py0} />
      )}
      {/* highlight dots */}
      {highlightIdx !== null && series.map((s, i) => {
        const idx = highlightIdx;
        if (idx < 0 || idx >= s.x.length) return null;
        if (!Number.isFinite(s.x[idx]) || !Number.isFinite(s.y[idx])) return null;
        return <circle key={'h' + i} cx={sx(s.x[idx])} cy={sy(s.y[idx])} r="3.5" fill={s.color || 'var(--ink)'} stroke="var(--bg)" strokeWidth="1.2" />;
      })}
      {overlays}
    </svg>
  );
}

// ===== Heatmap (basin) =====
function Heatmap({
  data,            // flattened 2D array, shape [ny, nx]
  xVals, yVals,    // 1D arrays of length nx, ny
  outcome,         // optional same-shape integer array (-1/0/+1)
  width = 540,
  height = 460,
  margin = { top: 14, right: 60, bottom: 44, left: 56 },
  xLabel, yLabel,
  colorScale,      // (v) => '#rrggbb' (for data values; nulls = transparent)
  selected,        // {i, j} indices
  onCellHover,     // ({i, j, x, y, v, outcome}) =>
  onCellClick,
  contourMask,     // optional Float32Array mask (1 inside, 0 outside) for white contour
}) {
  const W = width, H = height;
  const px0 = margin.left, px1 = W - margin.right;
  const py0 = H - margin.bottom, py1 = margin.top;
  const nx = xVals.length, ny = yVals.length;
  const xSpan = xVals[nx - 1] - xVals[0];
  const ySpan = yVals[ny - 1] - yVals[0];
  const cellW = (px1 - px0) / nx;
  const cellH = (py0 - py1) / ny;
  const sx = useMemo(() => linScale(xVals[0] - xSpan / nx / 2, xVals[nx - 1] + xSpan / nx / 2, px0, px1), [xVals]);
  const sy = useMemo(() => linScale(yVals[0] - ySpan / ny / 2, yVals[ny - 1] + ySpan / ny / 2, py0, py1), [yVals]);
  const xTicks = useMemo(() => niceTicks(xVals[0], xVals[nx - 1], 5), [xVals]);
  const yTicks = useMemo(() => niceTicks(yVals[0], yVals[ny - 1], 5), [yVals]);

  const cells = [];
  for (let i = 0; i < ny; i++) {
    for (let j = 0; j < nx; j++) {
      const v = data[i * nx + j];
      const oc = outcome ? outcome[i * nx + j] : null;
      let fill;
      if (v !== null && v !== undefined && Number.isFinite(v)) {
        fill = colorScale(v);
      } else if (oc === -1) {
        fill = 'oklch(0.92 0.05 30 / 0.55)';
      } else {
        fill = 'var(--rule-soft)';
      }
      cells.push({ i, j, v, oc, fill });
    }
  }

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const xPx = (e.clientX - rect.left) * scaleX;
    const yPx = (e.clientY - rect.top) * scaleY;
    if (xPx < px0 || xPx > px1 || yPx < py1 || yPx > py0) { onCellHover && onCellHover(null); return; }
    const j = Math.min(nx - 1, Math.max(0, Math.floor((xPx - px0) / cellW)));
    const i = Math.min(ny - 1, Math.max(0, ny - 1 - Math.floor((yPx - py1) / cellH))); // y inverted
    const v = data[i * nx + j];
    const oc = outcome ? outcome[i * nx + j] : null;
    onCellHover && onCellHover({ i, j, x: xVals[j], y: yVals[i], v, outcome: oc });
  };

  return (
    <svg className="plot-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
      onPointerMove={handleMove}
      onPointerLeave={() => onCellHover && onCellHover(null)}
      onClick={(e) => {
        if (!onCellClick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const scaleX = W / rect.width, scaleY = H / rect.height;
        const xPx = (e.clientX - rect.left) * scaleX;
        const yPx = (e.clientY - rect.top) * scaleY;
        if (xPx < px0 || xPx > px1 || yPx < py1 || yPx > py0) return;
        const j = Math.min(nx - 1, Math.max(0, Math.floor((xPx - px0) / cellW)));
        const i = Math.min(ny - 1, Math.max(0, ny - 1 - Math.floor((yPx - py1) / cellH)));
        onCellClick({ i, j, x: xVals[j], y: yVals[i] });
      }}>
      {cells.map(c => {
        const x = px0 + c.j * cellW;
        const y = py0 - (c.i + 1) * cellH;
        return (
          <rect key={c.i + '-' + c.j}
            x={x} y={y}
            width={cellW + 0.4} height={cellH + 0.4}
            fill={c.fill} />
        );
      })}
      {/* red x for crunch cells */}
      {outcome && cells.filter(c => c.oc === -1).map(c => {
        const cx = px0 + (c.j + 0.5) * cellW;
        const cy = py0 - (c.i + 0.5) * cellH;
        return (
          <g key={'cr' + c.i + '-' + c.j} stroke="var(--ekpyrotic)" strokeWidth="1.3" opacity="0.9">
            <line x1={cx - 3} y1={cy - 3} x2={cx + 3} y2={cy + 3} />
            <line x1={cx - 3} y1={cy + 3} x2={cx + 3} y2={cy - 3} />
          </g>
        );
      })}
      {/* selection */}
      {selected && (
        <rect
          x={px0 + selected.j * cellW - 1}
          y={py0 - (selected.i + 1) * cellH - 1}
          width={cellW + 2} height={cellH + 2}
          fill="none" stroke="var(--ink)" strokeWidth="1.6" />
      )}
      <AxesG sx={sx} sy={sy} xTicks={xTicks} yTicks={yTicks}
        xLabel={xLabel} yLabel={yLabel} w={W} h={H} />
    </svg>
  );
}

// ===== Color scale legend (vertical) =====
function ColorbarV({ colorScale, vMin, vMax, x = 0, y = 0, h = 200, w = 12, label, fmt: fn = fmt }) {
  const stops = [];
  const N = 24;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    stops.push({ t, v: vMin + t * (vMax - vMin), color: colorScale(vMin + t * (vMax - vMin)) });
  }
  return (
    <g transform={`translate(${x},${y})`}>
      {stops.map((s, i) => (
        <rect key={i} x={0} y={h - (i + 1) * (h / N)} width={w} height={h / N + 0.5} fill={s.color} />
      ))}
      <rect x={0} y={0} width={w} height={h} fill="none" stroke="var(--ink-faint)" strokeWidth="0.6" />
      <text className="label" x={w + 6} y={6} textAnchor="start">{fn(vMax)}</text>
      <text className="label" x={w + 6} y={h} textAnchor="start">{fn(vMin)}</text>
      {label && (
        <text className="label" x={w / 2} y={-6} textAnchor="middle">
          {typeof label === 'string' ? <SvgS text={label} /> : label}
        </text>
      )}
    </g>
  );
}

Object.assign(window, { MultiLinePlot, Heatmap, ColorbarV, AxesG });
