/* Charts for the Reddit data story. Plain SVG, no dependencies. Reads window.DATA. */
(function () {
  const D = window.DATA;
  const NS = "http://www.w3.org/2000/svg";
  const MAX_COLORS = 8;
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const fmt = new Intl.NumberFormat("en-US");
  const pct = (v, d = 0) => (v * 100).toFixed(d) + "%";
  const signed = (v) => (v >= 0 ? "+" : "") + v.toFixed(2);
  const hourLabel = (h) => (h % 12 || 12) + (h < 12 ? "am" : "pm");
  const $ = (id) => document.getElementById(id);


  // ---- helpers --------------------------------------------------------------
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function svg(container, w, h) {
    const s = el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img" });
    $(container).replaceChildren(s);
    return s;
  }
  function text(parent, x, y, str, attrs = {}) {
    const t = el("text", Object.assign({ x, y }, attrs), parent);
    t.textContent = str;
    return t;
  }
  const tip = $("tip");
  function showTip(e, html) {
    tip.innerHTML = html;
    tip.style.opacity = 1;
    const r = tip.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }
  const hideTip = () => (tip.style.opacity = 0);
  function hover(node, html) {
    node.addEventListener("mousemove", (e) => showTip(e, html()));
    node.addEventListener("mouseleave", hideTip);
  }
  const linear = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
  function yAxis(s, y, ticks, x0, x1, f) {
    ticks.forEach((t) => {
      el("line", { x1: x0, x2: x1, y1: y(t), y2: y(t), stroke: "var(--grid)" }, s);
      text(s, x0 - 6, y(t) + 4, f(t), { "text-anchor": "end" });
    });
  }
  function niceMax(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v || 1)));
    return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v);
  }


  const C = D.categories, SY = D.share_year, Y = D.per_year, T0 = D.totals;
  const ci = (c) => C.indexOf(c);
  const share = (y, c) => SY.values[SY.index.indexOf(y)][ci(c)];
  const peak = (c) => Math.max(...SY.values.map((r) => r[ci(c)]));
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  // Four biggest categories get colours; the rest are Other.
  const topCats = C.slice().sort((a, b) => peak(b) - peak(a)).slice(0, 4);
  const colorOf = (c) => (topCats.includes(c) ? `var(--s${topCats.indexOf(c) + 1})` : "var(--other)");
  const legend = (id, items) =>
    ($(id).innerHTML = items.map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join(""));

  $("tiles").innerHTML = [
    [fmt.format(T0.upvotes), "upvotes"],
    [fmt.format(T0.written), "posts & comments I wrote"],
    [fmt.format(T0.downvotes), "downvotes"],
  ].map(([v, l]) => `<div class="tile"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");

  function bars(id, labels, vals, f, opts = {}) {
    const W = 900, H = 220, L = 48, R = 8, T = 10, B = 24;
    const s = svg(id, W, H);
    const max = opts.max || niceMax(Math.max(...vals));
    const y = linear(0, max, H - B, T);
    yAxis(s, y, [0, max / 2, max], L, W - R, f);
    const bw = (W - L - R) / vals.length;
    vals.forEach((v, i) => {
      const x = L + i * bw;
      el("rect", { x: x + bw * 0.2, y: y(v), width: bw * 0.6, height: H - B - y(v), rx: 2, fill: opts.color || "var(--s1)" }, s);
      const hit = el("rect", { x, y: T, width: bw, height: H - B - T, fill: "transparent" }, s);
      hover(hit, () => `<b>${labels[i]}</b><br>${opts.tip(v)}`);
      text(s, x + bw / 2, H - 6, labels[i], { "text-anchor": "middle" });
    });
  }

  // ---- 01 stacked share by year ----------------------------------------------
  (function stack() {
    const names = topCats.concat(["Other"]);
    const colors = names.map(colorOf);
    const rows = SY.values.map((row) => {
      const top = topCats.map((c) => row[ci(c)]);
      return top.concat([Math.max(0, 1 - sum(top))]);
    });
    legend("stack-legend", names.map((n, i) => [n, colors[i]]));
    const W = 900, H = 300, L = 44, R = 8, T = 8, B = 28;
    const s = svg("stack", W, H);
    const bw = (W - L - R) / rows.length;
    const y = linear(0, 1, H - B, T);
    yAxis(s, y, [0, 0.5, 1], L, W - R, (t) => pct(t));
    rows.forEach((row, i) => {
      const x = L + i * bw + 2;
      let acc = 0;
      row.forEach((v, j) => {
        const y0 = y(acc), y1 = y(acc + v);
        acc += v;
        el("rect", { x, y: y1 + 1, width: bw - 4, height: Math.max(0, y0 - y1 - 2), fill: colors[j] }, s);
      });
      const hit = el("rect", { x: L + i * bw, y: T, width: bw, height: H - B - T, fill: "transparent" }, s);
      hover(hit, () => `<b>${SY.index[i]}</b><br>` + names.map((n, j) =>
        `<span class="chip" style="background:${colors[j]}"></span>${n} <span class="m">${pct(row[j])}</span>`).join("<br>"));
      text(s, x + bw / 2, H - 8, String(SY.index[i]), { "text-anchor": "middle" });
    });
  })();

  // ---- 02 upvotes per year -----------------------------------------------------
  bars("ups", Y.index.map(String), Y.upvotes, (t) => fmt.format(t / 1000) + "k", { tip: (v) => fmt.format(v) + " upvotes" });

  const ratio = Y.upvotes.map((u, i) => (Y.written[i] ? u / Y.written[i] : 0));
  bars("ratio", Y.index.map(String), ratio, (t) => fmt.format(Math.round(t)), {
    color: "var(--s2)", tip: (v) => `${fmt.format(Math.round(v))} upvotes per post/comment`,
  });

  // ---- 03 subscribed share ----------------------------------------------------
  const SB = D.subscribed;
  bars("subs", SB.index.map(String), SB.share, (t) => pct(t), { max: 1, color: "var(--s3)", tip: (v) => pct(v) + " of upvotes" });

  // ---- 04 upvotes vs writing ----------------------------------------------------
  (function mix() {
    const M = D.mix;
    const series = [["Upvotes", M.upvotes, "var(--s1)"], ["Posts & comments", M.written, "var(--s2)"]];
    legend("mix-legend", series.map(([n, , c]) => [n, c]));
    const cats = C.filter((c) => M.upvotes[ci(c)] >= 0.05 || M.written[ci(c)] >= 0.05)
      .sort((a, b) => M.upvotes[ci(b)] - M.upvotes[ci(a)]);
    const W = 900, rowH = 34, L = 170, R = 50, H = cats.length * rowH;
    const s = svg("mixchart", W, H);
    const x = linear(0, Math.max(...series.flatMap(([, v]) => cats.map((c) => v[ci(c)]))), L, W - R);
    cats.forEach((c, i) => {
      const yy = i * rowH;
      text(s, L - 8, yy + 20, c, { "text-anchor": "end", class: "lbl" });
      series.forEach(([, v, color], j) => {
        const w = x(v[ci(c)]) - L;
        el("rect", { x: L, y: yy + 5 + j * 12, width: Math.max(1, w), height: 10, rx: 2, fill: color }, s);
        text(s, L + w + 6, yy + 14 + j * 12, pct(v[ci(c)]));
      });
    });
  })();

  // ---- findings (computed so they stay in sync with the data) ---------------
  const maxUp = Math.max(...Y.upvotes);
  $("f-interests").innerHTML = `<b>Memes gave way to streamers, then to viral clips.</b> Memes were ${pct(share(2017, "Memes & Humor"))} of my upvotes in 2017 and ${pct(share(2024, "Memes & Humor"))} by 2024. Streamer communities rose to ${pct(peak("Streamers & YouTubers"))} around 2021, then faded, and Interesting & Viral has led since 2023.`;
  $("f-lurking").innerHTML = `<b>I upvoted about ${fmt.format(Math.round(T0.upvotes / T0.written))} times for every post or comment I wrote,</b> from ${fmt.format(Math.round(ratio[0]))} to 1 in 2017, when I wrote the most, to ${fmt.format(Math.round(Math.max(...ratio)))} to 1 in ${Y.index[ratio.indexOf(Math.max(...ratio))]}. I downvoted fewer than 1 time in 300. Upvotes peaked in ${Y.index[Y.upvotes.indexOf(maxUp)]} at ${fmt.format(maxUp)}.`;
  $("f-feed").innerHTML = `<b>More of my upvotes went to subreddits I follow.</b> ${pct(SB.share[0])} in 2017, ${pct(Math.max(...SB.share))} by 2022.`;
  const g = ci("Gaming");
  $("f-mix").innerHTML = `<b>I upvote viral stuff, but I write about games.</b> Gaming is ${pct(D.mix.upvotes[g])} of my upvotes but ${pct(D.mix.written[g])} of what I wrote.`;
})();
