// sections-phase.jsx — Phase portrait explorer

const { useState: useStateP, useMemo: useMemoP, useEffect: useEffectP, useCallback: useCallbackP } = React;
const { integrate5D, linScale: linScaleP, derived: derivedP } = window.ECEM;

// Unicode superscript helper for log-axis tick labels.
function supSignP(n) {
  const sup = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return String(n).split('').map(c => sup[c] || c).join('');
}

const PRESETS = [
  { name: 'Set (a)',           lam: 1.2, gm: 1.0,  ic: [0.10, 0.60, 1e-5, -1e-4, 1e-6] },
  { name: 'Set (b)',           lam: 3.5, gm: 1.0,  ic: [0.20, 0.40, 1e-5, -1e-4, 1e-6] },
  { name: 'Set (c)',           lam: 3.5, gm: 4/3,  ic: [0.15, 0.55, 1e-5, -1e-4, 1e-6] },
  { name: 'Set (d)',           lam: 1.2, gm: 1.0,  ic: [0.10, 0.60, 1e-5, -5e-3, 1e-6] },
  { name: 'Set (e)',           lam: 1.2, gm: 1.0,  ic: [0.10, 0.55, 1e-5, -1e-4, 5e-2] },
];

function PhaseExplorer() {
  const [lam, setLam] = useStateP(1.2);
  const [gm, setGm] = useStateP(1.0);
  const [x0, setX0] = useStateP(0.10);
  const [y0, setY0] = useStateP(0.60);
  const [sig0, setSig0] = useStateP(1e-5);
  const [ok0, setOk0] = useStateP(-1e-4);
  const [os0, setOs0] = useStateP(1e-6);
  const [showBundle, setShowBundle] = useStateP(true);
  const [showAttractor, setShowAttractor] = useStateP(true);
  const Nmax = 60;

  // Trajectory from the current user-selected initial condition.
  const mainTraj = useMemoP(() => {
    return integrate5D([x0, y0, sig0, ok0, os0], lam, gm, Nmax, 0.05);
  }, [x0, y0, sig0, ok0, os0, lam, gm]);

  // Lightweight background bundle for context.
  const bundle = useMemoP(() => {
    if (!showBundle) return [];
    const out = [];
    const xs = [-0.85, -0.6, -0.3, -0.05, 0.05, 0.3, 0.6, 0.85];
    const ys = [0.15, 0.4, 0.65, 0.85];
    for (const a of xs) for (const b of ys) {
      if (a * a + b * b >= 0.98) continue;
      const t = integrate5D([a, b, 1e-5, -1e-5, 1e-6], lam, gm, Nmax, 0.08);
      out.push(t);
    }
    return out;
  }, [lam, gm, showBundle]);

  // Scalar-dominated fixed point at (λ/√6, √(1−λ²/6)). Exists for λ²<6;
  // attracts when λ²<min(2, 3γm).
  const fixedPt = useMemoP(() => {
    if (lam * lam >= 6) return null;
    const xf = lam / Math.sqrt(6);
    const yf = Math.sqrt(1 - lam * lam / 6);
    return { x: xf, y: yf };
  }, [lam]);

  // CLW scaling (tracking) fixed point at (√6·γm/(2λ), √(3γm(2−γm)/2)/λ).
  // Exists in the physical disc only when λ²>3γm and 0<γm<2.
  const scalingPt = useMemoP(() => {
    if (!(lam * lam > 3 * gm && gm > 0 && gm < 2)) return null;
    const xs_ = Math.sqrt(6) * gm / (2 * lam);
    const ys_ = Math.sqrt(3 * gm * (2 - gm) / 2) / lam;
    if (!Number.isFinite(ys_) || xs_ * xs_ + ys_ * ys_ > 1.001) return null;
    return { x: xs_, y: ys_ };
  }, [lam, gm]);

  // Stability flag for the scalar-dominated point on the expanding branch.
  const scalarIsAttractor = lam * lam < Math.min(2, 3 * gm);

  // Set scales. The viewBox aspect matches the data aspect (dx=2.1, dy=1.1), so the
  // semicircle renders as a true semicircle.
  const W = 920, H = 500;
  const margin = { top: 16, right: 16, bottom: 44, left: 50 };
  const px0 = margin.left, px1 = W - margin.right;
  const py0 = H - margin.bottom, py1 = margin.top;
  const sx = linScaleP(-1.05, 1.05, px0, px1);
  const sy = linScaleP(-0.05, 1.05, py0, py1);

  // Unit semicircle boundary.
  const semicircle = useMemoP(() => {
    const segs = 200;
    let d = '';
    for (let i = 0; i <= segs; i++) {
      const th = i * Math.PI / segs;
      const X = sx(Math.cos(th)), Y = sy(Math.sin(th));
      d += (i === 0 ? 'M' : 'L') + X.toFixed(2) + ',' + Y.toFixed(2);
    }
    return d;
  }, []);

  const xTicks = [-1, -0.5, 0, 0.5, 1];
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  // Convert trajectory samples into an SVG path.
  function pathFor(traj) {
    let d = '';
    for (let i = 0; i < traj.length; i++) {
      const xx = traj.x[i], yy = traj.y[i];
      if (!Number.isFinite(xx) || !Number.isFinite(yy)) continue;
      if (xx * xx + yy * yy > 1.02) continue;
      const X = sx(xx), Y = sy(yy);
      d += (d ? 'L' : 'M') + X.toFixed(2) + ',' + Y.toFixed(2);
    }
    return d;
  }

  // Drag the initial point inside the physical half-disc.
  const [dragging, setDragging] = useStateP(false);
  const onMove = (e) => {
    if (!dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const xPx = (e.clientX - rect.left) * scaleX;
    const yPx = (e.clientY - rect.top) * scaleY;
    if (xPx < px0 || xPx > px1 || yPx < py1 || yPx > py0) return;
    const xData = Math.max(-0.99, Math.min(0.99, sx.invert(xPx)));
    const yData = Math.max(0.01, Math.min(0.99, sy.invert(yPx)));
    if (xData * xData + yData * yData < 0.97) {
      setX0(xData); setY0(yData);
    }
  };

  // Derived state for the current initial condition.
  const d0 = derivedP([x0, y0, sig0, ok0, os0], gm);
  const zCur = 1 - (x0*x0 + y0*y0 + sig0*sig0 + ok0 - os0);

  return (
    <section id="phase" className="figure col-wide">
      <div className="figure-head">
        <div>
          <span className="label">Figure 3</span>
          <div className="title">Phase-space structure of the expanding branch</div>
        </div>
        <span className="meta"><M tex="(\lambda,\gamma_m)=(1.20,1.00)" /></span>
      </div>
      <div className="figure-body">
        <div className="journal-pair">
          <figure>
            <img className="journal-figure-img" src="assets/journal-figures/fig3a-1.png" alt="Published Fig. 3a phase-space projection" />
            <figcaption>(a) Projection onto{' '}<M tex="(x,y)" /></figcaption>
          </figure>
          <figure>
            <img className="journal-figure-img" src="assets/journal-figures/fig3b-1.png" alt="Published Fig. 3b three-dimensional phase-space flow" />
            <figcaption>(b) Three-dimensional flow in{' '}<M tex="(x,y,z)" /></figcaption>
          </figure>
        </div>
      </div>
      <div className="controls" style={{ justifyContent: 'space-between' }}>
        <span className="eyebrow">Interactive companion</span>
        <span className="meta">browser RK4 · 5D constrained surface</span>
      </div>
      <div className="figure-body phase-companion-grid">
        <svg className="plot-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
          onPointerDown={(e) => { setDragging(true); onMove(e); }}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
          onPointerMove={onMove}
          style={{ cursor: dragging ? 'grabbing' : 'crosshair', userSelect: 'none' }}>
          {/* grid */}
          <g className="grid">
            {xTicks.map(t => <line key={'gx' + t} x1={sx(t)} x2={sx(t)} y1={py1} y2={py0} />)}
            {yTicks.map(t => <line key={'gy' + t} x1={px0} x2={px1} y1={sy(t)} y2={sy(t)} />)}
          </g>
          {/* axes ticks */}
          <g className="axis">
            <rect x={px0} y={py1} width={px1 - px0} height={py0 - py1} fill="none" stroke="var(--ink-faint)" strokeWidth="0.8" />
            {xTicks.map(t => (
              <g key={'tx' + t} transform={`translate(${sx(t)},${py0})`}>
                <line y1="0" y2="4" stroke="var(--ink-faint)" />
                <text y="14" textAnchor="middle">{t}</text>
              </g>
            ))}
            {yTicks.map(t => (
              <g key={'ty' + t} transform={`translate(${px0},${sy(t)})`}>
                <line x1="-4" x2="0" stroke="var(--ink-faint)" />
                <text x="-7" y="3" textAnchor="end">{t}</text>
              </g>
            ))}
            <text className="label" x={(px0 + px1) / 2} y={py0 + 32} textAnchor="middle"><SvgS text="x" /> <tspan>(kinetic fraction)</tspan></text>
            <text className="label" x={-(py0 + py1) / 2} y={px0 - 36} textAnchor="middle" transform="rotate(-90)"><SvgS text="y" /> <tspan>(potential fraction)</tspan></text>
          </g>
          {/* unit semicircle */}
          <path d={semicircle} fill="var(--bg-tint)" fillOpacity="0.5" stroke="var(--ink-faint)" strokeWidth="1" />
          {/* bundle */}
          {bundle.map((t, i) => (
            <path key={'b' + i} d={pathFor(t)} fill="none" stroke="var(--ink-faint)" strokeWidth="0.7" strokeOpacity="0.6" />
          ))}
          {/* main trajectory */}
          <path d={pathFor(mainTraj)} fill="none" stroke="var(--bounce)" strokeWidth="2" />
          {/* Initial-condition marker */}
          <circle cx={sx(x0)} cy={sy(y0)} r="6" fill="var(--ekpyrotic)" stroke="var(--bg)" strokeWidth="1.5" />
          <text className="anno" x={sx(x0) + 10} y={sy(y0) - 6}>IC</text>
          {/* Named fixed points from Table 2 of the paper */}
          {showAttractor && (
            <g className="fixed-points">
              {/* Kinetic ± at (±1, 0) — always exist, always saddles (marginal in shear/spin) */}
              {[-1, 1].map(s => (
                <g key={'K' + s}>
                  <g transform={`translate(${sx(s)},${sy(0)})`}>
                    <line x1="-4" y1="-4" x2="4" y2="4" stroke="var(--ink-soft)" strokeWidth="1.5" />
                    <line x1="4" y1="-4" x2="-4" y2="4" stroke="var(--ink-soft)" strokeWidth="1.5" />
                  </g>
                  <text className="anno" x={sx(s)} y={sy(0) + 18} textAnchor="middle"
                    style={{ fill: 'var(--ink-soft)' }}>K{s > 0 ? '+' : '−'}</text>
                </g>
              ))}
              {/* Fluid-dominated at (0, 0) — always exists, saddle */}
              <g>
                <g transform={`translate(${sx(0)},${sy(0)})`}>
                  <line x1="-4" y1="-4" x2="4" y2="4" stroke="var(--matter)" strokeWidth="1.5" />
                  <line x1="4" y1="-4" x2="-4" y2="4" stroke="var(--matter)" strokeWidth="1.5" />
                </g>
                <text className="anno" x={sx(0)} y={sy(0) + 18} textAnchor="middle"
                  style={{ fill: 'var(--matter)' }}>F</text>
              </g>
              {/* Scalar-dominated at (λ/√6, √(1−λ²/6)) — exists for λ²<6 */}
              {fixedPt && (
                <g>
                  {scalarIsAttractor && (
                    <circle cx={sx(fixedPt.x)} cy={sy(fixedPt.y)} r="9"
                      fill="none" stroke="var(--ekpyrotic)" strokeWidth="1" opacity="0.5" />
                  )}
                  <line x1={sx(fixedPt.x) - 5} y1={sy(fixedPt.y) - 5}
                    x2={sx(fixedPt.x) + 5} y2={sy(fixedPt.y) + 5}
                    stroke="var(--ekpyrotic)" strokeWidth="2.2" />
                  <line x1={sx(fixedPt.x) + 5} y1={sy(fixedPt.y) - 5}
                    x2={sx(fixedPt.x) - 5} y2={sy(fixedPt.y) + 5}
                    stroke="var(--ekpyrotic)" strokeWidth="2.2" />
                  <text className="anno" x={sx(fixedPt.x) + 12} y={sy(fixedPt.y) + 4}
                    style={{ fill: 'var(--ekpyrotic)' }}>
                    scalar {scalarIsAttractor ? 'attractor' : '(saddle)'}
                  </text>
                </g>
              )}
              {/* Scaling/tracking point — exists for λ²>3γm, 0<γm<2 */}
              {scalingPt && (
                <g>
                  <g transform={`translate(${sx(scalingPt.x)},${sy(scalingPt.y)})`}>
                    <line x1="-5" y1="0" x2="5" y2="0" stroke="var(--shear)" strokeWidth="2" />
                    <line x1="0" y1="-5" x2="0" y2="5" stroke="var(--shear)" strokeWidth="2" />
                  </g>
                  <text className="anno" x={sx(scalingPt.x) + 10} y={sy(scalingPt.y) + 4}
                    style={{ fill: 'var(--shear)' }}>scaling</text>
                </g>
              )}
            </g>
          )}
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h4 style={{ marginTop: 0 }}>Current state</h4>
          <div className="mono" style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--ink-mid)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, whiteSpace: 'nowrap' }}><span><M tex="x" /></span><span style={{ color: 'var(--ink)' }}>{x0.toFixed(3)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, whiteSpace: 'nowrap' }}><span><M tex="y" /></span><span style={{ color: 'var(--ink)' }}>{y0.toFixed(3)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, whiteSpace: 'nowrap' }}><span><M tex="\Sigma" /></span><span style={{ color: 'var(--ink)' }}>{sig0.toExponential(0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, whiteSpace: 'nowrap' }}><span><M tex="\Omega_k" /></span><span style={{ color: 'var(--ink)' }}>{ok0.toExponential(0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, whiteSpace: 'nowrap' }}><span><M tex="\Omega_s" /></span><span style={{ color: 'var(--ink)' }}>{os0.toExponential(0)}</span></div>
            <div style={{ borderTop: '1px dotted var(--rule)', marginTop: 8, paddingTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, whiteSpace: 'nowrap' }}><span><M tex="z" /></span><span style={{ color: 'var(--ink)' }}>{zCur.toFixed(3)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, whiteSpace: 'nowrap' }}><span><M tex="q" /></span><span style={{ color: 'var(--ink)' }}>{d0.q.toFixed(3)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, whiteSpace: 'nowrap' }}><span><M tex="w_{\rm eff}" /></span><span style={{ color: 'var(--ink)' }}>{d0.wEff.toFixed(3)}</span></div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--rule-soft)', paddingTop: 12 }}>
            <h4 style={{ marginTop: 0 }}>Presets</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRESETS.map(p => (
                <button key={p.name} className="btn ghost"
                  style={{ fontSize: 10 }}
                  onClick={() => {
                    setLam(p.lam); setGm(p.gm);
                    setX0(p.ic[0]); setY0(p.ic[1]);
                    setSig0(p.ic[2]); setOk0(p.ic[3]); setOs0(p.ic[4]);
                  }}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Shear-decay companion panel ---- */}
      <div className="figure-body" style={{ marginTop: 4 }}>
        <div>
          <h4 style={{ margin: '0 0 8px', color: 'var(--ink-mid)', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
            <M tex="|\Sigma|(N)" />{' '}· shear amplitude along the current trajectory
          </h4>
          <MultiLinePlot
            series={[{
              x: Array.from(mainTraj.N),
              y: Array.from(mainTraj.sig).map(v => Math.max(Math.abs(v), 1e-30)),
              color: 'var(--shear)',
              width: 1.6,
            }]}
            width={920} height={180}
            xDomain={[0, Math.max(1, mainTraj.N[mainTraj.length - 1] || Nmax)]}
            yDomain={[1e-10, 1]}
            yLog
            xLabel="N (e-fold time)"
            yLabel="|Σ|"
            yFmt={(v) => {
              const e = Math.log10(v);
              return Math.abs(e - Math.round(e)) < 0.01 ? `10${supSignP(Math.round(e))}` : '';
            }}
          />
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            The integrator carries{' '}<M tex="\Sigma" />{' '}alongside{' '}<M tex="(x,y)" tail="," /> so the shear can be followed for any initial condition selected here. The exponential damping discussed in the paper occurs on the contracting{' '}<M tex="V < 0" />{' '}branch, where{' '}<M tex="w_\varphi \gg 1" />{' '}drives{' '}<M tex="\Sigma" />{' '}toward zero in a few e-folds. The expanding-branch slice shown here is milder, but increasing{' '}<M tex="\lambda" />{' '}still tightens the curve as the scalar attractor becomes stronger.
          </div>
        </div>
      </div>

      <div className="controls">
        <div className="control" style={{ flex: '1 1 160px' }}>
          <label><M tex="\lambda" /> (potential slope) <span className="val">{lam.toFixed(2)}</span></label>
          <input type="range" min="0.2" max="5" step="0.05" value={lam} onChange={e => setLam(+e.target.value)} />
        </div>
        <div className="control" style={{ flex: '1 1 140px' }}>
          <label><M tex="\gamma_m" /> (barotropic index) <span className="val">{gm.toFixed(2)}</span></label>
          <input type="range" min="0.5" max="2" step="0.01" value={gm} onChange={e => setGm(+e.target.value)} />
        </div>
        <div className="control" style={{ flex: '1 1 140px' }}>
          <label><M tex="\Sigma_0" /> <span className="val">{sig0.toExponential(1)}</span></label>
          <input type="range" min="0" max="0.2" step="0.001" value={sig0} onChange={e => setSig0(+e.target.value)} />
        </div>
        <div className="control" style={{ flex: '1 1 140px' }}>
          <label><M tex="\Omega_{k,0}" /> <span className="val">{ok0.toExponential(1)}</span></label>
          <input type="range" min="-0.2" max="0.2" step="0.001" value={ok0} onChange={e => setOk0(+e.target.value)} />
        </div>
        <div className="control" style={{ flex: '1 1 140px' }}>
          <label><M tex="\Omega_{s,0}" /> <span className="val">{os0.toExponential(1)}</span></label>
          <input type="range" min="0" max="0.2" step="0.001" value={os0} onChange={e => setOs0(+e.target.value)} />
        </div>
        <div className="preset-row">
          <button className={'btn ' + (showBundle ? 'active' : '')} onClick={() => setShowBundle(b => !b)}>Bundle</button>
          <button className={'btn ' + (showAttractor ? 'active' : '')} onClick={() => setShowAttractor(b => !b)}>Fixed points</button>
        </div>
      </div>

      {/* ---- Fixed-points legend ---- */}
      {showAttractor && (
        <div style={{ marginTop: 4, padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--ink-mid)' }}>What you are seeing.</strong>{' '}<span style={{ color: 'var(--ink-soft)' }}>K±</span>: kinetic-dominated saddles at{' '}<M tex="(\pm 1, 0)" tail="," /> always present.{' '}<span style={{ color: 'var(--matter)' }}>F</span>: fluid-dominated saddle at the origin.{' '}<span style={{ color: 'var(--ekpyrotic)' }}>scalar</span>: appears for{' '}<M tex="\lambda^2 < 6" />{' '}and becomes the attractor (circled) when{' '}<M tex="\lambda^2 < \min(2,\,3\gamma_m)" tail="." />{' '}<span style={{ color: 'var(--shear)' }}>scaling</span>: tracks the fluid for{' '}<M tex="\lambda^2 > 3\gamma_m" />. It is stable in{' '}<M tex="(x,y)" />{' '}but a saddle in the full 6D space because curvature destabilizes it. Move the{' '}<M tex="\lambda" />{' '}slider past the boundaries to watch points appear and disappear.
        </div>
      )}

      <div className="figure-caption">
        <strong>Fig. 3.</strong> Phase-space trajectories on the positive-potential{' '}<M tex="V > 0" lead="(" tail=")" /> expanding branch for{' '}<M tex="(\lambda,\gamma_m)=(1.20,1.00)" tail="." /> Starting from small shear, curvature, and spin–torsion seeds, every trajectory inside the disc converges to the scalar-dominated fixed point at{' '}<M tex="(x^*, y^*) = (\lambda/\sqrt{6},\;\sqrt{1-\lambda^2/6})" tail="," /> marked ×. The interactive version integrates the same five-dimensional system in the browser, projecting onto the{' '}<M tex="(x,y)" />{' '}plane. Note this plot covers only the{' '}<M tex="V > 0" />{' '}branch; the ekpyrotic contraction and torsion bounce live on the{' '}<M tex="V < 0" />{' '}side and are tracked separately in cosmic time (Fig. 4).
      </div>
    </section>
  );
}

Object.assign(window, { PhaseExplorer });
