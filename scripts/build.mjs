// scripts/build.mjs
// Renders every section of the profile as an animated SVG, in a light and a dark
// variant, from scripts/content.mjs. When a GitHub token is present it also pulls
// live stats (languages, commits per month, repo count) into the telemetry panel
// and caches them in assets/stats.json, so a tokenless local run still renders.
//
//   node scripts/build.mjs                       # uses cached stats.json
//   GITHUB_TOKEN=... node scripts/build.mjs      # refreshes stats first
//
// Nothing here runs in the browser: GitHub renders SVGs inside <img>, which allows
// CSS and SMIL animation but no JavaScript and no external fonts.

import fs from "node:fs/promises";
import path from "node:path";
import { profile as P } from "./content.mjs";

const API = "https://api.github.com";
const OUT = "assets";
const SANS = `-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`;

const THEMES = {
  light: { ink: "#0b1020", muted: "#5b6475", dim: "#9aa3b2", rule: "#d9dee7", ghost: "#e9ecf3", card: "#ffffff", cardLine: "#dfe4ec", accent: "#302df4", accent2: "#001df5", soft: "#eceeff", live: "#16a34a", bar: "#0b1020", grid: "#302df4" },
  dark:  { ink: "#e6edf3", muted: "#8b949e", dim: "#5d6673", rule: "#2a313b", ghost: "#161b22", card: "#0d1117", cardLine: "#2a313b", accent: "#7a7aff", accent2: "#302df4", soft: "#15172b", live: "#3fb950", bar: "#e6edf3", grid: "#7a7aff" },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dl = (s) => `style="animation-delay:${s}s"`;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ---------------------------------------------------------------- shared CSS
function baseStyle(t) {
  return `<style>
    .sans{font-family:${SANS}} .mono{font-family:${MONO}}
    .rise{opacity:0;animation:rise .8s cubic-bezier(.2,.7,.2,1) forwards}
    @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    .fade{opacity:0;animation:fade .7s ease forwards}
    @keyframes fade{to{opacity:1}}
    .draw{stroke-dasharray:1000;stroke-dashoffset:1000;animation:draw 1.4s cubic-bezier(.6,0,.2,1) forwards}
    @keyframes draw{to{stroke-dashoffset:0}}
    .grow{transform:scaleX(0);animation:grow 1.1s cubic-bezier(.2,.7,.2,1) forwards}
    @keyframes grow{to{transform:scaleX(1)}}
    .up{transform:scaleY(0);animation:up 1s cubic-bezier(.2,.7,.2,1) forwards}
    @keyframes up{to{transform:scaleY(1)}}
    .ping{animation:ping 2.4s ease-out infinite}
    @keyframes ping{0%{transform:scale(.4);opacity:.9}80%,100%{transform:scale(2.8);opacity:0}}
    .pulse{animation:pulse 2.4s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
    .blink{animation:blink 1.1s steps(2,start) infinite}
    @keyframes blink{to{visibility:hidden}}
    .flow{stroke-dasharray:5 9;animation:flow 1.1s linear infinite}
    @keyframes flow{to{stroke-dashoffset:-14}}
    .rot{opacity:0;animation:rot 16s linear infinite}
    @keyframes rot{0%{opacity:0}1.5%{opacity:1}22%{opacity:1}25%{opacity:0}100%{opacity:0}}
    .type{animation:type 2.6s steps(44,end) .9s forwards;transform:scaleX(0)}
    @keyframes type{to{transform:scaleX(1)}}
    .packet{animation:packet 3.2s cubic-bezier(.4,0,.2,1) infinite}
    @keyframes packet{0%{transform:translateX(0);opacity:0}6%{opacity:1}94%{opacity:1}100%{transform:translateX(540px);opacity:0}}
    .drift{animation:drift 30s linear infinite}
    @keyframes drift{to{transform:translate(32px,32px)}}
    @media (prefers-reduced-motion:reduce){
      .rise,.fade,.draw,.grow,.up,.ping,.pulse,.blink,.flow,.rot,.type,.packet,.drift{animation:none}
      .rise,.fade{opacity:1} .draw{stroke-dashoffset:0} .grow{transform:scaleX(1)} .up{transform:scaleY(1)}
      .ping,.packet{opacity:0} .rot{opacity:0} .rot.first{opacity:1} .type{transform:scaleX(1)}
    }
  </style>`;
}

// A thin rule with a short accent "comet" travelling along it. Borrowed from the
// animated-divider idea, stripped down to one line and one colour.
function comet(t, { x1, x2, y, dur = 4.5, delay = 0, width = 1 }) {
  const len = x2 - x1;
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${t.rule}" stroke-width="${width}"/>
  <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${t.accent}" stroke-width="${width + 0.5}" stroke-linecap="round" stroke-dasharray="90 ${len + 200}" opacity=".9">
    <animate attributeName="stroke-dashoffset" values="${len + 290};0" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
  </line>`;
}

function svgOpen(w, h, label) {
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}">`;
}

// ---------------------------------------------------------------- sections
function header(t) {
  const roles = P.roles.map((r, i) =>
    `<text class="sans rot${i === 0 ? " first" : ""}" ${dl(2 + i * 4)} x="48" y="222" font-size="20" fill="${t.muted}">${esc(r)}</text>`).join("\n");
  const typed = `> ${P.typed}`;
  const site = P.companyUrl.replace(/^https?:\/\//, "").replace(/\/$/, "").toUpperCase();
  return `${svgOpen(1000, 430, `${P.name} — ${P.title}, ${P.city}`)}
  ${baseStyle(t)}
  <defs>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M32 0H0V32" stroke="${t.grid}" stroke-opacity=".07" fill="none"/>
    </pattern>
    <linearGradient id="fadeR" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="white" stop-opacity="0"/><stop offset=".35" stop-color="white" stop-opacity="1"/><stop offset="1" stop-color="white" stop-opacity="1"/>
    </linearGradient>
    <mask id="gridMask"><rect x="0" y="0" width="1000" height="430" fill="url(#fadeR)"/></mask>
    <clipPath id="typeClip"><rect class="type" x="48" y="250" width="720" height="40" style="transform-origin:48px 0"/></clipPath>
  </defs>

  <g class="fade" ${dl(0.1)} mask="url(#gridMask)"><rect class="drift" x="-64" y="-64" width="1128" height="558" fill="url(#grid)"/></g>

  <!-- corner frame -->
  <path class="draw" ${dl(0.2)} d="M952 58 V 32 H 926" stroke="${t.accent}" stroke-width="1.5"/>
  <path class="draw" ${dl(0.2)} d="M48 372 V 398 H 74" stroke="${t.accent}" stroke-width="1.5"/>

  ${comet(t, { x1: 48, x2: 952, y: 58, dur: 5, delay: 1.2 })}
  <g class="fade" ${dl(0.3)}>
    <text class="mono" x="48" y="44" font-size="11" letter-spacing="3.5" fill="${t.muted}">${esc(P.company.toUpperCase())} — FOUNDER &amp; LEAD ENGINEER</text>
    <text class="mono" x="900" y="44" font-size="11" letter-spacing="3.5" fill="${t.muted}" text-anchor="end">${esc(P.cityShort)} — ${esc(P.coords)}</text>
    <circle class="ping" cx="916" cy="40" r="4" stroke="${t.live}" fill="none" style="transform-origin:916px 40px"/>
    <circle cx="916" cy="40" r="3" fill="${t.live}"/>
  </g>

  <g class="rise" ${dl(0.5)}>
    <text class="sans" x="46" y="170" font-size="68" font-weight="700" letter-spacing="-2" fill="${t.ink}">${esc(P.name)}</text>
  </g>
  ${roles}

  <!-- typed terminal line -->
  <g class="fade" ${dl(0.8)}>
    <rect x="48" y="252" width="720" height="36" rx="6" fill="${t.soft}"/>
    <g clip-path="url(#typeClip)">
      <text class="mono" x="62" y="275" font-size="13.5" fill="${t.accent}">${esc(typed)}</text>
    </g>
    <rect class="blink" x="${62 + typed.length * 8.15}" y="263" width="7" height="16" fill="${t.accent}" opacity=".9"/>
  </g>

  <g class="fade" ${dl(1.3)}>
    <text class="mono" x="48" y="328" font-size="12" letter-spacing="1" fill="${t.dim}">FOCUS ▸</text>
    <text class="mono" x="128" y="328" font-size="12" letter-spacing="1" fill="${t.ink}">Business websites · SEO · SaaS platforms · Mobile apps · Payments</text>
  </g>
  <g class="fade" ${dl(1.5)}>
    <text class="mono" x="48" y="352" font-size="12" letter-spacing="1" fill="${t.dim}">OPEN TO ▸</text>
    <text class="mono" x="128" y="352" font-size="12" letter-spacing="1" fill="${t.ink}">Freelance · Contract · Partnerships · Founders with a real idea</text>
  </g>

  <line class="draw" ${dl(1.6)} x1="48" y1="372" x2="952" y2="372" stroke="${t.rule}"/>
  <g class="fade" ${dl(1.9)}>
    <text class="mono" x="48" y="404" font-size="11.5" letter-spacing="3" fill="${t.muted}">LARAVEL</text>
    <text class="mono" x="150" y="404" font-size="11.5" fill="${t.accent}">·</text>
    <text class="mono" x="172" y="404" font-size="11.5" letter-spacing="3" fill="${t.muted}">REACT</text>
    <text class="mono" x="254" y="404" font-size="11.5" fill="${t.accent}">·</text>
    <text class="mono" x="276" y="404" font-size="11.5" letter-spacing="3" fill="${t.muted}">REACT NATIVE</text>
    <text class="mono" x="440" y="404" font-size="11.5" fill="${t.accent}">·</text>
    <text class="mono" x="462" y="404" font-size="11.5" letter-spacing="3" fill="${t.muted}">WORDPRESS</text>
    <text class="mono" x="952" y="404" font-size="11.5" letter-spacing="3" fill="${t.muted}" text-anchor="end">${esc(site)}</text>
  </g>
</svg>`;
}

function sectionLabel(t, n, label, pathHint) {
  return `${svgOpen(1000, 92, `Section ${n} — ${label}`)}
  ${baseStyle(t)}
  <g class="fade" ${dl(0.1)}>
    <text class="mono" x="48" y="68" font-size="52" fill="${t.ghost}">${n}</text>
    <text class="mono" x="128" y="58" font-size="14" letter-spacing="6" fill="${t.accent}">${esc(label)}</text>
    <text class="mono" x="952" y="58" font-size="11" letter-spacing="2" fill="${t.muted}" text-anchor="end">${esc(pathHint)}</text>
  </g>
  <line class="draw" ${dl(0.2)} x1="${128 + label.length * 15.5 + 24}" y1="53" x2="${952 - pathHint.length * 8 - 24}" y2="53" stroke="${t.rule}"/>
</svg>`;
}

function whoami(t) {
  const lines = P.whoami.lines.map((l, i) =>
    `<text class="sans rise" ${dl(0.1 + i * 0.15)} x="48" y="${30 + i * 28}" font-size="15.5" fill="${i === 2 ? t.muted : t.ink}">${esc(l)}</text>`).join("\n");
  const rows = P.whoami.rows.map(([k, v], i) =>
    `<g class="rise" ${dl(0.6 + i * 0.15)}>
      <text class="mono" x="48" y="${148 + i * 34}" font-size="11" letter-spacing="2.5" fill="${t.muted}">${esc(k)}  ▸</text>
      <text class="sans" x="154" y="${148 + i * 34}" font-size="15" fill="${i === 1 ? t.accent : t.ink}">${esc(v)}</text>
    </g>`).join("\n");
  return `${svgOpen(1000, 240, "Who I am: founder of ArmGenius, what I build, how I build, where I am")}
  ${baseStyle(t)}
  ${lines}
  ${comet(t, { x1: 48, x2: 952, y: 116, dur: 6, delay: 0.8 })}
  ${rows}
</svg>`;
}

// One card per project so each one can be a link in the README.
function projectCard(t, p, i) {
  const desc = p.desc.map((d, j) => `<text class="sans" x="30" y="${64 + j * 17}" font-size="12" fill="${t.muted}">${esc(d)}</text>`).join("");
  const dot = p.live
    ? `<circle class="ping" cx="30" cy="124" r="4" stroke="${t.live}" fill="none" style="transform-origin:30px 124px"/><circle cx="30" cy="124" r="3" fill="${t.live}"/>`
    : `<circle cx="30" cy="124" r="3" fill="${t.dim}"/>`;
  return `${svgOpen(320, 150, `${p.name}: ${p.desc.join(" ")} ${p.stack}. ${p.status}`)}
  ${baseStyle(t)}
  <g class="rise" ${dl(0.1 + i * 0.12)}>
    <rect x="1" y="1" width="318" height="148" rx="12" fill="${t.card}" stroke="${t.cardLine}"/>
    <rect class="up" x="1" y="18" width="3" height="114" rx="1.5" fill="${t.accent}" style="transform-origin:0 18px;animation-delay:${0.4 + i * 0.12}s"/>
    <text class="sans" x="30" y="40" font-size="18" font-weight="700" letter-spacing="-.3" fill="${t.ink}">${esc(p.name)}</text>
    ${p.url ? `<text class="mono" x="292" y="38" font-size="12" fill="${t.dim}" text-anchor="end">↗</text>` : ""}
    ${desc}
    <text class="mono" x="30" y="104" font-size="10" letter-spacing="1" fill="${t.dim}">${esc(p.stack)}</text>
    ${dot}
    <text class="mono" x="44" y="128" font-size="9.5" letter-spacing="2" fill="${p.live ? t.live : t.muted}">${esc(p.status)}</text>
  </g>
</svg>`;
}

function telemetry(t, S) {
  const langs = S.languages.slice(0, 6);
  const maxPct = Math.max(...langs.map((l) => l.pct), 1);
  const langRows = langs.map((l, i) => {
    const w = Math.max(4, Math.round((l.pct / maxPct) * 230));
    const y = 100 + i * 36;
    return `<text class="sans" x="48" y="${y}" font-size="11.5" fill="${t.ink}">${esc(l.name)}</text>
      <rect class="grow" x="48" y="${y + 8}" width="${w}" height="5" rx="2.5" fill="${i === 0 ? t.accent : t.bar}" style="transform-origin:48px 0;animation-delay:${0.3 + i * 0.12}s" opacity="${i === 0 ? 1 : 0.55}"/>
      <text class="mono" x="${48 + w + 10}" y="${y + 14}" font-size="10" fill="${t.muted}">${l.pct.toFixed(1)}%</text>`;
  }).join("\n");

  const months = S.months;
  const maxM = Math.max(...months.map((m) => m.count), 1);
  const baseY = 262, chartH = 150, x0 = 392, step = 23;
  const bars = months.map((m, i) => {
    const h = Math.max(2, Math.round((m.count / maxM) * chartH));
    const x = x0 + i * step;
    const last = i === months.length - 1;
    return `<rect class="up" x="${x}" y="${baseY - h}" width="12" height="${h}" rx="2" fill="${last ? t.accent : t.bar}" opacity="${last ? 1 : 0.5}" style="transform-origin:0 ${baseY}px;animation-delay:${(0.4 + i * 0.07).toFixed(2)}s"/>
      <text class="mono" x="${x + 6}" y="${baseY + 16}" font-size="9" fill="${t.dim}" text-anchor="middle">${esc(m.label)}</text>`;
  }).join("\n");
  const peak = months.reduce((a, b) => (b.count > a.count ? b : a), months[0] || { count: 0, label: "" });

  const counters = [
    [S.repoCount, S.scope === "all" ? "REPOSITORIES · ALL" : "PUBLIC REPOSITORIES"],
    [S.commits12m, "COMMITS · 12 MONTHS"],
    [P.counters.productsLive, "PRODUCTS IN PRODUCTION"],
    [3, `PLATFORMS — ${P.counters.platforms}`],
  ].map(([n, label], i) =>
    `<g class="rise" ${dl(0.5 + i * 0.2)}>
      <text class="mono" x="720" y="${118 + i * 60}" font-size="40" fill="${i === 1 ? t.accent : t.ink}">${esc(n)}</text>
      <text class="mono" x="${720 + String(n).length * 24 + 16}" y="${112 + i * 60}" font-size="10" letter-spacing="2" fill="${t.muted}">${esc(label)}</text>
    </g>`).join("\n");

  return `${svgOpen(1000, 340, "Telemetry: language distribution, commits per month, counters. Refreshed hourly.")}
  ${baseStyle(t)}
  <line x1="48" y1="40" x2="952" y2="40" stroke="${t.rule}"/>
  <text class="mono" x="48" y="28" font-size="11" letter-spacing="3.5" fill="${t.muted}">TELEMETRY — WHAT THE HANDS ARE DOING</text>
  <text class="mono" x="952" y="28" font-size="11" letter-spacing="3.5" fill="${t.muted}" text-anchor="end">LIVE · ${esc(S.updated.slice(0, 10))}</text>
  <line x1="360" y1="64" x2="360" y2="300" stroke="${t.rule}" opacity=".5"/>
  <line x1="688" y1="64" x2="688" y2="300" stroke="${t.rule}" opacity=".5"/>

  <text class="mono" x="48" y="78" font-size="10" letter-spacing="2.5" fill="${t.dim}">LANGUAGE DISTRIBUTION · BY BYTES</text>
  ${langRows}

  <text class="mono" x="392" y="78" font-size="10" letter-spacing="2.5" fill="${t.dim}">COMMITS · LAST 12 MONTHS</text>
  <line x1="392" y1="${baseY}" x2="656" y2="${baseY}" stroke="${t.rule}"/>
  ${bars}
  <text class="mono fade" ${dl(1.4)} x="392" y="300" font-size="10" letter-spacing="1.5" fill="${t.muted}">peak — <tspan fill="${t.accent}">${esc(peak.label)} · ${esc(peak.count)}</tspan></text>

  ${counters}
  <text class="mono" x="952" y="326" font-size="9" letter-spacing="1.5" fill="${t.dim}" text-anchor="end">REFRESHED HOURLY BY GITHUB ACTIONS</text>
</svg>`;
}

function stack(t) {
  const rows = P.stack.map(([k, v], i) =>
    `<g class="rise" ${dl(0.1 + i * 0.1)}>
      <text class="mono" x="48" y="${32 + i * 30}" font-size="12" letter-spacing="2" fill="${t.muted}">${esc(k)}</text>
      <text class="sans" x="154" y="${32 + i * 30}" font-size="15" fill="${t.ink}">${esc(v)}</text>
    </g>`).join("\n");
  const n = P.pipeline.length;
  const centers = [230, 500, 770];
  const nodes = P.pipeline.map((label, i) => {
    const cx = centers[i];
    return `<g class="rise" ${dl(1 + i * 0.25)}>
      <rect x="${cx - 80}" y="296" width="160" height="40" rx="20" fill="${t.card}" stroke="${i === 0 ? t.accent : t.cardLine}" stroke-width="${i === 0 ? 1.5 : 1}"/>
      <text class="mono" x="${cx}" y="321" font-size="11.5" letter-spacing="2.5" fill="${t.ink}" text-anchor="middle">${esc(label)}</text>
    </g>`;
  }).join("\n");
  const links = centers.slice(0, n - 1).map((cx, i) =>
    `<line class="flow" x1="${cx + 82}" y1="316" x2="${centers[i + 1] - 82}" y2="316" stroke="${t.dim}" stroke-width="1.2"/>`).join("\n");
  return `${svgOpen(1000, 380, "Stack: backend, web, mobile, websites, payments, infra, tooling. One Laravel API feeding React web and Expo mobile.")}
  ${baseStyle(t)}
  <line x1="138" y1="8" x2="138" y2="${20 + P.stack.length * 30}" stroke="${t.rule}" opacity=".4"/>
  ${rows}
  ${comet(t, { x1: 48, x2: 952, y: 262, dur: 6, delay: 1 })}
  <text class="mono fade" ${dl(0.9)} x="48" y="284" font-size="10" letter-spacing="2.5" fill="${t.dim}">ONE STACK, END TO END · ONE API FEEDS EVERY SCREEN</text>
  ${links}
  <circle class="packet" cx="${centers[0] + 86}" cy="316" r="3.5" fill="${t.accent}" style="animation-delay:1.6s"/>
  ${nodes}
  <g class="fade" ${dl(1.8)}>
    <text class="mono" x="230" y="358" font-size="9.5" letter-spacing="1.5" fill="${t.muted}" text-anchor="middle">AUTH · QUEUES · PAYMENTS · PUSH</text>
    <text class="mono" x="500" y="358" font-size="9.5" letter-spacing="1.5" fill="${t.muted}" text-anchor="middle">DASHBOARDS · CLIENT PORTALS</text>
    <text class="mono" x="770" y="358" font-size="9.5" letter-spacing="1.5" fill="${t.muted}" text-anchor="middle">DRIVER · CUSTOMER · STAFF APPS</text>
  </g>
</svg>`;
}

function footer(t) {
  const site = P.companyUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `${svgOpen(1000, 120, `${P.footer.status}. ${site} · ${P.email}`)}
  ${baseStyle(t)}
  ${comet(t, { x1: 48, x2: 952, y: 24, dur: 5 })}
  <circle class="ping" cx="60" cy="66" r="5" stroke="${t.live}" fill="none" style="transform-origin:60px 66px"/>
  <circle class="pulse" cx="60" cy="66" r="4" fill="${t.live}"/>
  <text class="mono rise" ${dl(0.2)} x="82" y="62" font-size="12" letter-spacing="3" fill="${t.ink}">${esc(P.footer.status)}</text>
  <text class="sans rise" ${dl(0.4)} x="82" y="84" font-size="12.5" fill="${t.muted}">${esc(P.footer.sub)}</text>
  <text class="mono fade" ${dl(0.6)} x="952" y="66" font-size="13" text-anchor="end" fill="${t.muted}">${esc(site)}  ·  ${esc(P.email)}</text>
  <text class="mono fade" ${dl(0.8)} x="952" y="86" font-size="11" text-anchor="end" fill="${t.dim}">${esc(P.city)}  ·  © ${new Date().getFullYear()} ${esc(P.company)}</text>
</svg>`;
}

// ---------------------------------------------------------------- stats
async function fetchStats() {
  const token = process.env.GH_STATS_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return null;
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": `${P.username}-profile` };
  const list = async (url) => {
    let out = [], page = 1;
    for (;;) {
      const r = await fetch(`${url}${url.includes("?") ? "&" : "?"}per_page=100&page=${page}`, { headers });
      if (!r.ok) throw new Error(`${url} → ${r.status}`);
      const b = await r.json();
      if (!Array.isArray(b) || b.length === 0) break;
      out = out.concat(b);
      if (b.length < 100) break;
      page++;
    }
    return out;
  };

  // Private repos are counted only when the token is a personal token for this user.
  let repos, scope = "public";
  try {
    const me = await (await fetch(`${API}/user`, { headers })).json();
    if (me.login?.toLowerCase() !== P.username.toLowerCase()) throw new Error("token belongs to another user");
    repos = await list(`${API}/user/repos?affiliation=owner`);
    scope = "all";
  } catch {
    repos = await list(`${API}/users/${P.username}/repos?type=owner`);
  }
  repos = repos.filter((r) => !r.fork);

  const bytes = {};
  for (const r of repos) {
    const res = await fetch(r.languages_url, { headers });
    if (!res.ok) continue;
    for (const [lang, n] of Object.entries(await res.json())) bytes[lang] = (bytes[lang] || 0) + n;
  }
  const total = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
  const languages = Object.entries(bytes).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, pct: (n / total) * 100 }));

  // Contributions per month via GraphQL. Falls back to zeros if the token cannot.
  let months = null, commits12m = 0;
  try {
    const q = `query($login:String!){ user(login:$login){ contributionsCollection{ totalCommitContributions restrictedContributionsCount contributionCalendar{ weeks{ contributionDays{ date contributionCount } } } } } }`;
    const r = await fetch(`${API}/graphql`, { method: "POST", headers, body: JSON.stringify({ query: q, variables: { login: P.username } }) });
    const j = await r.json();
    const cc = j.data?.user?.contributionsCollection;
    if (!cc) throw new Error(JSON.stringify(j.errors || j).slice(0, 200));
    const byMonth = new Map();
    for (const w of cc.contributionCalendar.weeks) for (const d of w.contributionDays) {
      const k = d.date.slice(0, 7);
      byMonth.set(k, (byMonth.get(k) || 0) + d.contributionCount);
    }
    const keys = [...byMonth.keys()].sort().slice(-12);
    months = keys.map((k) => ({ label: "JFMAMJJASOND"[Number(k.slice(5, 7)) - 1], count: byMonth.get(k) }));
    commits12m = cc.totalCommitContributions + (cc.restrictedContributionsCount || 0);
  } catch (e) {
    console.warn("GraphQL contributions unavailable:", e.message);
  }

  return {
    updated: new Date().toISOString(),
    scope,
    repoCount: repos.length,
    languages,
    months: months || Array.from({ length: 12 }, (_, i) => ({ label: "JFMAMJJASOND"[(new Date().getMonth() - 11 + i + 12) % 12], count: 0 })),
    commits12m,
  };
}

async function loadStats() {
  const cachePath = path.join(OUT, "stats.json");
  let fresh = null;
  try { fresh = await fetchStats(); } catch (e) { console.warn("Live stats failed, using cache:", e.message); }
  if (fresh) {
    await fs.mkdir(OUT, { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(fresh, null, 2));
    console.log(`stats: live (${fresh.scope}), ${fresh.repoCount} repos, ${fresh.commits12m} commits/12mo`);
    return fresh;
  }
  try {
    const cached = JSON.parse(await fs.readFile(cachePath, "utf8"));
    console.log("stats: cached from", cached.updated);
    return cached;
  } catch {
    console.log("stats: none available, rendering placeholders");
    return { updated: new Date().toISOString(), scope: "public", repoCount: 0, commits12m: 0, languages: [{ name: "PHP", pct: 0 }], months: Array.from({ length: 12 }, (_, i) => ({ label: "JFMAMJJASOND"[i], count: 0 })) };
  }
}

// ---------------------------------------------------------------- main
const S = await loadStats();
await fs.mkdir(path.join(OUT, "dark"), { recursive: true });

const files = {
  "header.svg": header,
  "s01.svg": (t) => sectionLabel(t, "01", "WHOAMI", "~/01-whoami"),
  "whoami.svg": whoami,
  "s02.svg": (t) => sectionLabel(t, "02", "SHIPPED", "~/02-shipped"),
  "s03.svg": (t) => sectionLabel(t, "03", "TELEMETRY", "~/03-telemetry"),
  "telemetry.svg": (t) => telemetry(t, S),
  "s04.svg": (t) => sectionLabel(t, "04", "STACK", "~/04-stack"),
  "stack.svg": stack,
  "s05.svg": (t) => sectionLabel(t, "05", "CONTACT", "~/05-contact"),
  "footer.svg": footer,
};
P.projects.forEach((p, i) => { files[`p-${slug(p.name)}.svg`] = (t) => projectCard(t, p, i); });

// GitHub shows a broken image for any SVG that is not well-formed XML, so refuse
// to write one. Duplicate attributes are the mistake this generator can make.
function assertWellFormed(svg, name) {
  for (const tag of svg.matchAll(/<([a-zA-Z][\w:-]*)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*\/?>/g)) {
    const attrs = [...tag[2].matchAll(/\s([\w:-]+)=/g)].map((m) => m[1]);
    const dupe = attrs.find((a, i) => attrs.indexOf(a) !== i);
    if (dupe) throw new Error(`${name}: duplicate attribute "${dupe}" on <${tag[1]}>`);
  }
  const bare = svg.match(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/);
  if (bare) throw new Error(`${name}: unescaped "&" near "${svg.slice(bare.index, bare.index + 30)}"`);
}

let count = 0;
for (const [name, render] of Object.entries(files)) {
  for (const [theme, t] of Object.entries(THEMES)) {
    const file = theme === "dark" ? path.join(OUT, "dark", name) : path.join(OUT, name);
    const svg = render(t).trim() + "\n";
    assertWellFormed(svg, file);
    await fs.writeFile(file, svg);
    count++;
  }
}
console.log(`rendered ${count} SVGs into ${OUT}/ and ${OUT}/dark/`);
