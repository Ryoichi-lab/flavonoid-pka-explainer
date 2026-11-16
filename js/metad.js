// metad.html の図（反応の模式図、メタダイナミクスのアニメーション、ΔG→pKa、pH と割合）
(function () {
  const $ = (id) => document.getElementById(id);
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setup(cv) {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || 720; const h = Math.round(w * cv.height / cv.width);
    if (!cv._ratio) cv._ratio = cv.height / cv.width;
    const hh = Math.max(180, Math.round(w * cv._ratio));
    cv.style.height = hh + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr);
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, w, h: hh };
  }

  // ---------- 図 1: 反応の模式図（SVG） ----------
  function drawRxn() {
    const s = $('rxnSvg'); const ink = css('--ink'), o = css('--o'), acc = css('--accent'), mut = css('--muted'), a = css('--a');
    const ring = (cx, cy) => {
      let p = ''; for (let k = 0; k < 6; k++) { const t = Math.PI / 6 + k * Math.PI / 3; p += `${cx + 28 * Math.cos(t)},${cy + 28 * Math.sin(t)} `; }
      return `<polygon points="${p}" fill="none" stroke="${ink}" stroke-width="2.5"/><circle cx="${cx}" cy="${cy}" r="16" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
    };
    const water = (x, y, lbl, col) => `<text x="${x}" y="${y}" font-size="17" fill="${col}" text-anchor="middle">${lbl}</text>`;
    s.innerHTML = `
      ${ring(80, 105)}<line x1="108" y1="105" x2="140" y2="105" stroke="${ink}" stroke-width="2.5"/>
      <text x="152" y="111" font-size="20" font-weight="700" fill="${o}">O</text>
      <line x1="170" y1="104" x2="190" y2="104" stroke="${ink}" stroke-width="2.5"/>
      <text x="196" y="111" font-size="20" font-weight="700" fill="${a}">H</text>
      ${water(250, 110, 'H₂O', mut)}${water(225, 60, 'H₂O', mut)}${water(230, 165, 'H₂O', mut)}
      <text x="150" y="190" font-size="14" fill="${mut}" text-anchor="middle">ArOH（s ≈ 0.9）</text>
      <line x1="300" y1="105" x2="410" y2="105" stroke="${acc}" stroke-width="3"/>
      <polygon points="410,97 426,105 410,113" fill="${acc}"/>
      <line x1="300" y1="120" x2="410" y2="120" stroke="${mut}" stroke-width="1.5" stroke-dasharray="5 4"/>
      <polygon points="300,114 288,120 300,126" fill="${mut}"/>
      <text x="363" y="88" font-size="14" fill="${acc}" text-anchor="middle">H⁺ が水へ移る</text>
      <text x="363" y="145" font-size="13" fill="${mut}" text-anchor="middle">戻ることもある</text>
      ${ring(500, 105)}<line x1="528" y1="105" x2="560" y2="105" stroke="${ink}" stroke-width="2.5"/>
      <text x="572" y="111" font-size="20" font-weight="700" fill="${o}">O⁻</text>
      <text x="660" y="111" font-size="18" font-weight="700" fill="${a}" text-anchor="middle">H₃O⁺</text>
      ${water(640, 60, 'H₂O', mut)}${water(640, 165, 'H₂O', mut)}
      <text x="580" y="190" font-size="14" fill="${mut}" text-anchor="middle">ArO⁻ ＋ H₃O⁺（s ≈ 0.2）</text>`;
  }

  // ---------- 図 2: メタダイナミクス（1 次元の模式図） ----------
  const KT = 0.6, DG2 = 5.0;           // kcal/mol（見やすくするため差を小さくした模式図）
  const S0 = -0.05, S1 = 1.25;
  const F = (s) => 220 * (s - 0.2) ** 2 * (s - 0.9) ** 2 + DG2 * Math.min(1, Math.max(0, (0.9 - s) / 0.7))
    + (s < 0.05 ? 400 * (0.05 - s) ** 2 : 0) + (s > 1.05 ? 400 * (s - 1.05) ** 2 : 0);
  const dF = (s) => (F(s + 1e-4) - F(s - 1e-4)) / 2e-4;
  const W0 = 0.35, SIG = 0.035, BF = 8, PACE = 15;
  let st;
  function reset() { st = { s: 0.9, c: [], h: [], step: 0, cross: 0, side: 'A', run: false }; drawMD(); }
  const V = (s) => { let v = 0; for (let i = 0; i < st.c.length; i++) v += st.h[i] * Math.exp(-0.5 * ((s - st.c[i]) / SIG) ** 2); return v; };
  const dV = (s) => (V(s + 1e-4) - V(s - 1e-4)) / 2e-4;
  function advance(n) {
    const D = 0.0006, dt = 1;
    for (let k = 0; k < n; k++) {
      const g = dF(st.s) + dV(st.s);
      const z = Math.sqrt(-2 * Math.log(Math.random() + 1e-12)) * Math.cos(2 * Math.PI * Math.random());
      st.s += -D / KT * g * dt + Math.sqrt(2 * D * dt) * z;
      st.s = Math.min(S1, Math.max(S0, st.s)); st.step++;
      if (st.step % PACE === 0) { const hgt = W0 * Math.exp(-V(st.s) / (KT * (BF - 1))); st.c.push(st.s); st.h.push(hgt); }
      const side = st.s < 0.45 ? 'B' : (st.s > 0.65 ? 'A' : st.side);
      if (side !== st.side) { st.cross++; st.side = side; }
    }
  }
  function drawMD() {
    const { c, w, h } = setup($('mdCv'));
    const ink = css('--ink'), mut = css('--muted'), line = css('--line'), acc = css('--accent'), b = css('--b'), a = css('--a'), soft = css('--accent-soft');
    c.clearRect(0, 0, w, h);
    const L = 48, R = w - 14, T = 22, B = h - 40;
    let top = 0; for (let k = 0; k <= 100; k++) { const q = 0.05 + k / 100; top = Math.max(top, F(q) + V(q)); }
    const YMAX = Math.max(12, top * 1.1);   // 谷が埋まっても上が切れないように
    const X = (s) => L + (s - S0) / (S1 - S0) * (R - L), Y = (f) => B - Math.min(f, YMAX) / YMAX * (B - T);
    c.strokeStyle = line; c.lineWidth = 1; c.beginPath(); c.moveTo(L, T); c.lineTo(L, B); c.lineTo(R, B); c.stroke();
    c.fillStyle = mut; c.font = '12px system-ui,sans-serif'; c.textAlign = 'center';
    [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2].forEach((s) => c.fillText(s.toFixed(1), X(s), B + 15));
    c.fillText('s（O に付いている H の数）', (L + R) / 2, B + 32);
    c.save(); c.translate(14, (T + B) / 2); c.rotate(-Math.PI / 2); c.fillText('自由エネルギー', 0, 0); c.restore();
    const N = 220, ss = [...Array(N + 1)].map((_, i) => S0 + (S1 - S0) * i / N);
    // F+V（塗り）
    c.beginPath(); c.moveTo(X(S0), B);
    ss.forEach((s) => c.lineTo(X(s), Y(F(s) + V(s)))); c.lineTo(X(S1), B); c.closePath();
    c.fillStyle = soft; c.fill();
    // F（実線）
    c.beginPath(); ss.forEach((s, i) => (i ? c.lineTo(X(s), Y(F(s))) : c.moveTo(X(s), Y(F(s)))));
    c.strokeStyle = ink; c.lineWidth = 2; c.stroke();
    // 推定 F（破線）= -(BF)/(BF-1) V、谷 A の値に合わせる
    if (st.c.length > 5) {
      const est = ss.map((s) => -(BF / (BF - 1)) * V(s));
      const off = F(0.9) - (-(BF / (BF - 1)) * V(0.9));
      c.beginPath(); ss.forEach((s, i) => { const y = Y(est[i] + off); i ? c.lineTo(X(s), y) : c.moveTo(X(s), y); });
      c.setLineDash([6, 5]); c.strokeStyle = a; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
    }
    c.fillStyle = mut; c.textAlign = 'center'; c.fillText('谷 B：ArO⁻', X(0.2), Math.min(B - 6, Y(F(0.2)) + 18)); c.fillText('谷 A：ArOH', X(0.9), Math.min(B - 6, Y(F(0.9)) + 18));
    // 系の位置
    c.beginPath(); c.arc(X(st.s), Y(F(st.s) + V(st.s)) - 7, 7, 0, 2 * Math.PI); c.fillStyle = b; c.fill();
    $('mdInfo').textContent = `山 ${st.c.length} 個、谷 A と B の行き来 ${st.cross} 回`;
  }
  let raf = null;
  function loop() { if (!st.run) return; advance(60); drawMD(); if (st.c.length > 1400) { st.run = false; $('mdGo').textContent = '▶ 再生'; return; } raf = requestAnimationFrame(loop); }
  $('mdGo').addEventListener('click', () => {
    if (reduce) { advance(20000); drawMD(); return; }
    st.run = !st.run; $('mdGo').textContent = st.run ? '❚❚ 一時停止' : '▶ 再生'; if (st.run) loop();
  });
  $('mdReset').addEventListener('click', () => { st.run = false; cancelAnimationFrame(raf); $('mdGo').textContent = '▶ 再生'; reset(); });

  // ---------- 図 3: ΔG → pKa ----------
  function drawDG() {
    const dg = +$('dgSlider').value; $('dgVal').textContent = dg.toFixed(1) + ' kcal/mol';
    const { c, w, h } = setup($('dgCv'));
    const ink = css('--ink'), mut = css('--muted'), acc = css('--accent'), a = css('--a');
    c.clearRect(0, 0, w, h);
    const L = 40, R = w - 20, T = 18, B = h - 30, YM = 22;
    const X = (s) => L + (s + 0.05) / 1.3 * (R - L), Y = (f) => B - f / YM * (B - T);
    const G = (s) => 300 * (s - 0.2) ** 2 * (s - 0.9) ** 2 + dg * Math.min(1, Math.max(0, (0.9 - s) / 0.7));
    c.beginPath(); for (let i = 0; i <= 200; i++) { const s = -0.05 + 1.3 * i / 200; const y = Y(Math.min(G(s), YM)); i ? c.lineTo(X(s), y) : c.moveTo(X(s), y); }
    c.strokeStyle = ink; c.lineWidth = 2; c.stroke();
    const yA = Y(G(0.9)), yB = Y(G(0.2));
    c.setLineDash([4, 4]); c.strokeStyle = mut; c.lineWidth = 1;
    c.beginPath(); c.moveTo(X(0.2) - 30, yB); c.lineTo(X(0.62), yB); c.moveTo(X(0.58), yA); c.lineTo(X(0.9) + 30, yA); c.stroke(); c.setLineDash([]);
    const xa = X(0.6); c.strokeStyle = acc; c.lineWidth = 2.5; c.beginPath(); c.moveTo(xa, yA); c.lineTo(xa, yB); c.stroke();
    c.fillStyle = acc; c.beginPath(); c.moveTo(xa - 6, yB + 10); c.lineTo(xa, yB); c.lineTo(xa + 6, yB + 10); c.fill();
    c.font = '13px system-ui,sans-serif'; c.textAlign = 'right'; c.fillText(`ΔG = ${dg.toFixed(1)}`, xa - 8, yA - 10);
    c.fillStyle = mut; c.textAlign = 'center'; c.fillText('ArO⁻＋H₃O⁺', X(0.2), yB - 10); c.fillText('ArOH', X(0.9), yA + 18);
    const pka = dg / 1.364;
    $('dgInfo').innerHTML = `pKa = ${dg.toFixed(1)} ÷ 1.364 ≈ <b>${pka.toFixed(1)}</b>。` + (pka > 10.5 ? 'フェノールより H⁺ が抜けにくい。' : pka < 9.5 ? 'フェノールより H⁺ が抜けやすい。' : 'フェノール（10.0）と同じくらい。');
  }
  $('dgSlider').addEventListener('input', drawDG);

  // ---------- 図 4: pH と割合 ----------
  function drawPH() {
    const p1 = +$('p1Slider').value, p2 = +$('p2Slider').value, ph = +$('phSlider').value;
    $('p1Val').textContent = p1.toFixed(1); $('p2Val').textContent = p2.toFixed(1); $('phVal').textContent = ph.toFixed(1);
    const { c, w, h } = setup($('phCv'));
    const ink = css('--ink'), mut = css('--muted'), line = css('--line'), a = css('--a'), b = css('--b'), acc = css('--accent');
    c.clearRect(0, 0, w, h);
    const L = 46, R = w - 14, T = 14, B = h - 36;
    const X = (p) => L + (p - 2) / 12 * (R - L), Y = (f) => B - f * (B - T);
    c.strokeStyle = line; c.lineWidth = 1; c.beginPath(); c.moveTo(L, T); c.lineTo(L, B); c.lineTo(R, B); c.stroke();
    c.fillStyle = mut; c.font = '12px system-ui,sans-serif'; c.textAlign = 'center';
    for (let p = 2; p <= 14; p += 2) c.fillText(p, X(p), B + 15);
    c.fillText('pH', (L + R) / 2, B + 31); c.textAlign = 'right'; [0, 0.5, 1].forEach((f) => c.fillText(`${f * 100}%`, L - 6, Y(f) + 4));
    c.setLineDash([3, 4]); c.strokeStyle = line; c.beginPath(); c.moveTo(L, Y(0.5)); c.lineTo(R, Y(0.5)); c.stroke(); c.setLineDash([]);
    const frac = (pk, p) => 1 / (1 + 10 ** (pk - p));
    [[p1, a, 'OH ①'], [p2, b, 'OH ②']].forEach(([pk, col, lbl]) => {
      c.beginPath(); for (let i = 0; i <= 240; i++) { const p = 2 + 12 * i / 240; const y = Y(frac(pk, p)); i ? c.lineTo(X(p), y) : c.moveTo(X(p), y); }
      c.strokeStyle = col; c.lineWidth = 2.5; c.stroke();
      c.fillStyle = col; c.textAlign = 'left'; c.fillText(lbl, Math.min(X(pk) + 6, R - 40), Y(0.5) - 6 - (col === b ? 14 : 0));
    });
    c.strokeStyle = acc; c.lineWidth = 2; c.beginPath(); c.moveTo(X(ph), T); c.lineTo(X(ph), B); c.stroke();
    const f1 = frac(p1, ph), f2 = frac(p2, ph);
    $('phInfo').innerHTML = `pH ${ph.toFixed(1)} では、OH ① の ${(f1 * 100).toFixed(0)}%、OH ② の ${(f2 * 100).toFixed(0)}% が ArO⁻。` +
      (Math.abs(f1 - f2) < 0.02 ? '両者はほぼ同じ。' : `陰イオンが多いのは <b>${f1 > f2 ? 'OH ①' : 'OH ②'}</b>（${(Math.max(f1, f2) / Math.max(1e-9, Math.min(f1, f2))).toFixed(1)} 倍）。`);
  }
  ['p1Slider', 'p2Slider', 'phSlider'].forEach((id) => $(id).addEventListener('input', drawPH));


  // ---------- 図 5: 計算の流れ ----------
  const NS = 'http://www.w3.org/2000/svg';
  // クエルセチンの骨格から OH を選んで描く。keep = {原子番号: 位置名}、hl = {位置名: 色}
  const Q_OH = { 3: '3', 12: '5', 9: '7', 20: "3'", 18: "4'" };
  function molSVG(keep, hl) {
    const Q = window.QUERCETIN; if (!Q) return '';
    const drop = new Set(Object.keys(Q_OH).map(Number).filter((i) => !(i in keep)));
    const at = Q.atoms.filter((a) => !drop.has(a.i));
    const xs = at.map((a) => a.x), ys = at.map((a) => a.y);
    const minx = Math.min(...xs) - 1.4, maxx = Math.max(...xs) + 1.4, miny = Math.min(...ys) - 1.4, maxy = Math.max(...ys) + 1.4;
    const ink = css('--ink'), o = css('--o'), surf = css('--surface'), mut = css('--muted');
    const cx = xs.reduce((u, v) => u + v, 0) / xs.length, cy = ys.reduce((u, v) => u + v, 0) / ys.length;
    let g = '';
    Q.bonds.forEach((b) => {
      if (drop.has(b.a) || drop.has(b.b)) return;
      const A = Q.atoms[b.a], B = Q.atoms[b.b];
      if (b.o === 2) {
        const dx = B.x - A.x, dy = B.y - A.y, l = Math.hypot(dx, dy), nx = -dy / l * 0.08, ny = dx / l * 0.08;
        g += `<line x1="${A.x + nx}" y1="${A.y + ny}" x2="${B.x + nx}" y2="${B.y + ny}" stroke="${ink}" stroke-width="0.07"/>`;
        g += `<line x1="${A.x - nx}" y1="${A.y - ny}" x2="${B.x - nx}" y2="${B.y - ny}" stroke="${ink}" stroke-width="0.07"/>`;
      } else g += `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="${ink}" stroke-width="0.07"/>`;
    });
    at.forEach((a) => {
      if (a.el === 'C') return;
      const isOH = a.i in keep; const pos = keep[a.i]; const col = isOH ? (hl[pos] || css('--accent')) : null;
      if (isOH) g += `<circle cx="${a.x}" cy="${a.y}" r="0.55" fill="none" stroke="${col}" stroke-width="0.12"/>`;
      g += `<circle cx="${a.x}" cy="${a.y}" r="${isOH ? 0.38 : 0.26}" fill="${surf}"/>`;
      g += `<text x="${a.x}" y="${a.y}" font-size="0.5" font-weight="700" fill="${o}" text-anchor="middle" dominant-baseline="central">${isOH ? 'OH' : 'O'}</text>`;
      if (isOH) {
        const vx = a.x - cx, vy = a.y - cy, vl = Math.hypot(vx, vy);
        g += `<text x="${a.x + vx / vl * 0.95}" y="${a.y + vy / vl * 0.95}" font-size="0.42" font-weight="700" fill="${col}" text-anchor="middle" dominant-baseline="central">${pos}</text>`;
      }
    });
    return `<svg viewBox="${minx} ${miny} ${maxx - minx} ${maxy - miny}" role="img">${g}</svg>`;
  }
  function phenolSVG() {
    const ink = css('--ink'), o = css('--o'), acc = css('--accent'), surf = css('--surface');
    let p = ''; const P = [];
    for (let k = 0; k < 6; k++) { const t = -Math.PI / 2 + k * Math.PI / 3; P.push([Math.cos(t), Math.sin(t)]); }
    let g = `<polygon points="${P.map((q) => q.join(',')).join(' ')}" fill="none" stroke="${ink}" stroke-width="0.07"/>`;
    g += `<circle cx="0" cy="0" r="0.55" fill="none" stroke="${ink}" stroke-width="0.05"/>`;
    g += `<line x1="0" y1="-1" x2="0" y2="-1.75" stroke="${ink}" stroke-width="0.07"/>`;
    g += `<circle cx="0" cy="-2.15" r="0.55" fill="none" stroke="${acc}" stroke-width="0.12"/><circle cx="0" cy="-2.15" r="0.38" fill="${surf}"/>`;
    g += `<text x="0" y="-2.15" font-size="0.5" font-weight="700" fill="${o}" text-anchor="middle" dominant-baseline="central">OH</text>`;
    return `<svg viewBox="-2.6 -3.1 5.2 4.5" role="img" style="max-height:150px">${g}</svg>`;
  }
  // 実測 pKa の数直線。marks = [{v, lbl, col, up}]、band = {lo, hi, lbl}
  function ruler(marks, band, note) {
    const ink = css('--ink'), mut = css('--muted'), line = css('--line');
    const W = 300, H = band ? 106 : 92, L = 16, R = W - 12, Y0 = 50, X = (v) => L + (v - 5) / 8 * (R - L);
    let g = `<line x1="${L}" y1="${Y0}" x2="${R}" y2="${Y0}" stroke="${mut}" stroke-width="1.2"/>`;
    for (let v = 5; v <= 13; v++) g += `<line x1="${X(v)}" y1="${Y0 - 3}" x2="${X(v)}" y2="${Y0 + 3}" stroke="${mut}"/><text x="${X(v)}" y="${Y0 + 15}" font-size="10" fill="${mut}" text-anchor="middle">${v}</text>`;
    g += `<text x="${R}" y="${Y0 + 30}" font-size="10" fill="${mut}" text-anchor="end">pKa →（右ほど抜けにくい）</text>`;
    if (band) g += `<rect x="${X(band.lo)}" y="${Y0 - 7}" width="${X(band.hi) - X(band.lo)}" height="14" fill="${line}" stroke="${mut}" stroke-dasharray="3 2"/><text x="${(X(band.lo) + X(band.hi)) / 2}" y="${Y0 + 46}" font-size="10" fill="${css('--o')}" text-anchor="middle">↑ ${band.lbl}</text>`;
    marks.forEach((m) => {
      const x = X(m.v), ty = m.up ? Y0 - 30 : Y0 - 14;
      g += `<circle cx="${x}" cy="${Y0}" r="5.5" fill="${m.col}"/>`;
      g += `<line x1="${x}" y1="${Y0 - 6}" x2="${x}" y2="${ty + 4}" stroke="${m.col}" stroke-width="1"/>`;
      g += `<text x="${x}" y="${ty}" font-size="11" font-weight="700" fill="${m.col}" text-anchor="middle">${m.lbl}</text>`;
    });
    if (note) g += `<text x="${L}" y="12" font-size="10.5" fill="${ink}">${note}</text>`;
    return `<svg class="flowruler" viewBox="0 0 ${W} ${H}" role="img">${g}</svg>`;
  }
  function drawFlow() {
    const box = $('flowBox'); if (!box) return;
    const acc = css('--accent'), a = css('--a'), b = css('--b'), o = css('--o');
    const c7 = a, c3 = b, c5 = css('--o');
    const card = (cls, chip, title, mols, rul, checks) =>
      `<div class="flowcard ${cls}"><div class="flowhead"><span class="stagechip">${chip}</span><b>${title}</b></div><div class="flowbody">${mols}<div>${rul}<ul class="flowcheck">${checks.map((t) => `<li>${t}</li>`).join('')}</ul></div></div></div>`;
    const arrow = `<div class="flowarrow" aria-hidden="true"><span>⬇</span>うまくいけば次へ</div>`;
    const s1 = card('now', '段階 1・実行中', 'フェノール',
      `<div class="flowmols">${phenolSVG()}</div>`,
      ruler([{ v: 10.0, lbl: '10.0', col: acc }], null, '実測 pKa'),
      ['H⁺ が水と行き来するか', 'ΔG が約 13.6 kcal/mol になるか', 'UMA・eSEN・PFP の差']);
    const s2 = card('wide', '段階 2', 'ヒドロキシフラボン 3 種',
      `<div class="flowmols three"><div>${molSVG({ 9: '7' }, { 7: c7 })}<div class="molcap">7-OH</div></div><div>${molSVG({ 3: '3' }, { 3: c3 })}<div class="molcap">3-OH</div></div><div>${molSVG({ 12: '5' }, { 5: c5 })}<div class="molcap">5-OH</div></div></div>`,
      ruler([{ v: 7.28, lbl: '7-OH', col: c7 }, { v: 8.68, lbl: '3-OH', col: c3, up: true }, { v: 11.75, lbl: '5-OH', col: c5 }],
        { lo: 8.4, hi: 8.7, lbl: '記述子モデルの 5-OH 予測' }, '実測 pKa'),
      ['7 < 3 < 5 の順番が出るか', '5-OH（C=O と水素結合）が高く出るか']);
    const s3 = card('goal', '段階 3・本題', 'クエルセチン',
      `<div class="flowmols">${molSVG({ 3: '3', 12: '5', 9: '7', 20: "3'", 18: "4'" }, { 7: a, "4'": b, 3: css('--muted'), 5: css('--muted'), "3'": css('--muted') })}</div>`,
      ruler([{ v: 7.35, lbl: '最初の pKa 7.35', col: css('--ink') }], null, 'どの OH の値か？　実験 → 7-OH ／ DFT → 4\'-OH'),
      [`<b style="color:${a}">7-OH</b> と <b style="color:${b}">4'-OH</b>、どちらが先に抜けるか`]);
    box.innerHTML = s1 + arrow + s2 + arrow + s3;
  }

  function all() { drawRxn(); drawMD(); drawDG(); drawPH(); drawFlow(); }
  reset();
  if (location.search.includes('filled')) advance(25000);   // 表示確認用：図 2 を進めた状態で開く
  all();
  window.addEventListener('resize', all);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', all);
})();
