// lib.js — numerical and plotting helpers loaded before the React components
// - 5D extended-CLW integrator (live)
// - Linear / log scale helpers
// - SVG path generation

(function (global) {
  'use strict';

  // ============================================================
  // Extended CLW right-hand side with shear, curvature, and spin-torsion.
  // u = [x, y, Sigma, Omega_k, Omega_s]; independent variable N = ln a.
  // ============================================================
  function rhsExtended(u, lam, gamma_m) {
    const x = u[0], y = u[1], sig = u[2], ok = u[3], os_ = u[4];
    const z = 1.0 - (x * x + y * y + sig * sig + ok - os_);
    const q = 3.0 * x * x - 1.0 + 1.5 * gamma_m * z + 3.0 * sig * sig + ok - 3.0 * os_;
    const sqrt32 = Math.sqrt(1.5);
    return [
      -3.0 * x + sqrt32 * lam * y * y + x * (1.0 + q),
      -sqrt32 * lam * x * y + y * (1.0 + q),
      -(2.0 - q) * sig,
      2.0 * q * ok,
      2.0 * (q - 2.0) * os_,
    ];
  }

  function derived(u, gamma_m) {
    const x = u[0], y = u[1], sig = u[2], ok = u[3], os_ = u[4];
    const z = Math.max(0, Math.min(1, 1.0 - (x * x + y * y + sig * sig + ok - os_)));
    const q = 3.0 * x * x - 1.0 + 1.5 * gamma_m * z + 3.0 * sig * sig + ok - 3.0 * os_;
    const wEff = (2.0 * q - 1.0) / 3.0;
    return { z, q, wEff };
  }

  // One RK4 step for the five-dimensional system.
  function rk4Step5(u, h, lam, gm) {
    const k1 = rhsExtended(u, lam, gm);
    const u2 = [u[0] + 0.5 * h * k1[0], u[1] + 0.5 * h * k1[1], u[2] + 0.5 * h * k1[2], u[3] + 0.5 * h * k1[3], u[4] + 0.5 * h * k1[4]];
    const k2 = rhsExtended(u2, lam, gm);
    const u3 = [u[0] + 0.5 * h * k2[0], u[1] + 0.5 * h * k2[1], u[2] + 0.5 * h * k2[2], u[3] + 0.5 * h * k2[3], u[4] + 0.5 * h * k2[4]];
    const k3 = rhsExtended(u3, lam, gm);
    const u4 = [u[0] + h * k3[0], u[1] + h * k3[1], u[2] + h * k3[2], u[3] + h * k3[3], u[4] + h * k3[4]];
    const k4 = rhsExtended(u4, lam, gm);
    return [
      u[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      u[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      u[2] + (h / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
      u[3] + (h / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]),
      u[4] + (h / 6) * (k1[4] + 2 * k2[4] + 2 * k3[4] + k4[4]),
    ];
  }

  // Integrate 5D system until either N >= Nmax or domain inequality violated.
  // Returns arrays of x, y, z, sig (shear), and N (e-fold time) along the trajectory.
  function integrate5D(ic, lam, gm, Nmax, dN = 0.02) {
    const nSteps = Math.max(2, Math.ceil(Nmax / dN));
    const h = Nmax / nSteps;
    const xs = new Float32Array(nSteps + 1);
    const ys = new Float32Array(nSteps + 1);
    const zs = new Float32Array(nSteps + 1);
    const sigs = new Float32Array(nSteps + 1);
    const Ns = new Float32Array(nSteps + 1);
    let u = ic.slice();
    xs[0] = u[0]; ys[0] = u[1]; sigs[0] = u[2]; Ns[0] = 0;
    zs[0] = 1 - (u[0]*u[0] + u[1]*u[1] + u[2]*u[2] + u[3] - u[4]);
    let lastIdx = 0;
    for (let i = 0; i < nSteps; i++) {
      u = rk4Step5(u, h, lam, gm);
      // Physical-domain check: z = 1 - (...) >= 0.
      const z = 1 - (u[0]*u[0] + u[1]*u[1] + u[2]*u[2] + u[3] - u[4]);
      // Stop if the browser-side trajectory leaves a sensible plotting range.
      if (!Number.isFinite(u[0]) || !Number.isFinite(u[1]) || Math.abs(u[0]) > 5 || Math.abs(u[1]) > 5) {
        break;
      }
      xs[i + 1] = u[0]; ys[i + 1] = u[1]; zs[i + 1] = z;
      sigs[i + 1] = u[2]; Ns[i + 1] = (i + 1) * h;
      lastIdx = i + 1;
      if (z < -1e-3) break;
    }
    return {
      x: xs.slice(0, lastIdx + 1),
      y: ys.slice(0, lastIdx + 1),
      z: zs.slice(0, lastIdx + 1),
      sig: sigs.slice(0, lastIdx + 1),
      N: Ns.slice(0, lastIdx + 1),
      length: lastIdx + 1,
    };
  }

  // ============================================================
  // Scale helpers
  // ============================================================
  function linScale(dMin, dMax, rMin, rMax) {
    const m = (rMax - rMin) / (dMax - dMin || 1);
    const fn = (d) => rMin + (d - dMin) * m;
    fn.invert = (r) => dMin + (r - rMin) / m;
    fn.domain = [dMin, dMax];
    fn.range = [rMin, rMax];
    return fn;
  }
  function logScale(dMin, dMax, rMin, rMax) {
    const lMin = Math.log10(dMin), lMax = Math.log10(dMax);
    const m = (rMax - rMin) / (lMax - lMin || 1);
    const fn = (d) => rMin + (Math.log10(Math.max(d, 1e-30)) - lMin) * m;
    fn.invert = (r) => Math.pow(10, lMin + (r - rMin) / m);
    fn.domain = [dMin, dMax];
    fn.range = [rMin, rMax];
    return fn;
  }

  // Produce about n round ticks across [d0,d1].
  function niceTicks(d0, d1, n = 5) {
    const span = d1 - d0;
    const step0 = span / n;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    let step;
    if (norm < 1.5) step = 1 * mag;
    else if (norm < 3) step = 2 * mag;
    else if (norm < 7) step = 5 * mag;
    else step = 10 * mag;
    const start = Math.ceil(d0 / step) * step;
    const ticks = [];
    for (let v = start; v <= d1 + 1e-12; v += step) ticks.push(Number(v.toFixed(12)));
    return ticks;
  }

  function logTicks(d0, d1) {
    const lo = Math.floor(Math.log10(d0));
    const hi = Math.ceil(Math.log10(d1));
    const out = [];
    for (let p = lo; p <= hi; p++) out.push(Math.pow(10, p));
    return out;
  }

  // Build SVG path string from parallel arrays; NaN/non-finite points break the line.
  function linePath(xs, ys, sx, sy) {
    if (!xs.length) return '';
    let d = '';
    let prevValid = false;
    for (let i = 0; i < xs.length; i++) {
      if (!Number.isFinite(xs[i]) || !Number.isFinite(ys[i])) { prevValid = false; continue; }
      const X = sx(xs[i]), Y = sy(ys[i]);
      if (!Number.isFinite(X) || !Number.isFinite(Y)) { prevValid = false; continue; }
      d += (prevValid ? 'L' : 'M') + X.toFixed(2) + ',' + Y.toFixed(2);
      prevValid = true;
    }
    return d;
  }

  // Format a number for compact display.
  function fmt(v, n = 3) {
    if (v === null || v === undefined || !Number.isFinite(v)) return '—';
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 0.01 && a < 10000) return v.toFixed(n).replace(/\.?0+$/, '');
    return v.toExponential(n - 1);
  }

  // Viridis-like color stops for the basin log10(Rb) heatmap.
  const viridis = [
    '#440154', '#481b6d', '#46327e', '#3f4a8a', '#365c8d',
    '#2e6c8e', '#277b8e', '#21918c', '#1fa088', '#3eb37a',
    '#6cce5a', '#a5d836', '#fde724',
  ];
  function viridisColor(t) {
    // t in [0,1].
    const tt = Math.max(0, Math.min(1, t));
    const f = tt * (viridis.length - 1);
    const i = Math.floor(f);
    const r = f - i;
    if (i >= viridis.length - 1) return viridis[viridis.length - 1];
    return mixHex(viridis[i], viridis[i + 1], r);
  }
  function mixHex(a, b, t) {
    const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return '#' + [r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // Bisection: find index in sorted (monotonically increasing) ts closest to v
  function nearestIdx(ts, v) {
    if (!ts || !ts.length) return -1;
    let lo = 0, hi = ts.length - 1;
    if (v <= ts[lo]) return lo;
    if (v >= ts[hi]) return hi;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ts[mid] < v) lo = mid; else hi = mid;
    }
    return (v - ts[lo] < ts[hi] - v) ? lo : hi;
  }

  global.ECEM = {
    rhsExtended, rk4Step5, integrate5D, derived,
    linScale, logScale, niceTicks, logTicks,
    linePath, fmt, viridisColor, nearestIdx,
  };
})(window);
