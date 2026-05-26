// notation.jsx — math and notation primitives shared across sections.
// Exports: M (KaTeX inline), Mb (KaTeX block), S (HTML sub/sup parser),
// SvgS (SVG tspan sub/sup parser), parseTokens.
//
// Token grammar for plain-text inputs, used by S and SvgS:
//   _x     subscript a single char
//   _{abc} subscript an arbitrary group
//   ^x     superscript a single char
//   ^{abc} superscript an arbitrary group

const { useRef: useRefN, useEffect: useEffectN, useState: useStateN } = React;

// ============================================================
// Tokenizer
// ============================================================
function parseTokens(text) {
  const out = [];
  let i = 0;
  let buf = '';
  const flush = () => { if (buf) { out.push({ k: 'n', t: buf }); buf = ''; } };
  while (i < text.length) {
    const ch = text[i];
    if (ch === '_' || ch === '^') {
      flush();
      const kind = ch === '_' ? 's' : 'p';   // s=sub, p=sup
      let s, after;
      if (text[i + 1] === '{') {
        const close = text.indexOf('}', i + 1);
        if (close < 0) { buf += ch; i++; continue; }
        s = text.slice(i + 2, close);
        after = close + 1;
      } else {
        // Grab an alphanumeric run (so "ρ_tot" works without braces).
        let j = i + 1;
        while (j < text.length && /[A-Za-z0-9]/.test(text[j])) j++;
        if (j === i + 1) {
          // Single non-alphanumeric character.
          s = text.slice(i + 1, i + 2);
          after = i + 2;
        } else {
          s = text.slice(i + 1, j);
          after = j;
        }
      }
      out.push({ k: kind, t: s });
      i = after;
    } else {
      buf += ch;
      i++;
    }
  }
  flush();
  return out;
}

// Unwrap React wrappers until we reach a literal string.
function extractText(node) {
  if (node == null) return null;
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    if (node.length === 1) return extractText(node[0]);
    return null;
  }
  if (React.isValidElement(node)) {
    return extractText(node.props ? node.props.children : null);
  }
  return null;
}

// ============================================================
// HTML sub/sup renderer
// ============================================================
function S(props) {
  const text = props.text != null ? props.text : extractText(props.children);
  if (text == null) return props.children || null;
  return parseTokens(text).map((p, k) =>
    p.k === 's' ? <sub key={k}>{p.t}</sub>
    : p.k === 'p' ? <sup key={k}>{p.t}</sup>
    : <React.Fragment key={k}>{p.t}</React.Fragment>
  );
}

// ============================================================
// SVG tspan sub/sup renderer (use inside <text>)
// ============================================================
function SvgS({ text, subSize = '0.72em', children }) {
  const t = text != null ? text : extractText(children);
  if (t == null) return children || null;
  return parseTokens(t).map((p, k) => {
    if (p.k === 's') return <tspan key={k} baselineShift="sub" fontSize={subSize}>{p.t}</tspan>;
    if (p.k === 'p') return <tspan key={k} baselineShift="super" fontSize={subSize}>{p.t}</tspan>;
    return <React.Fragment key={k}>{p.t}</React.Fragment>;
  });
}

// ============================================================
// KaTeX inline renderer.
// `lead` and `tail` keep adjacent punctuation attached to the rendered math.
// ============================================================
function M({ tex, block = false, lead, tail }) {
  const ref = useRefN(null);
  useEffectN(() => {
    if (!ref.current) return;
    const render = () => {
      if (window.katex && ref.current) {
        try {
          window.katex.render(tex, ref.current, {
            throwOnError: false,
            displayMode: block,
            output: 'html',
          });
        } catch (e) {
          ref.current.textContent = tex;
        }
      } else {
        ref.current.textContent = tex;
        // Try again after a tick in case KaTeX is still loading.
        setTimeout(render, 60);
      }
    };
    render();
  }, [tex, block]);
  const katexEl = <span ref={ref} className={block ? 'katex-block' : 'katex-inline'} />;
  if (lead || tail) {
    return (
      <span style={{ whiteSpace: 'nowrap' }}>
        {lead}{katexEl}{tail}
      </span>
    );
  }
  return katexEl;
}

function MF({ tex }) {
  return <M tex={tex} />;
}

Object.assign(window, { M, MF, S, SvgS, parseTokens });
