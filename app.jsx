// app.jsx — Page layout and data loading

const { useState: useStateA, useEffect: useEffectA } = React;

function App() {
  const [data, setData] = useStateA(null);
  const [err, setErr] = useStateA(null);

  useEffectA(() => {
    Promise.all([
      fetch('data/bounce_hero.json?v=journal-sync-20260524').then(r => r.json()),
      fetch('data/lyapunov.json?v=journal-sync-20260524').then(r => r.json()),
      fetch('data/basin.json?v=journal-sync-20260524').then(r => r.json()),
    ])
      .then(([hero, lyap, basin]) => setData({ hero, lyap, basin }))
      .catch(e => setErr(String(e)));
  }, []);

  if (err) return <div style={{ padding: 40 }}>Error loading data: {err}</div>;
  if (!data) return (
    <div className="page">
      <div style={{ padding: '40px 0', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
        Loading numerical data…
      </div>
    </div>
  );

  return (
    <>
      <TOC />
      <div className="page">
        <Hero />
        <Abstract />
        <PublishedFig1 />

        <SectionIntro
          eyebrow="§ 6.7 — Lyapunov exponent and nonlinear stability"
          title="Maximal Lyapunov exponent on the constrained surface"
          body={
            <p>
              A negative maximal Lyapunov exponent means nearby trajectories converge rather than diverge, so the system is not chaotic in the tested homogeneous setting. To measure this, the paper uses the Benettin algorithm: start two trajectories a tiny distance{' '}<M tex="\delta_0 = 10^{-8}" />{' '}apart in the five-dimensional constrained phase space, let them evolve in e-fold time{' '}<M tex="N" tail="," /> periodically rescale their separation back to{' '}<M tex="\delta_0" tail="," /> and average the logarithmic growth rate. The three parameter choices below (slow rolling, fast rolling, and fast rolling with radiation) all give the same qualitative answer.
            </p>
          }
        />
        <LyapunovPanel data={data.lyap} />

        <SectionIntro
          eyebrow="§ 7.1 — Phase-space trajectories in (x, y, z)"
          title="Expanding-branch phase-space structure"
          body={
            <>
              <p>
                The standard way to study scalar-field cosmology without fixing a gauge is to work in dimensionless variables. Define{' '}<M tex="x = \dot\varphi/(\sqrt{6}\,H)" />{' '}and{' '}<M tex="y = \sqrt{V}/(\sqrt{3}\,H)" />, the fractions of the Hubble budget carried by the scalar's kinetic and potential energy. On a flat background these satisfy{' '}<M tex="x^2 + y^2 + z = 1" />{' '}where{' '}<M tex="z" />{' '}is the fluid fraction, so the physical state space is a half-disc. Cosmological attractors appear as fixed points: dust domination near the origin, accelerated expansion near the curved arc.
              </p>
              <p>
                Adding shear{' '}<M tex="\Sigma" tail="," /> curvature{' '}<M tex="\Omega_k" tail="," /> and spin–torsion{' '}<M tex="\Omega_s" />{' '}extends this to a five-dimensional constrained surface{' '}<M tex="x^2 + y^2 + \Sigma^2 + \Omega_k - \Omega_s + z = 1" tail="." /> The interactive plot below integrates the full system live in the browser, projecting onto{' '}<M tex="(x, y)" tail="." /> Drag the orange marker to set the initial scalar state. For{' '}<M tex="\lambda^2 < 6" />{' '}the scalar attractor sits at{' '}<M tex="\bigl(\lambda/\sqrt{6},\;\sqrt{1-\lambda^2/6}\bigr)" tail="," /> shown as a red ×.
              </p>
            </>
          }
        />
        <PhaseExplorer />

        <SectionIntro
          eyebrow="§ 7.2 — Bounce in cosmic time"
          title="Spatially flat torsion-regulated bounce"
          body={
            <>
              <p>
                The CLW variables are useful for branch-wise stability but break down near{' '}<M tex="H = 0" tail="," /> since everything is normalized by{' '}<M tex="H" tail="." /> To follow the bounce itself, the paper switches to cosmic time and tracks{' '}<M tex="(a,\, H,\, \varphi,\, \dot\varphi)" />{' '}directly. The bounce condition for flat space is transparent from the modified Friedmann equation:{' '}<M tex="H^2 = (\rho_{\rm tot} - \rho_s)/3" tail="." /> When{' '}<M tex="\rho_s" />{' '}catches up to{' '}<M tex="\rho_{\rm tot}" />{' '}the right-hand side reaches zero, and provided the total equation of state has softened below{' '}<M tex="w = 1" tail="," /> the Raychaudhuri equation gives{' '}<M tex="\dot H > 0" />{' '}there. The result is a smooth crossing from contraction to expansion at a finite scale factor.
              </p>
              <p>
                Scrub through the published trajectory below. Far from the bounce, matter dominates; as{' '}<M tex="a" />{' '}contracts, the spin–torsion density{' '}<M tex="\rho_s \propto a^{-6}" />{' '}overtakes it; then{' '}<M tex="H" />{' '}crosses zero with positive slope while{' '}<M tex="a" />{' '}stays nonzero.
              </p>
            </>
          }
        />
        <BounceTimeline data={data.hero} />

        <SectionIntro
          eyebrow="§ 8.3 — Basin of viability"
          title={<>Where in the{' '}<M tex="(\varphi_b,\, \Delta)" />{' '}plane does the bounce survive?</>}
          body={
            <>
              <p>
                The model's potential interpolates between a steep negative branch and a positive plateau via a <span className="mono">tanh</span> switch: the transition is centered at field value{' '}<M tex="\varphi_b" />{' '}and has width{' '}<M tex="\Delta" tail="." /> These two parameters matter because the bounce only works if the softening happens near the density scale where the EC spin–torsion term becomes comparable to the scalar. Too early and the spin term never catches up; too late and the system has already left the ekpyrotic attractor. The grid below maps which{' '}<M tex="(\varphi_b, \Delta)" />{' '}pairs produce a bounce.
              </p>
              <p>
                Each cell is a separate full integration of the EC system from{' '}<M tex="a_0 = 3" tail="." /> Colored cells bounced{' '}<M tex="H = 0,\; \dot H > 0" lead="(" />{' '}before{' '}<M tex="a \to 10^{-2}" tail=");" /> cells marked × crunched. The color encodes{' '}<M tex="R_b = \rho_s/\rho_\varphi" />{' '}at the moment of bounce, measuring how spin-dominated the torsion sector is when{' '}<M tex="H" />{' '}crosses zero. Hover any cell to read the exact values.
              </p>
            </>
          }
        />
        <BasinMap basin={data.basin} />

        <CycleDiagram />
        <Closing />
      </div>
    </>
  );
}

function SectionIntro({ eyebrow, title, body }) {
  return (
    <section style={{ marginTop: 80 }}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 style={{ marginTop: 12 }}>{title}</h2>
      <div style={{ marginTop: 14, color: 'var(--ink-mid)', fontSize: 17, lineHeight: 1.6 }}>{body}</div>
    </section>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
