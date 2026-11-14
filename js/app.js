// フラボノイドの pKa 解説ページの対話部分（外部ライブラリなし）
(() => {
  const $ = (id) => document.getElementById(id);
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const SVGNS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };

  // 高解像度ディスプレイ向けに canvas を整える
  function setupCanvas(cv, minH = 200) {
    const ratio = window.devicePixelRatio || 1;
    if (!cv.dataset.baseH) cv.dataset.baseH = cv.height / cv.width;
    const w = cv.clientWidth || cv.width;
    const h = Math.max(w * cv.dataset.baseH, minH); // 狭い画面でも潰れないよう最低の高さを確保
    cv.style.height = h + 'px';
    cv.width = Math.round(w * ratio); cv.height = Math.round(h * ratio);
    const ctx = cv.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, w, h };
  }

  /* ---------- 1. Henderson–Hasselbalch ---------- */
  const frac = (pKa, pH) => 1 / (1 + Math.pow(10, pKa - pH));
  function drawHH() {
    const pKa = +$('pkaSlider').value, pH = +$('phSlider').value;
    $('pkaVal').textContent = pKa.toFixed(1); $('phVal').textContent = pH.toFixed(1);
    const { ctx, w, h } = setupCanvas($('hhCanvas'));
    const L = 44, R = 12, T = 12, B = 34, x0 = 2, x1 = 14;
    const X = (p) => L + (p - x0) / (x1 - x0) * (w - L - R);
    const Y = (f) => T + (1 - f) * (h - T - B);
    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px system-ui'; ctx.fillStyle = css('--muted'); ctx.strokeStyle = css('--line'); ctx.lineWidth = 1;
    for (let p = 2; p <= 14; p += 2) { ctx.beginPath(); ctx.moveTo(X(p), T); ctx.lineTo(X(p), h - B); ctx.stroke(); ctx.fillText(p, X(p) - 4, h - B + 16); }
    [0, 0.5, 1].forEach((f) => { ctx.beginPath(); ctx.moveTo(L, Y(f)); ctx.lineTo(w - R, Y(f)); ctx.stroke(); ctx.fillText(f * 100 + '%', 4, Y(f) + 4); });
    ctx.fillText('pH', w - R - 18, h - 4);
    // 曲線
    ctx.strokeStyle = css('--accent'); ctx.lineWidth = 2.5; ctx.beginPath();
    for (let p = x0; p <= x1; p += 0.05) { const xx = X(p), yy = Y(frac(pKa, p)); p === x0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }
    ctx.stroke();
    // pKa の位置
    ctx.setLineDash([4, 4]); ctx.strokeStyle = css('--muted'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(pKa), Y(0.5)); ctx.lineTo(X(pKa), h - B); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = css('--muted'); ctx.fillText('pKa', X(pKa) + 4, h - B - 6);
    // 現在の pH
    const f = frac(pKa, pH);
    ctx.strokeStyle = css('--a'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(pH), T); ctx.lineTo(X(pH), h - B); ctx.stroke();
    ctx.fillStyle = css('--a'); ctx.beginPath(); ctx.arc(X(pH), Y(f), 5, 0, 7); ctx.fill();
    $('hhReadout').innerHTML = `pH ${pH.toFixed(1)} では <b>${(f * 100).toFixed(1)}%</b> が ArO⁻（脱プロトン化）、${((1 - f) * 100).toFixed(1)}% が ArOH のまま。`;
  }
  ['pkaSlider', 'phSlider'].forEach((id) => $(id).addEventListener('input', drawHH));

  /* ---------- 2. ミクロ / マクロ pKa ---------- */
  function updateMicro() {
    const a = +$('mA').value, b = +$('mB').value;
    $('mAval').textContent = a.toFixed(2); $('mBval').textContent = b.toFixed(2);
    const ka = Math.pow(10, -a), kb = Math.pow(10, -b);
    const fa = ka / (ka + kb), macro = -Math.log10(ka + kb);
    $('barA').style.width = (fa * 100) + '%'; $('barB').style.width = ((1 - fa) * 100) + '%';
    $('pctA').textContent = (fa * 100).toFixed(0) + '%'; $('pctB').textContent = ((1 - fa) * 100).toFixed(0) + '%';
    const d = Math.abs(a - b);
    const verdict = d < 0.5 ? '両方が同程度に共存する。どちらが先かは測定法によって揺れやすい。'
      : `ほぼ ${a < b ? 'A' : 'B'} だけから抜ける。`;
    $('microReadout').innerHTML = `測定されるマクロ pKa₁ = <b>${macro.toFixed(2)}</b>（低い方のミクロ pKa より ${(Math.min(a, b) - macro).toFixed(2)} 低い）。${verdict}`;
  }
  ['mA', 'mB'].forEach((id) => $(id).addEventListener('input', updateMicro));

  /* ---------- 構造式の描画（クエルセチン） ---------- */
  const Q = window.QUERCETIN;
  const OH = { 3: '3', 12: '5', 9: '7', 20: "3'", 18: "4'" };
  const OH_INFO = {
    '3': '<b>3-OH</b>（C 環）: 隣の C4=O と分子内水素結合をつくれる位置。脱プロトン化の順番は報告によって扱いが違う。',
    '5': '<b>5-OH</b>（A 環）: C4=O と強い分子内水素結合（6 員環）をつくるため、H⁺ を手放しにくい。一般に最後に抜けるとされる。',
    '7': '<b>7-OH</b>（A 環）: 抜けたあとの負電荷が共役を通じて C4=O 側へ広がり、安定しやすい。pH を変えた ¹³C NMR などの<b>実験</b>では、ここが最初に抜けるとする報告が多い。',
    "3'": "<b>3'-OH</b>（B 環）: 4'-OH と隣り合うカテコール構造の一部。4'-OH が抜けると、水素結合で 4'-O⁻ を支えられる。",
    "4'": "<b>4'-OH</b>（B 環）: 抜けたあと、隣の 3'-OH からの水素結合と C2=C3 との共役で安定する。気相のプロトン親和力を DFT で計算すると、ここが最も有利と出る。"
  };
  function layout(svg) {
    const xs = Q.atoms.map((a) => a.x), ys = Q.atoms.map((a) => a.y);
    const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
    const W = 10, H = 7, pad = 0.9;
    const s = Math.min((W - 2 * pad) / (maxx - minx), (H - 2 * pad) / (maxy - miny));
    const ox = (W - (maxx - minx) * s) / 2 - minx * s, oy = (H - (maxy - miny) * s) / 2 - miny * s;
    return { s, P: (a) => [a.x * s + ox, a.y * s + oy] };
  }
  function drawMolecule(svg, opts = {}) {
    svg.innerHTML = '';
    const { s, P } = layout(svg);
    const center = (() => { let x = 0, y = 0; Q.atoms.forEach((a) => { const p = P(a); x += p[0]; y += p[1]; }); return [x / Q.atoms.length, y / Q.atoms.length]; })();
    const gB = el('g', {}, svg), gL = el('g', {}, svg), gT = el('g', {}, svg);
    Q.bonds.forEach((b) => {
      const [x1, y1] = P(Q.atoms[b.a]), [x2, y2] = P(Q.atoms[b.b]);
      if (b.o === 2) {
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = -dy / len * 0.07, ny = dx / len * 0.07;
        el('line', { x1: x1 + nx, y1: y1 + ny, x2: x2 + nx, y2: y2 + ny, class: 'bond' }, gB);
        el('line', { x1: x1 - nx, y1: y1 - ny, x2: x2 - nx, y2: y2 - ny, class: 'bond' }, gB);
      } else el('line', { x1, y1, x2, y2, class: 'bond' }, gB);
    });
    Q.atoms.forEach((a) => {
      if (a.el === 'C') return;
      const [x, y] = P(a);
      const isOH = a.i in OH;
      el('circle', { cx: x, cy: y, r: isOH ? 0.36 : 0.24, class: 'lblbg' }, gL);
      const t = el('text', { x, y, class: 'atomlbl O' }, gL); t.textContent = isOH ? 'OH' : 'O';
      if (isOH) {
        // 位置番号は分子の外側に置く
        const vx = x - center[0], vy = y - center[1], vl = Math.hypot(vx, vy);
        const lt = el('text', { x: x + vx / vl * 0.62, y: y + vy / vl * 0.62, class: 'poslbl' }, gT); lt.textContent = OH[a.i];
      }
    });
    return { P, s };
  }

  /* ---------- 3. クエルセチン（対話） ---------- */
  const qSvg = $('qSvg');
  const { P: qP } = drawMolecule(qSvg);
  const rings = {};
  Object.entries(OH).forEach(([idx, pos]) => {
    const [x, y] = qP(Q.atoms[idx]);
    rings[pos] = el('circle', { cx: x, cy: y, r: 0.48, class: 'ohring' }, qSvg);
    const hit = el('circle', { cx: x, cy: y, r: 0.55, class: 'ohspot', tabindex: 0, role: 'button', 'aria-label': pos + '位の OH' }, qSvg);
    const pick = () => {
      Object.values(rings).forEach((r) => r.classList.remove('show'));
      rings[pos].classList.add('show');
      $('qInfo').innerHTML = OH_INFO[pos];
    };
    hit.addEventListener('click', pick);
    hit.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });
  document.querySelectorAll('[data-view]').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b === btn));
    Object.values(rings).forEach((r) => r.classList.remove('exp', 'calc', 'show'));
    const v = btn.dataset.view;
    if (v === 'exp') { rings['7'].classList.add('exp'); $('qInfo').innerHTML = '<b>実験の帰属（多くの報告）:</b> 最初に抜けるのは <b style="color:var(--a)">7-OH</b>。pH を変えた ¹³C NMR で C-7 のシグナルが動くことなどが根拠 [1]。'; }
    else if (v === 'calc') { rings["4'"].classList.add('calc'); $('qInfo').innerHTML = "<b>気相計算の予想:</b> プロトン親和力が最小なのは <b style=\"color:var(--b)\">4'-OH</b>。溶媒のない条件での計算であることに注意 [1]。"; }
    else $('qInfo').textContent = 'OH を選ぶと説明が出る。';
  }));

  /* ---------- 4. SPLET ---------- */
  const PATHS = {
    hat: {
      sp: [['ArOH + R•', '出発'], ['ArO• + RH', '生成物']],
      ar: ['H•（水素原子）が<br>一度に移る'],
      steps: ['フェノールの O–H がそのまま水素原子としてラジカルに移る。', '1 段階で終わる。O–H 結合の強さ（BDE）が速さを決める。']
    },
    splet: {
      sp: [['ArOH', '出発'], ['ArO⁻ + H⁺', 'フェノキシド'], ['ArO• + R⁻', '電子が移った後'], ['ArO• + RH', '生成物']],
      ar: ['H⁺ が抜ける<br><b>pKa が効く</b>', 'ArO⁻ から R• へ<br>電子 1 個', 'R⁻ が H⁺ を<br>受け取る'],
      steps: ['出発: フェノール（ArOH）。', '① H⁺ が抜けてフェノキシドになる。抜けやすさは pKa で決まる。', '② フェノキシドがラジカルに電子を渡す（酸化還元）。ArO⁻ は ArOH より電子を渡しやすい。', '③ R⁻ が H⁺ を受け取り、正味では HAT と同じ生成物になる。']
    }
  };
  let path = 'hat', step = 0;
  function renderPath() {
    const p = PATHS[path], v = $('pathView'); v.innerHTML = '';
    p.sp.forEach(([name, sub], i) => {
      const d = document.createElement('div'); d.className = 'species' + (i <= step ? ' on' : '');
      d.innerHTML = `${name}<small>${sub}</small>`; v.appendChild(d);
      if (i < p.ar.length) { const a = document.createElement('div'); a.className = 'arrow' + (i < step ? ' on' : ''); a.innerHTML = p.ar[i] + '<br>→'; v.appendChild(a); }
    });
    $('stepLabel').textContent = `${step + 1}/${p.steps.length}: ${p.steps[step]}`;
  }
  document.querySelectorAll('[data-path]').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-path]').forEach((b) => b.classList.toggle('active', b === btn));
    path = btn.dataset.path; step = 0; renderPath();
  }));
  $('stepPrev').addEventListener('click', () => { step = Math.max(0, step - 1); renderPath(); });
  $('stepNext').addEventListener('click', () => { step = Math.min(PATHS[path].steps.length - 1, step + 1); renderPath(); });

  // 溶媒の条件（定性的）
  const SOLV = {
    acid: [12, 12, '少ない', '小さい', '酢酸が H⁺ を供給して電離を抑える → SPLET が止まり、HAT だけが残る → 遅くなる。'],
    meoh: [45, 60, '中程度', '大きい', 'メタノールは一部の ArOH を電離させる → SPLET が主な経路になる。'],
    water: [75, 85, '多い', 'さらに大きい', '水を加えると電離が進む → ArO⁻ が増えて速くなる。']
  };
  function renderSolv(key) {
    const [b1, b2, t1, t2, msg] = SOLV[key];
    $('solvBar1').style.width = b1 + '%'; $('solvBar2').style.width = b2 + '%';
    $('solvTxt1').textContent = t1; $('solvTxt2').textContent = t2; $('solvReadout').textContent = msg;
  }
  document.querySelectorAll('[data-solv]').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-solv]').forEach((b) => b.classList.toggle('active', b === btn));
    renderSolv(btn.dataset.solv);
  }));

  /* ---------- 5. MLIP カットオフ ---------- */
  const mSvg = $('mSvg');
  const { P: mP, s: mS } = drawMolecule(mSvg);
  const ANG_PER_UNIT = 1.4; // 2D 座標の結合長 1 = 約 1.4 Å とみなす
  let picked = 17; // 4' 位の炭素
  const gCut = el('g', {}, mSvg); mSvg.insertBefore(gCut, mSvg.firstChild);
  function renderCut() {
    const rc = +$('rcSlider').value; $('rcVal').textContent = rc.toFixed(1) + ' Å';
    gCut.innerHTML = '';
    const c = Q.atoms[picked], [cx, cy] = mP(c);
    el('circle', { cx, cy, r: rc / ANG_PER_UNIT * mS, class: 'cut' }, gCut);
    el('circle', { cx, cy, r: 0.3, class: 'picked' }, gCut);
    let n = 0;
    Q.atoms.forEach((a) => {
      const d = Math.hypot(a.x - c.x, a.y - c.y) * ANG_PER_UNIT;
      if (d <= rc) { n++; const [x, y] = mP(a); el('circle', { cx: x, cy: y, r: 0.16, class: 'inside' }, gCut); }
    });
    const name = c.el === 'O' ? (OH[picked] ? OH[picked] + '位の O' : 'O') : 'C';
    $('mReadout').innerHTML = `選んだ原子（${name}）の記述子は、半径 ${rc.toFixed(1)} Å 内の <b>${n}/${Q.atoms.length}</b> 個の重原子（と H）の配置で決まる。半径を大きくすると、分子の反対側の置換基の影響も入る。`;
  }
  Q.atoms.forEach((a) => {
    const [x, y] = mP(a);
    const hit = el('circle', { cx: x, cy: y, r: 0.3, class: 'atomhit', tabindex: 0, role: 'button', 'aria-label': '原子 ' + a.i }, mSvg);
    const go = () => { picked = a.i; renderCut(); };
    hit.addEventListener('click', go);
    hit.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  });
  $('rcSlider').addEventListener('input', renderCut);

  /* ---------- 6. MD の模式図 ---------- */
  // 決まった乱数で、水素結合の有無が切り替わる時系列をつくる
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const N = 400, hb = [], desc = []; let state = 1;
  for (let i = 0; i < N; i++) { if (rnd() < (state ? 0.025 : 0.05)) state = 1 - state; hb.push(state); desc.push((state ? 0.7 : 0.25) + (rnd() - 0.5) * 0.18); }
  let t = N - 1, playing = false, raf = null; // 最初は全体を表示しておく
  function drawMD() {
    const { ctx, w, h } = setupCanvas($('mdCanvas'), 230);
    const L = 10, R = 10, X = (i) => L + i / (N - 1) * (w - L - R);
    ctx.clearRect(0, 0, w, h); ctx.font = '12px system-ui';
    // 上段: 水素結合
    const top = 22, band = 28;
    ctx.fillStyle = css('--muted'); ctx.fillText("3'-OH…4'-O 水素結合（あり=上 / なし=下）", L, 14);
    ctx.strokeStyle = css('--b'); ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= t; i++) { const y = top + (hb[i] ? 0 : band); i ? ctx.lineTo(X(i), y) : ctx.moveTo(X(i), y); }
    ctx.stroke();
    // 下段: 記述子
    const y0 = 80, y1 = h - 14, Y = (v) => y1 - v * (y1 - y0);
    ctx.fillStyle = css('--muted'); ctx.fillText("4'-O の記述子の 1 成分（イメージ）", L, y0 - 6);
    ctx.strokeStyle = css('--a'); ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i <= t; i++) { const y = Y(desc[i]); i ? ctx.lineTo(X(i), y) : ctx.moveTo(X(i), y); }
    ctx.stroke();
    const mean = desc.slice(0, t + 1).reduce((s, v) => s + v, 0) / (t + 1);
    ctx.setLineDash([6, 4]); ctx.strokeStyle = css('--ink'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L, Y(mean)); ctx.lineTo(w - R, Y(mean)); ctx.stroke(); ctx.setLineDash([]);
    // 最適化構造の値（水素結合ありの 1 状態）
    ctx.strokeStyle = css('--accent'); ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(L, Y(0.7)); ctx.lineTo(w - R, Y(0.7)); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = css('--accent'); ctx.textAlign = 'right'; ctx.fillText('最適化構造 1 つの値', w - R, Y(0.7) + 15); ctx.textAlign = 'left';
    const frac = hb.slice(0, t + 1).reduce((s, v) => s + v, 0) / (t + 1);
    $('mdReadout').textContent = `時刻 ${t + 1}/${N}（任意単位）: 水素結合ありの割合 ${(frac * 100).toFixed(0)}%、記述子の平均 ${mean.toFixed(2)}（最適化構造だけなら 0.70）`;
  }
  function tick() { if (!playing) return; t = Math.min(N - 1, t + 2); drawMD(); if (t >= N - 1) { playing = false; $('mdPlay').textContent = '↺ 最初から'; return; } raf = requestAnimationFrame(tick); }
  $('mdPlay').addEventListener('click', () => {
    if (t >= N - 1) { t = 0; }
    playing = !playing; $('mdPlay').textContent = playing ? '❚❚ 停止' : '▶ 再生';
    if (playing) tick(); else cancelAnimationFrame(raf);
  });

  /* ---------- 初期化と再描画 ---------- */
  function redrawAll() { drawHH(); drawMD(); }
  document.body.classList.add('no-anim');
  updateMicro(); renderPath(); renderSolv('meoh'); renderCut(); redrawAll();
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('no-anim')));
  window.addEventListener('resize', redrawAll);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redrawAll);
})();
