'use strict';
/* =========================================================
   MISTÉRIO NO AURORA — jogo de dedução online (P2P via PeerJS)
   O anfitrião guarda o estado oficial; os outros só mandam ações.
   ========================================================= */

/* ---------------- DADOS DO JOGO ---------------- */
const N = 24; // tabuleiro 24x24

const SUSPECTS = [
  { id: 'cap', name: 'Capitão Edmundo Vargas', short: 'O Capitão', color: '#2f5aa8', hat: 'cap', skin: '#d9b08c', hair: '#9a9a9a',
    bio: 'Comanda o Aurora há vinte anos. Perdeu o próprio navio numa aposta com a vítima.' },
  { id: 'con', name: 'Condessa Lúcia Albuquerque', short: 'A Condessa', color: '#a3242c', hat: 'tiara', skin: '#f0d2b6', hair: '#3b2116',
    bio: 'Nobreza falida, joias emprestadas. Era noiva da vítima até ontem.' },
  { id: 'doc', name: 'Dr. Henrique Salgado', short: 'O Médico', color: '#2e7d4f', hat: 'glasses', skin: '#e6c3a0', hair: '#2b2b2b',
    bio: 'Médico de bordo. Assinou receitas demais de láudano.' },
  { id: 'can', name: 'Íris Delamare', short: 'A Cantora', color: '#6f42a8', hat: 'feather', skin: '#c98e66', hair: '#111111',
    bio: 'Estrela do salão de baile. A vítima guardava cartas que podiam arruiná-la.' },
  { id: 'bar', name: 'Barão Otto Klein', short: 'O Barão', color: '#c9a227', hat: 'tophat', skin: '#efcfae', hair: '#c8b27a',
    bio: 'Rival nos negócios. Embarcou de última hora, sem bagagem.' },
  { id: 'mar', name: 'Joana Ribeiro', short: 'A Camareira', color: '#d0661c', hat: 'beret', skin: '#b97a52', hair: '#4a2a14',
    bio: 'Camareira da primeira classe. Arrumava a cabine da vítima e viu algo que não devia.' },
];

const WEAPONS = [
  { id: 'arp', name: 'Arpão', with: 'o Arpão', icon: '🔱' },
  { id: 'sex', name: 'Sextante de Latão', with: 'o Sextante de Latão', icon: '🧭' },
  { id: 'cha', name: 'Garrafa de Champanhe', with: 'a Garrafa de Champanhe', icon: '🍾' },
  { id: 'cor', name: 'Corda de Amarração', with: 'a Corda de Amarração', icon: '🪢' },
  { id: 'pis', name: 'Pistola Sinalizadora', with: 'a Pistola Sinalizadora', icon: '🔫' },
  { id: 'lau', name: 'Frasco de Láudano', with: 'o Frasco de Láudano', icon: '🧪' },
];

// rect = [linha0, col0, linha1, col1] (inclusivo); doors = casas de corredor que dão acesso
const ROOMS = [
  { id: 'P', name: 'Ponte de Comando', in: 'na Ponte de Comando', icon: '☸️', tint: '#24384d', rect: [0, 0, 5, 6], doors: [[6, 3], [2, 7]] },
  { id: 'B', name: 'Biblioteca', in: 'na Biblioteca', icon: '📚', tint: '#4f3220', rect: [0, 9, 5, 14], doors: [[6, 11], [3, 8], [3, 15]] },
  { id: 'E', name: 'Enfermaria', in: 'na Enfermaria', icon: '🩺', tint: '#2f5e5e', rect: [0, 17, 4, 23], doors: [[5, 20], [2, 16]] },
  { id: 'C', name: 'Cassino', in: 'no Cassino', icon: '🎰', tint: '#1d4a31', rect: [9, 0, 14, 5], doors: [[8, 2], [11, 6], [15, 3]] },
  { id: 'S', name: 'Salão de Baile', in: 'no Salão de Baile', icon: '💃', tint: '#5c1f2e', rect: [9, 9, 14, 14], doors: [[8, 11], [11, 8], [12, 15], [15, 12]] },
  { id: 'R', name: 'Restaurante', in: 'no Restaurante', icon: '🍽️', tint: '#5e421c', rect: [8, 18, 14, 23], doors: [[7, 20], [11, 17], [15, 21]] },
  { id: 'M', name: 'Sala de Máquinas', in: 'na Sala de Máquinas', icon: '⚙️', tint: '#353535', rect: [18, 0, 23, 6], doors: [[17, 3], [20, 7]] },
  { id: 'V', name: 'Convés de Popa', in: 'no Convés de Popa', icon: '🌊', tint: '#1c3b5a', rect: [18, 9, 23, 14], doors: [[17, 11], [21, 8], [21, 15]] },
  { id: 'K', name: 'Cabine de Luxo', in: 'na Cabine de Luxo', icon: '🛏️', tint: '#44264b', rect: [19, 17, 23, 23], doors: [[18, 20], [21, 16]] },
];
const PASSAGES = { P: 'K', K: 'P', E: 'M', M: 'E' }; // dutos de serviço
// escotilhas de corredor: atravessam o navio em 1 passo
const TUNNELS = [{ id: 'I', a: [0, 8], b: [23, 15], color: '#3fc8d4', ctrl: [3, 13] }, { id: 'II', a: [6, 0], b: [17, 23], color: '#d27ae6', ctrl: [13, 21] }];
const tunnelOf = {}; TUNNELS.forEach(t => { tunnelOf[t.a.join(',')] = t; tunnelOf[t.b.join(',')] = t; });
const tunnelMap = {};
TUNNELS.forEach(t => { tunnelMap[t.a.join(',')] = t.b.join(','); tunnelMap[t.b.join(',')] = t.a.join(','); });
const STARTS = { cap: [0, 7], con: [0, 16], doc: [7, 23], can: [23, 16], bar: [23, 7], mar: [16, 0] };

// eventos do navio: duram uma rodada
const EVENTS = {
  storm: { icon: '⛈️', name: 'Tempestade', text: t => `Ondas fortes lacraram a escotilha ${t}. Ninguém passa por ela nesta rodada.` },
  blackout: { icon: '🕯️', name: 'Apagão', text: () => 'As luzes dos corredores apagaram. Ninguém anda mais de 4 casas nesta rodada.' },
  calm: { icon: '🌅', name: 'Mar calmo', text: () => 'O navio desliza sem balanço. Todo mundo anda 2 casas a mais nesta rodada.' },
  ducts: { icon: '🚧', name: 'Dutos interditados', text: () => 'A tripulação fechou os dutos de serviço das salas de canto nesta rodada.' },
};
const closedTunnels = ev => ev && ev.key === 'storm' ? [ev.tunnel] : [];
const diceSum = d => (d || []).reduce((a, b) => a + b, 0);
const S = Object.fromEntries(SUSPECTS.map(x => [x.id, x]));
const W = Object.fromEntries(WEAPONS.map(x => [x.id, x]));
const ROOM = Object.fromEntries(ROOMS.map(x => [x.id, x]));
const SUSP_IDX = Object.fromEntries(SUSPECTS.map((x, i) => [x.id, i]));
const ALL_CARDS = [...SUSPECTS.map(x => 's:' + x.id), ...WEAPONS.map(x => 'w:' + x.id), ...ROOMS.map(x => 'r:' + x.id)];

/* ---------------- TABULEIRO ---------------- */
const roomAt = {};
ROOMS.forEach(rm => { const [r0, c0, r1, c1] = rm.rect; for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) roomAt[r + ',' + c] = rm.id; });
const doorMap = {};
ROOMS.forEach(rm => rm.doors.forEach(([r, c]) => { (doorMap[r + ',' + c] = doorMap[r + ',' + c] || []).push(rm.id); }));
const isHall = (r, c) => r >= 0 && c >= 0 && r < N && c < N && !roomAt[r + ',' + c];

function neighbors(k, occ, closed = []) {
  const res = [];
  if (k.startsWith('room:')) {
    for (const [r, c] of ROOM[k.slice(5)].doors) { const kk = r + ',' + c; if (!occ.has(kk)) res.push(kk); }
    return res;
  }
  const [r, c] = k.split(',').map(Number);
  for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const rr = r + dr, cc = c + dc;
    if (isHall(rr, cc) && !occ.has(rr + ',' + cc)) res.push(rr + ',' + cc);
  }
  for (const id of (doorMap[k] || [])) res.push('room:' + id);
  if (tunnelMap[k] && !occ.has(tunnelMap[k]) && !closed.includes(tunnelOf[k].id)) res.push(tunnelMap[k]);
  return res;
}

// casas alcançáveis com até `steps` passos; entrar numa sala encerra o movimento
function reachable(pos, sid, steps, closed = []) {
  const occ = new Set();
  for (const [k, p] of Object.entries(pos)) if (k !== sid && p.r != null) occ.add(p.r + ',' + p.c);
  const st = pos[sid];
  const startKey = st.room ? 'room:' + st.room : st.r + ',' + st.c;
  const dist = { [startKey]: 0 }, prev = {}, out = {}, q = [startKey];
  while (q.length) {
    const k = q.shift(), d = dist[k];
    if (d > 0) out[k] = d;
    if (k !== startKey && k.startsWith('room:')) continue;
    if (d === steps) continue;
    for (const n of neighbors(k, occ, closed)) if (dist[n] == null) { dist[n] = d + 1; prev[n] = k; q.push(n); }
  }
  return { out, prev };
}

/* ---------------- UTIL ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => { const b = new Uint32Array(1); crypto.getRandomValues(b); return b[0] % n; };
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[rnd(a.length)];
const rid = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[b % 24]).join('');
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
  del(k) { try { localStorage.removeItem(k); } catch { } },
};
let ME = (() => { try { let t = sessionStorage.getItem('aurora-token'); if (!t) { t = rid(); sessionStorage.setItem('aurora-token', t); } return t; } catch { return rid(); } })();
function setMe(t) { ME = t; try { sessionStorage.setItem('aurora-token', t); } catch { } }

function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

/* ---------------- ARTE ---------------- */
function portrait(s) {
  return `<img class="portrait" src="img/s-${s.id}.jpg" alt="${esc(s.name)}" style="--c:${s.color}" loading="lazy">`;
}

function cardData(id) {
  const [t, k] = id.split(':');
  if (t === 's') return { kind: 's', type: 'Suspeito', name: S[k].name, art: portrait(S[k]), color: S[k].color };
  if (t === 'w') return { kind: 'w', type: 'Arma', name: W[k].name, art: `<img src="img/w-${k}.jpg" alt="" loading="lazy">` };
  return { kind: 'r', type: 'Local', name: ROOM[k].name, art: `<img src="img/room-${k}.jpg" alt="" loading="lazy">` };
}
function cardHTML(id, cls = '', attrs = '') {
  const d = cardData(id);
  return `<div class="card card-${d.kind} ${cls}" data-card="${id}" ${attrs}>
    <div class="card-type">${d.type}</div><div class="card-art">${d.art}</div><div class="card-name">${esc(d.name)}</div></div>`;
}
const cardBack = (cls = '') => `<div class="card card-back ${cls}"><div class="back-emblem">A</div></div>`;

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const dieHTML = n => Array.from({ length: 9 }, (_, i) => `<i class="${n && PIPS[n].includes(i) ? 'on' : ''}"></i>`).join('');

/* ---------------- SOM (sintetizado, sem arquivos) ---------------- */
const Sound = {
  ctx: null, muted: store.get('aurora-muted', false), sea: null,
  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7; this.master.connect(this.ctx.destination);
      } catch { return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  setMuted(m) { this.muted = m; store.set('aurora-muted', m); if (this.master) this.master.gain.value = m ? 0 : 0.7; },
  noise() {
    if (this._nb) return this._nb;
    const len = this.ctx.sampleRate * 2, b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return (this._nb = b);
  },
  burst(t, dur, freq, q, gain) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  tone(freq, t, dur, type = 'sine', gain = 0.2, attack = 0.01) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  ok() { return !!this.ctx; },
  dice() { if (!this.ok()) return; const t = this.ctx.currentTime; for (let i = 0; i < 11; i++) this.burst(t + i * 0.055 + Math.random() * 0.02, 0.05, 2200 + Math.random() * 2600, 4, 0.55); this.burst(t + 0.66, 0.09, 1600, 3, 0.7); },
  step() { if (!this.ok()) return; this.burst(this.ctx.currentTime, 0.045, 700 + Math.random() * 200, 5, 0.3); },
  card() { if (!this.ok()) return; const t = this.ctx.currentTime; this.burst(t, 0.2, 3200, 0.8, 0.35); this.burst(t + 0.07, 0.14, 1400, 1, 0.25); },
  sting() {
    if (!this.ok()) return; const t = this.ctx.currentTime;
    [110, 130.8, 155.6, 185].forEach((f, i) => this.tone(f, t + i * 0.03, 1.8, 'sawtooth', 0.04, 0.06));
    this.tone(55, t, 2, 'sine', 0.3, 0.02);
  },
  horn() {
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime, lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 480; lp.connect(this.master);
    [[0, 1.5], [1.8, 2.4]].forEach(([st, en]) => [98, 147, 196].forEach(f => {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + st); g.gain.exponentialRampToValueAtTime(0.11, t + st + 0.15);
      g.gain.setValueAtTime(0.11, t + en - 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + en);
      o.connect(g).connect(lp); o.start(t + st); o.stop(t + en + 0.05);
    }));
  },
  win() { if (!this.ok()) return; const t = this.ctx.currentTime; [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.15, 0.7, 'triangle', 0.16)); },
  lose() { if (!this.ok()) return; const t = this.ctx.currentTime; [392, 370, 349, 262].forEach((f, i) => this.tone(f, t + i * 0.32, 0.6, 'triangle', 0.14)); },
  ding() { if (!this.ok()) return; const t = this.ctx.currentTime; this.tone(1318, t, 0.6, 'sine', 0.12); this.tone(1760, t + 0.12, 0.8, 'sine', 0.1); },
  pop() { if (!this.ok()) return; const t = this.ctx.currentTime; this.tone(880, t, 0.12, 'sine', 0.08); this.tone(1320, t + 0.05, 0.12, 'sine', 0.06); },
  // ---- jazz dos anos 20: baixo caminhando, piano "charleston", prato e vassourinha, em swing
  music: null,
  setMusic(on) {
    this.unlock(); if (!this.ctx) return;
    if (on && !this.music) {
      const c = this.ctx, bus = c.createGain(); bus.gain.value = 0.55; bus.connect(this.master);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.connect(bus);
      const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
      const BPM = 116, beat = 60 / BPM, swing = beat * 2 / 3;
      // ii-V-I-VI em Fá, depois ii-V-I com turnaround
      const BARS = [
        { bass: [43, 45, 46, 47], chord: [58, 62, 65] },   // Gm7
        { bass: [48, 52, 43, 40], chord: [58, 64, 67] },   // C7
        { bass: [41, 45, 48, 49], chord: [57, 60, 64] },   // Fmaj7
        { bass: [50, 42, 45, 44], chord: [54, 60, 64] },   // D7
        { bass: [43, 46, 50, 49], chord: [58, 62, 65] },   // Gm7
        { bass: [48, 46, 45, 43], chord: [58, 64, 69] },   // C9
        { bass: [41, 48, 45, 40], chord: [57, 60, 64] },   // F6
        { bass: [48, 47, 46, 42], chord: [58, 64, 67] },   // C7
      ];
      const melody = [[0, 72], [1.67, 74], [2, 77], [3, 76], [9, 79], [10, 77], [10.67, 74], [11, 72], [17, 69], [17.67, 72], [18, 74], [19, 72], [24, 77], [25, 76], [26, 74], [26.67, 72], [27, 69]];
      const pluck = (f, t, dur, type, g, out) => { const o = c.createOscillator(), e = c.createGain(); o.type = type; o.frequency.value = f; e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.012); e.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(e).connect(out); o.start(t); o.stop(t + dur + 0.05); };
      const hiss = (t, dur, freq, type, g) => { const sN = c.createBufferSource(), f = c.createBiquadFilter(), e = c.createGain(); sN.buffer = this.noise(); f.type = type; f.frequency.value = freq; e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(0.0001, t + dur); sN.connect(f).connect(e).connect(bus); sN.start(t, Math.random()); sN.stop(t + dur + 0.05); };
      let next = c.currentTime + 0.1, step = 0; const total = BARS.length * 4;
      const tick = () => {
        while (next < c.currentTime + 0.25) {
          const bar = BARS[Math.floor(step / 4) % BARS.length], b = step % 4, t = next;
          pluck(mtof(bar.bass[b] - 12) * 2, t, beat * 0.95, 'triangle', 0.22, lp);                      // baixo
          hiss(t, 0.18, 8000, 'highpass', 0.035);                                                       // prato
          if (b === 1 || b === 3) { hiss(t + swing, 0.1, 8000, 'highpass', 0.025); hiss(t, 0.16, 2200, 'bandpass', 0.05); } // swing + vassourinha
          if (b === 0) bar.chord.forEach(m => pluck(mtof(m), t, 0.35, 'triangle', 0.045, lp));        // piano no 1
          if (b === 1) bar.chord.forEach(m => pluck(mtof(m), t + swing, 0.3, 'triangle', 0.04, lp));  // e no "e" do 2
          melody.filter(([at]) => Math.floor(at) === step % total).forEach(([at, m]) => pluck(mtof(m), t + (at % 1) * beat, beat * 0.9, 'sine', 0.05, lp));
          next += beat; step++;
        }
      };
      tick(); this.music = { timer: setInterval(tick, 60), bus };
    } else if (!on && this.music) {
      clearInterval(this.music.timer); const g = this.music.bus.gain; g.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      const bus = this.music.bus; setTimeout(() => bus.disconnect(), 800); this.music = null;
    }
  },
  setSea(on) {
    this.unlock(); if (!this.ctx) return;
    if (on && !this.sea) {
      const c = this.ctx, len = c.sampleRate * 4, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
      const src = c.createBufferSource(); src.buffer = b; src.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      const g = c.createGain(); g.gain.value = 0.22;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.11; const lg = c.createGain(); lg.gain.value = 0.16;
      lfo.connect(lg).connect(g.gain); src.connect(lp).connect(g).connect(this.master); src.start(); lfo.start();
      this.sea = { src, lfo };
    } else if (!on && this.sea) { this.sea.src.stop(); this.sea.lfo.stop(); this.sea = null; }
  },
};

/* ---------------- NARRAÇÃO (voz do navegador) ---------------- */
const Voice = {
  on: store.get('aurora-voice', false),
  voice() { const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || []; return vs.find(v => /pt[-_]BR/i.test(v.lang)) || vs.find(v => /^pt/i.test(v.lang)) || null; },
  say(text) {
    if (!this.on || !window.speechSynthesis) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'pt-BR'; const v = this.voice(); if (v) u.voice = v; u.rate = 1.02; u.pitch = 0.9; speechSynthesis.speak(u); } catch { }
  },
  toggle() { this.on = !this.on; store.set('aurora-voice', this.on); if (this.on) this.say('Narração ligada.'); else if (window.speechSynthesis) speechSynthesis.cancel(); return this.on; },
};

/* ---------------- ANFITRIÃO (estado oficial) ---------------- */
const PEER_PREFIX = 'misterio-aurora-v1-';
const HOST_LOST = '⚓ O anfitrião caiu ou fechou a página. A partida está pausada e continua de onde parou quando ele voltar (ele abre o site e clica em "Retomar a partida"). Tentando reconectar sozinho…';
const REACTIONS = ['😱', '🤔', '😏', '😂', '👏', '🙄', '🤫', '🔥'];
const PEER_OPTS = { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] } };

class Host {
  constructor(code, saved, myName) {
    this.code = code; this.conns = {}; this.retries = 0; this.lastSeen = {};
    this.st = saved || { code, phase: 'lobby', hostId: ME, players: [], log: [], seq: 1, priv: {} };
    this.st.settings = Object.assign({ refuteSecs: 60, dice: 2, events: true, autoEnd: true }, this.st.settings || {});
    this.st.scores = this.st.scores || {};
    this.st.spectators = this.st.spectators || [];
    if (!saved) { this.st.players.push({ id: ME, name: myName, suspect: null, out: false }); this.log(`${myName} abriu a sala.`); }
    // anfitrião voltou com alguém devendo carta: retoma o relógio
    if (saved && saved.pending && saved.pending.deadline) this.armRefuteTimer();
  }
  open(onReady, onFail) {
    this.peer = new Peer(PEER_PREFIX + this.code, PEER_OPTS);
    this.peer.on('open', () => { this.retries = 0; this.watchPresence(); if (onReady) { onReady(); onReady = null; } });
    this.peer.on('connection', conn => this.wire(conn));
    this.peer.on('disconnected', () => setTimeout(() => { if (!this.peer.destroyed) try { this.peer.reconnect(); } catch { } }, 2000));
    this.peer.on('error', err => {
      if (err.type === 'unavailable-id') {
        if (this.retries++ < 10) { App.setStatus('Reabrindo a sala… (o código ainda está preso no servidor)'); this.peer.destroy(); setTimeout(() => this.open(onReady, onFail), 3000); }
        else onFail && onFail('Esse código de sala está em uso.');
      } else if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) App.setStatus('Problema de conexão com o servidor. Tentando de novo…');
      else console.warn('peer', err.type, err);
    });
  }
  wire(conn) {
    conn.on('data', m => {
      if (!m || typeof m !== 'object') return;
      if (conn.pid) this.lastSeen[conn.pid] = Date.now();
      if (m.type === 'ping') return;
      if (m.type === 'join') { this.lastSeen[String(m.token || '').slice(0, 40)] = Date.now(); return this.join(conn, m); }
      if (conn.pid) this.act(conn.pid, m);
    });
    conn.on('close', () => {
      if (!conn.pid || this.conns[conn.pid] !== conn) return;
      delete this.conns[conn.pid];
      const st = this.st, P = this.player(conn.pid);
      if (!P) { const V = st.spectators.find(v => v.id === conn.pid); if (V) { st.spectators = st.spectators.filter(v => v !== V); this.broadcast(); } return; }
      if (st.phase === 'lobby') { st.players = st.players.filter(p => p !== P); this.log(`${P.name} saiu da sala.`); }
      else {
        // o vigia de presença registra a saída e resolve pendências
      }
      this.broadcast();
    });
  }
  join(conn, m) {
    const st = this.st, token = String(m.token || '').slice(0, 40);
    const name = String(m.name || '').trim().slice(0, 18) || 'Detetive';
    if (!token) return;
    let P = this.player(token);
    if (!P) {
      if (st.phase !== 'lobby') {
        let V = st.spectators.find(v => v.id === token);
        if (!V) { V = { id: token, name }; st.spectators.push(V); this.log(`${name} está assistindo a partida. 👁`); }
        const old = this.conns[token]; if (old && old !== conn) { old.pid = null; try { old.close(); } catch { } }
        conn.pid = token; this.conns[token] = conn;
        return this.broadcast();
      }
      if (st.players.length >= 6) return conn.send({ type: 'reject', reason: 'A sala está cheia (6 detetives).' });
      P = { id: token, name, suspect: null, out: false }; st.players.push(P); this.log(`${name} subiu a bordo.`);
    } else { if (st.phase === 'lobby') P.name = name; }
    const old = this.conns[token];
    if (old && old !== conn) { old.pid = null; try { old.close(); } catch { } }
    conn.pid = token; this.conns[token] = conn;
    this.broadcast();
  }
  player(id) { return this.st.players.find(p => p.id === id); }
  cur() { return this.st.players[this.st.turn]; }
  isOnline(id) { return id === ME || !!(this.conns[id] && this.conns[id].open && Date.now() - (this.lastSeen[id] || 0) < 10000); }
  // confere a presença de todo mundo a cada 2s (fechar a aba às vezes demora a derrubar a conexão)
  watchPresence() {
    clearInterval(this._presence);
    this._presence = setInterval(() => {
      for (const conn of Object.values(this.conns)) if (conn.open) try { conn.send({ type: 'ping' }); } catch { }
      const st = this.st, now = {}; let changed = false;
      st.players.forEach(p => { now[p.id] = this.isOnline(p.id); });
      const was = this._wasOnline || now;
      for (const id in now) if (was[id] !== now[id]) {
        changed = true; const P = this.player(id);
        if (P && st.phase !== 'lobby') this.log(now[id] ? `${P.name} voltou à mesa.` : `${P.name} desconectou.`);
      }
      this._wasOnline = now;
      if (st.phase === 'play' && st.pending && st.pending.askingId && !now[st.pending.askingId]) {
        const id = st.pending.askingId; this._offSince = this._offSince || {};
        this._offSince[id] = this._offSince[id] || Date.now();
        if (Date.now() - this._offSince[id] > 8000) { this.autoRefute(); this._offSince = {}; changed = true; }
      } else this._offSince = {};
      if (changed) this.broadcast();
    }, 2000);
  }
  log(text, kind = 'sys', extra) {
    const st = this.st; st.log.push({ id: st.seq++, kind, text, ...(extra || {}) });
    if (st.log.length > 250) st.log.splice(0, st.log.length - 250);
  }

  act(pid, m) {
    const st = this.st, t = m.type;
    const P = this.player(pid), V = !P && (st.spectators || []).find(v => v.id === pid);
    if (!P && !V) return;
    if (t === 'chat') {
      const text = String(m.text || '').trim().slice(0, 200);
      const who = P || V;
      if (text) st.log.push({ id: st.seq++, kind: 'chat', who: who.name + (V ? ' 👁' : ''), color: P && P.suspect ? S[P.suspect].color : '#9a8a6a', text });
      return this.broadcast();
    }
    if (t === 'react') {
      const now = Date.now(); this._lastReact = this._lastReact || {};
      if (!REACTIONS.includes(m.e) || now - (this._lastReact[pid] || 0) < 1200) return;
      this._lastReact[pid] = now;
      st.react = { id: st.seq++, by: pid, e: m.e };
      return this.broadcast();
    }
    if (!P) return; // espectador só conversa e reage
    if (t === 'settings' && pid === st.hostId && st.phase === 'lobby') {
      if (m.refuteSecs != null) { const secs = Number(m.refuteSecs); if ([0, 30, 60, 90, 120].includes(secs)) st.settings.refuteSecs = secs; }
      if (m.dice != null && [1, 2].includes(Number(m.dice))) st.settings.dice = Number(m.dice);
      if (m.events != null) st.settings.events = !!m.events;
      if (m.autoEnd != null) st.settings.autoEnd = !!m.autoEnd;
      return this.broadcast();
    }
    if (t === 'skip' && pid === st.hostId && st.phase === 'play') {
      const C = this.cur();
      if (C && C.id !== ME && !this.isOnline(C.id)) {
        if (st.pending) { if (st.pending.askingId) this.autoRefute(); }
        this.log(`O anfitrião pulou a vez de ${C.name} (desconectado).`); this.nextTurn();
      }
      return this.broadcast();
    }
    if (st.phase === 'lobby') {
      if (t === 'pick') {
        if (m.suspect && !S[m.suspect]) return;
        if (m.suspect && st.players.some(p => p.id !== pid && p.suspect === m.suspect)) return;
        P.suspect = m.suspect || null;
      } else if (t === 'start' && pid === st.hostId && st.players.length >= 2) this.startGame();
      return this.broadcast();
    }
    if (st.phase === 'over') { if (t === 'newgame' && pid === st.hostId) this.toLobby(); return this.broadcast(); }

    if (t === 'refute') {
      const pd = st.pending, ask = st.priv[pid] && st.priv[pid].ask;
      if (pd && pd.askingId === pid && ask && ask.cards.includes(m.card)) this.resolveRefute(pid, m.card);
      return this.broadcast();
    }
    if (!this.cur() || this.cur().id !== pid || st.pending) return;
    const ts = st.ts, sid = P.suspect, pos = st.pos[sid];

    if (t === 'roll') {
      if (ts.rolled || ts.moved) return;
      const nd = st.settings.dice === 1 ? 1 : 2, d = Array.from({ length: nd }, () => 1 + rnd(6));
      let steps = diceSum(d), mod = '';
      if (st.event && st.event.key === 'calm') { steps += 2; mod = ' (+2 mar calmo)'; }
      if (st.event && st.event.key === 'blackout' && steps > 4) { steps = 4; mod = ' (máx. 4 no apagão)'; }
      ts.dice = d; ts.steps = steps; ts.diceId = st.seq++; ts.rolled = true;
      const { out, prev } = reachable(st.pos, sid, steps, closedTunnels(st.event));
      ts.reach = Object.keys(out); st._prev = prev;
      this.log(`${P.name} rolou ${d.join(' + ')}${d.length > 1 ? ' = ' + diceSum(d) : ''}${mod}.`, 'roll');
      if (!ts.reach.length) { this.log(`${P.name} está encurralado e não pode se mover.`); ts.moved = true; }
    } else if (t === 'move') {
      if (!ts.rolled || ts.moved || !ts.reach.includes(m.key)) return;
      const path = []; let k = m.key;
      while (k && st._prev[k] !== undefined) { path.unshift(k); k = st._prev[k]; }
      if (m.key.startsWith('room:')) {
        const r = m.key.slice(5); st.pos[sid] = { room: r }; ts.entered = true;
        this.log(`${P.name} entrou ${ROOM[r].in}.`, 'move');
      } else { const [r, c] = m.key.split(',').map(Number); st.pos[sid] = { r, c }; }
      ts.moved = true; ts.reach = [];
      st.anim = { id: st.seq++, sid, path };
    } else if (t === 'passage') {
      if (ts.rolled || ts.moved || !pos.room || !PASSAGES[pos.room] || (st.event && st.event.key === 'ducts')) return;
      const dest = PASSAGES[pos.room]; st.pos[sid] = { room: dest };
      ts.rolled = ts.moved = ts.entered = true; ts.reach = [];
      st.anim = { id: st.seq++, sid, path: ['room:' + dest] };
      this.log(`${P.name} desceu pelo duto de serviço e saiu ${ROOM[dest].in}.`, 'move');
    } else if (t === 'suggest') {
      if (!pos.room || ts.suggested || !(ts.entered || !ts.moved)) return;
      if (!S[m.s] || !W[m.w]) return;
      const r = pos.room;
      ts.suggested = ts.rolled = ts.moved = true; ts.reach = [];
      if (m.s !== sid && st.pos[m.s].room !== r) {
        st.pos[m.s] = { room: r }; st.anim = { id: st.seq++, sid: m.s, path: ['room:' + r] };
        if (st.players.some(p => p.suspect === m.s)) st.summoned[m.s] = true;
      }
      st.wpos[m.w] = r;
      st.lastSug = { id: st.seq++, by: pid, s: m.s, w: m.w, r, result: null };
      (st.history = st.history || []).push({ id: st.lastSug.id, n: st.history.length + 1, by: pid, s: m.s, w: m.w, r, passed: [], shownBy: null, none: false, win: false });
      this.log(`${P.name} suspeita: ${S[m.s].name}, com ${W[m.w].with}, ${ROOM[r].in}.`, 'sug');
      const sol = st.solution;
      if (sol.s === m.s && sol.w === m.w && sol.r === r) {
        st.lastSug.result = { win: true }; st.phase = 'over'; st.winner = pid; this.hist().win = true;
        st.scores = st.scores || {}; st.scores[pid] = (st.scores[pid] || 0) + 1; st.scoreNames = st.scoreNames || {}; st.scoreNames[pid] = P.name;
        this.log(`O palpite de ${P.name} bate com o envelope! ${P.name} desvendou o crime!`, 'win');
      } else {
        const idx = st.players.findIndex(p => p.id === pid);
        st.pending = { by: pid, cards: ['s:' + m.s, 'w:' + m.w, 'r:' + r], start: idx, step: 0, askingId: null };
        this.advanceRefute();
      }
    } else if (t === 'end') {
      this.nextTurn();
    } else return;
    this.broadcast();
  }

  advanceRefute() {
    const st = this.st, pd = st.pending, n = st.players.length;
    while (++pd.step < n) {
      const p = st.players[(pd.start + pd.step) % n];
      const has = st.priv[p.id].hand.filter(c => pd.cards.includes(c));
      if (has.length) {
        pd.askingId = p.id; st.priv[p.id].ask = { cards: has, by: pd.by, all: pd.cards };
        const secs = (st.settings && st.settings.refuteSecs) || 0;
        pd.deadline = secs ? Date.now() + secs * 1000 : null; this.armRefuteTimer();
        this.log(`${p.name} tem algo a mostrar…`, 'ref');
        if (!this.isOnline(p.id)) this.autoRefute();
        return;
      }
      this.log(`${p.name} não pode refutar.`, 'ref'); this.hist().passed.push(p.id);
    }
    st.lastSug.result = { none: true }; st.pending = null; this.hist().none = true;
    this.log('Ninguém conseguiu refutar o palpite!', 'ref');
    this.scheduleAutoEnd();
  }
  hist() { const h = this.st.history || []; return h[h.length - 1] || { passed: [] }; }
  autoRefute(timeout) {
    const pd = this.st.pending; if (!pd || !pd.askingId) return;
    const ask = this.st.priv[pd.askingId].ask, P = this.player(pd.askingId);
    if (timeout) this.log(`⏰ O tempo de ${P.name} acabou: o jogo mostrou uma das cartas de ${P.name} por sorteio.`, 'ref');
    this.resolveRefute(pd.askingId, pick(ask.cards));
  }
  armRefuteTimer() {
    clearTimeout(this._refuteTimer);
    const pd = this.st.pending; if (!pd || !pd.deadline) return;
    const id = pd.askingId;
    this._refuteTimer = setTimeout(() => {
      const p2 = this.st.pending;
      if (p2 && p2.askingId === id && p2.deadline) { this.autoRefute(true); this.broadcast(); }
    }, Math.max(0, pd.deadline - Date.now()));
  }
  // depois que o palpite é respondido, a vez passa sozinha
  scheduleAutoEnd() {
    const st = this.st, sugId = st.lastSug && st.lastSug.id; if (!sugId || st.settings.autoEnd === false) return;
    st.ts.autoEnd = true;
    clearTimeout(this._autoEnd);
    this._autoEnd = setTimeout(() => {
      const s2 = this.st;
      if (s2.phase === 'play' && !s2.pending && s2.lastSug && s2.lastSug.id === sugId && s2.ts.suggested) { this.nextTurn(); this.broadcast(); }
    }, 4500);
  }
  resolveRefute(pid, card) {
    const st = this.st, pd = st.pending, P = this.player(pid), B = this.player(pd.by);
    st.priv[pid].ask = null;
    st.priv[pd.by].shown.push({ id: st.seq++, by: pid, card, sugId: st.lastSug.id });
    (st.priv[pid].gave = st.priv[pid].gave || []).push({ sugId: st.lastSug.id, card, to: pd.by });
    st.lastSug.result = { by: pid }; this.hist().shownBy = pid;
    clearTimeout(this._refuteTimer);
    this.log(`${P.name} mostrou uma carta em segredo para ${B.name}.`, 'ref');
    st.pending = null;
    this.scheduleAutoEnd();
  }

  startGame() {
    const st = this.st, n = st.players.length;
    const free = SUSPECTS.map(s => s.id).filter(id => !st.players.some(p => p.suspect === id));
    const freeShuf = shuffle(free);
    st.players.forEach(p => { if (!p.suspect) p.suspect = freeShuf.shift(); p.out = false; });
    st.players.sort((a, b) => SUSP_IDX[a.suspect] - SUSP_IDX[b.suspect]);
    st.solution = { s: pick(SUSPECTS).id, w: pick(WEAPONS).id, r: pick(ROOMS).id };
    const sol = st.solution;
    const deck = shuffle(ALL_CARDS.filter(c => c !== 's:' + sol.s && c !== 'w:' + sol.w && c !== 'r:' + sol.r));
    st.priv = {};
    st.players.forEach(p => { st.priv[p.id] = { hand: [], shown: [], ask: null, sol: null }; });
    // baralho único com as 18 cartas misturadas: cada um recebe o que vier, sem equilibrar categorias
    const first = rnd(n);
    deck.forEach((c, i) => st.priv[st.players[(first + i) % n].id].hand.push(c));
    st.pos = {}; SUSPECTS.forEach(s => { st.pos[s.id] = { r: STARTS[s.id][0], c: STARTS[s.id][1] }; });
    const rooms = shuffle(ROOMS.map(r => r.id)); st.wpos = {}; WEAPONS.forEach((w, i) => { st.wpos[w.id] = rooms[i]; });
    Object.assign(st, { history: [], event: null, round: 1, turnCount: 0, phase: 'play', gameId: rid(8), turn: Math.floor(Math.random() * n), summoned: {}, pending: null, lastSug: null, lastAcc: null, anim: null, winner: null });
    st.log = []; // diário e chat começam limpos a cada partida
    this.log('O Aurora apita. A investigação começou!', 'win');
    this.beginTurn();
  }
  beginTurn() {
    const st = this.st, P = this.cur();
    st.ts = { rolled: false, moved: false, entered: false, suggested: false, summoned: !!st.summoned[P.suspect], dice: (st.ts && st.ts.dice) || null, diceId: st.ts ? st.ts.diceId : 0, reach: [] };
    delete st.summoned[P.suspect]; st._prev = {};
    this.log(`Vez de ${P.name} (${S[P.suspect].short})`, 'turn', { sid: P.suspect });
  }
  nextTurn() {
    const st = this.st, n = st.players.length; let i = st.turn;
    for (let k = 0; k < n; k++) { i = (i + 1) % n; if (!st.players[i].out) break; }
    st.turn = i;
    st.turnCount = (st.turnCount || 0) + 1;
    if (st.turnCount % n === 0) this.newRound();
    this.beginTurn();
  }
  newRound() {
    const st = this.st; st.round = (st.round || 1) + 1;
    if (st.event) { this.log(`${EVENTS[st.event.key].icon} ${EVENTS[st.event.key].name} terminou.`); st.event = null; }
    if (!st.settings.events || Math.random() > 0.35) return;
    const key = pick(Object.keys(EVENTS)), ev = { id: st.seq++, key, round: st.round };
    if (key === 'storm') ev.tunnel = pick(TUNNELS).id;
    st.event = ev;
    this.log(`${EVENTS[key].icon} Evento do navio: ${EVENTS[key].name}! ${EVENTS[key].text(ev.tunnel)}`, 'event');
  }
  toLobby() {
    const st = this.st;
    st.players = st.players.filter(p => this.isOnline(p.id));
    st.players.forEach(p => { p.out = false; });
    (st.spectators || []).filter(v => this.isOnline(v.id)).forEach(v => { if (st.players.length < 6) st.players.push({ id: v.id, name: v.name, suspect: null, out: false }); });
    st.spectators = [];
    for (const k of ['event', 'round', 'turnCount', 'react', 'history', 'solution', 'pos', 'wpos', 'ts', 'pending', 'lastSug', 'lastAcc', 'anim', 'winner', 'summoned', '_prev', 'gameId']) delete st[k];
    st.priv = {}; st.phase = 'lobby';
    this.log('Nova partida: escolham seus personagens.');
  }
  view(pid) {
    const st = this.st, pub = { ...st };
    delete pub.solution; delete pub.priv; delete pub._prev;
    pub.log = st.log.slice(-90);
    pub.handCounts = {}; pub.online = {};
    st.players.forEach(p => { pub.handCounts[p.id] = (st.priv[p.id] && st.priv[p.id].hand.length) || 0; pub.online[p.id] = this.isOnline(p.id); });
    (st.spectators || []).forEach(v => { pub.online[v.id] = this.isOnline(v.id); });
    if (st.pending && st.pending.deadline) pub.pending = { ...st.pending, remainingMs: Math.max(0, st.pending.deadline - Date.now()) };
    if (st.phase === 'over') {
      pub.solution = st.solution;
      const sol = st.solution, H = st.history || [];
      const stats = {};
      st.players.forEach(p => { stats[p.id] = { hand: (st.priv[p.id] || {}).hand || [], asked: 0, showed: 0, passed: 0 }; });
      H.forEach(h => { if (stats[h.by]) stats[h.by].asked++; if (h.shownBy && stats[h.shownBy]) stats[h.shownBy].showed++; h.passed.forEach(x => { if (stats[x]) stats[x].passed++; }); });
      let closest = null;
      H.filter(h => !h.win).forEach(h => { const hits = (h.s === sol.s) + (h.w === sol.w) + (h.r === sol.r); if (!closest || hits > closest.hits) closest = { n: h.n, by: h.by, hits, s: h.s, w: h.w, r: h.r }; });
      pub.reveal = { stats, closest, total: H.length };
    }
    return { pub, priv: (st.priv && st.priv[pid]) || null };
  }
  broadcast() {
    for (const [pid, conn] of Object.entries(this.conns)) if (conn.open) { try { conn.send({ type: 'state', ...this.view(pid) }); } catch (e) { console.warn(e); } }
    store.set('aurora-host', { code: this.code, st: this.st, at: Date.now() });
    App.onState(this.view(ME));
  }
}

/* ---------------- CONVIDADO ---------------- */
class Client {
  constructor(code, name) { this.code = code; this.name = name; this.alive = true; this.everJoined = false; }
  open() {
    this.peer = new Peer(undefined, PEER_OPTS);
    this.peer.on('open', () => this.connect());
    this.peer.on('disconnected', () => { if (this.alive) setTimeout(() => { try { this.peer.reconnect(); } catch { } }, 2000); });
    this.peer.on('error', err => {
      if (err.type === 'peer-unavailable') {
        if (!this.everJoined) { App.fail('Sala não encontrada. Confira o código (e se o anfitrião está com a página aberta).'); this.close(); }
        else this.retry();
      } else if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) { App.setStatus('Problema de conexão. Tentando de novo…'); this.retry(); }
      else console.warn('peer', err.type, err);
    });
  }
  connect() {
    const c = this.peer.connect(PEER_PREFIX + this.code, { reliable: true, serialization: 'json' });
    this.conn = c;
    c.on('open', () => {
      c.send({ type: 'join', token: ME, name: this.name });
      this.lastHeard = Date.now();
      clearInterval(this._ping); this._ping = setInterval(() => {
        if (c.open) c.send({ type: 'ping' });
        // anfitrião sumiu sem fechar a conexão
        if (this.everJoined && Date.now() - this.lastHeard > 9000 && !this.hostLost) {
          this.hostLost = true; App.setStatus(HOST_LOST); try { c.close(); } catch { } this.retry();
        }
      }, 3000);
    });
    c.on('data', m => {
      if (!m) return;
      this.lastHeard = Date.now();
      if (m.type === 'ping') { if (this.hostLost) { this.hostLost = false; App.setStatus(null); } return; }
      if (m.type === 'state') {
        if (!this.everJoined) store.set('aurora-last', { code: this.code, token: ME, name: this.name, at: Date.now() });
        this.everJoined = true; this.hostLost = false; App.setStatus(null); App.onState(m);
      } else if (m.type === 'reject') { App.fail(m.reason); this.close(); }
    });
    c.on('close', () => { if (this.alive && this.conn === c) { this.hostLost = true; App.setStatus(HOST_LOST); this.retry(); } });
  }
  retry() {
    if (!this.alive || this.retrying) return; this.retrying = true;
    setTimeout(() => {
      this.retrying = false; if (!this.alive) return;
      if (this.peer.disconnected) { try { this.peer.reconnect(); } catch { } } else this.connect();
    }, 2500);
  }
  send(m) { if (this.conn && this.conn.open) this.conn.send(m); else toast('Sem conexão com o anfitrião…'); }
  close() { this.alive = false; try { this.peer.destroy(); } catch { } }
}

/* ---------------- APP ---------------- */
const App = {
  role: null, net: null, pub: null, priv: null,
  send(m) { Sound.unlock(); if (this.role === 'host') this.net.act(ME, m); else if (this.net) this.net.send(m); },
  onState({ pub, priv }) {
    const prev = this.pub; this.pub = pub; this.priv = priv;
    UI.deadline = pub.pending && pub.pending.remainingMs != null ? performance.now() + pub.pending.remainingMs : null;
    UI.update(prev);
  },
  fail(msg) { this.role = null; this.net = null; this.setStatus(null); UI.show('home'); $('#home-err').textContent = msg; },
  setStatus(msg) { const el = $('#conn-status'); if (!msg) el.classList.add('hidden'); else { el.textContent = msg; el.classList.remove('hidden'); } },
  me() { return this.pub && this.pub.players.find(p => p.id === ME); },
  mySid() { const m = this.me(); return m && m.suspect; },
  isHost() { return this.pub && this.pub.hostId === ME; },

  create(name, resume) {
    if (!window.Peer) return this.fail('Não consegui carregar a biblioteca de conexão (PeerJS). Verifique a internet.');
    let code, saved = null;
    if (resume) { code = resume.code; saved = resume.st; setMe(saved.hostId); } else code = newCode();
    this.role = 'host'; this.net = new Host(code, saved, name);
    $('#home-err').textContent = ''; this.setStatus('Abrindo a sala…');
    this.net.open(() => { this.setStatus(null); this.net.broadcast(); },
      msg => { if (!resume) { this.create(name); } else this.fail(msg); });
  },
  join(code, name, token) {
    if (!window.Peer) return this.fail('Não consegui carregar a biblioteca de conexão (PeerJS). Verifique a internet.');
    if (token) setMe(token);
    this.role = 'client'; this.net = new Client(code, name);
    $('#home-err').textContent = ''; this.setStatus('Procurando a sala ' + code + '…');
    this.net.open();
  },
};

/* ---------------- ANOTAÇÕES ---------------- */
const Notes = {
  key() { return 'aurora-notes-' + (App.pub && App.pub.gameId); },
  data() { if (this._k !== this.key()) { this._k = this.key(); this._d = store.get(this._k, {}); } return this._d; },
  save() { store.set(this._k, this._d); },
  get(card, col) { const d = this.data(); return (d[card] && d[card][col]) || ''; },
  set(card, col, v) { const d = this.data(); (d[card] = d[card] || {})[col] = v; this.save(); },
  cycle(card, col) { const order = ['', 'x', 'v', '?']; this.set(card, col, order[(order.indexOf(this.get(card, col)) + 1) % 4]); },
  autoMark(card, owner) {
    App.pub.players.forEach(p => { if (p.id === owner) this.set(card, p.id, 'v'); else if (!this.get(card, p.id)) this.set(card, p.id, 'x'); });
  },
  init() {
    const d = this.data(); if (d._init || !App.priv) return;
    App.priv.hand.forEach(c => this.autoMark(c, ME));
    (App.priv.shown || []).forEach(s => this.autoMark(s.card, s.by));
    d._init = true; this.save();
  },
  render() {
    const el = $('#notes'); if (!App.pub || App.pub.phase === 'lobby') return;
    const players = App.pub.players;
    const sym = { x: '✗', v: '✓', '?': '?' };
    const head = `<tr><th></th>${players.map(p => `<th title="${esc(p.name)}" style="--c:${S[p.suspect].color}" class="${p.id === ME ? 'me' : ''}">${esc(p.name.slice(0, 5))}</th>`).join('')}</tr>`;
    const section = (title, ids) => `<tr class="sec"><td colspan="${players.length + 1}">${title}</td></tr>` + ids.map(id => {
      const solved = players.every(p => this.get(id, p.id) === 'x');
      const d = cardData(id);
      return `<tr class="${solved ? 'solved' : ''}"><td class="nm">${solved ? '★ ' : ''}${esc(d.name)}</td>${players.map(p => { const v = this.get(id, p.id); return `<td class="mk m-${v === '?' ? 'q' : v} ${p.id === ME ? 'me' : ''}" data-nc="${id}" data-np="${p.id}">${sym[v] || ''}</td>`; }).join('')}</tr>`;
    }).join('');
    const oldPaper = el.querySelector('.notes-paper'), scroll = oldPaper ? oldPaper.scrollTop : 0;
    this._sig = this.sig();
    el.innerHTML = `<div class="notes-paper">
      <div class="notes-head"><h2>Caderno do detetive</h2><button class="icon-btn" data-close-notes>✕</button></div>
      <p class="notes-hint">Clique para marcar: <b>✗</b> não tem · <b>✓</b> tem · <b>?</b> talvez. Linha toda em ✗ = está no envelope ★</p>
      <table>${head}${section('Suspeitos', SUSPECTS.map(s => 's:' + s.id))}${section('Armas', WEAPONS.map(w => 'w:' + w.id))}${section('Locais', ROOMS.map(r => 'r:' + r.id))}</table>
      <textarea id="notes-free" placeholder="Rascunhos, suspeitas, quem perguntou o quê…">${esc(store.get(this.key() + '-free', ''))}</textarea>
    </div>`;
    el.querySelector('.notes-paper').scrollTop = scroll;
  },
  sig() { return App.pub ? App.pub.gameId + '|' + App.pub.players.map(p => p.id + p.suspect).join(',') : ''; },
  // marca só a célula clicada, sem redesenhar o caderno (não perde a posição)
  updateCell(td) {
    const id = td.dataset.nc, pid = td.dataset.np, v = this.get(id, pid);
    td.textContent = { x: '✗', v: '✓', '?': '?' }[v] || '';
    td.className = `mk m-${v === '?' ? 'q' : v}${pid === ME ? ' me' : ''}`;
    const tr = td.parentElement, solved = App.pub.players.every(p => this.get(id, p.id) === 'x');
    tr.classList.toggle('solved', solved);
    tr.querySelector('.nm').textContent = (solved ? '★ ' : '') + cardData(id).name;
  },
  toggle(force) { const el = $('#notes'); const open = force ?? !el.classList.contains('open'); el.classList.toggle('open', open); if (open) this.render(); },
};

/* ---------------- MODAL / BANNER ---------------- */
const Modal = {
  kind: null,
  open(html, { kind = 'info', persistent = false, cls = '' } = {}) {
    $('#modal-box').className = 'modal-box ' + cls; $('#modal-box').innerHTML = html;
    $('#modal').classList.remove('hidden'); this.kind = kind; this.persistent = persistent;
  },
  close() { $('#modal').classList.add('hidden'); $('#modal-box').innerHTML = ''; this.kind = null; this.persistent = false; },
};
function banner(html, ms = 4200) {
  const b = $('#banner'); b.innerHTML = html; b.classList.remove('hidden'); b.classList.remove('in'); void b.offsetWidth; b.classList.add('in');
  clearTimeout(banner._t); banner._t = setTimeout(() => b.classList.add('hidden'), ms);
}

/* ---------------- UI ---------------- */
const UI = {
  tab: 'sugs',
  settingRow(key, label, opts, val) {
    const cur = (opts.find(o => o[0] === val) || opts[0])[1];
    return `<label class="set-row"><span>${label}</span>${App.isHost()
      ? `<select data-setting="${key}">${opts.map(([v, t]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${t}</option>`).join('')}</select>`
      : `<b>${cur}</b>`}</label>`;
  },
  scoreboard(cls = '') {
    const pub = App.pub, sc = pub.scores || {}, names = pub.scoreNames || {};
    const ids = Object.keys(sc).filter(id => sc[id] > 0).sort((a, b) => sc[b] - sc[a]);
    if (!ids.length) return '';
    const nm = id => { const p = pub.players.find(x => x.id === id); return esc(p ? p.name : names[id] || '?') + (id === ME ? ' (você)' : ''); };
    return `<div class="scoreboard ${cls}"><h3>🏆 Placar da sala</h3><ol>${ids.map((id, i) => `<li class="${i === 0 ? 'lead' : ''}"><span>${i === 0 ? '👑 ' : ''}${nm(id)}</span><b>${sc[id]} ${sc[id] > 1 ? 'vitórias' : 'vitória'}</b></li>`).join('')}</ol></div>`;
  },
  boardBuilt: false, seen: null, animating: new Set(), target: {},
  show(id) {
    ['home', 'lobby', 'game'].forEach(s => $('#' + s).classList.toggle('hidden', s !== id));
    // endereço e título de cada etapa
    const pub = App.pub, code = pub && pub.code;
    let hash = '', title = 'Mistério no Aurora';
    if (id === 'lobby' && code) { hash = `#/sala/${code}/embarque`; title = `Embarque · Sala ${code} · Mistério no Aurora`; }
    else if (id === 'game' && code) {
      const over = pub.phase === 'over';
      hash = `#/sala/${code}/${over ? 'caso-encerrado' : 'investigacao'}`;
      title = `${over ? 'Caso encerrado' : 'Investigação'} · Sala ${code} · Mistério no Aurora`;
    }
    if (location.hash !== hash) history.replaceState(null, '', location.pathname + hash);
    document.title = title;
  },

  update(prev) {
    const pub = App.pub;
    if (pub.phase === 'lobby') { this.show('lobby'); this.renderLobby(); if (Modal.kind && Modal.kind !== 'help') Modal.close(); return; }
    this.show('game');
    if (!this.boardBuilt) this.buildBoard();
    const firstOfGame = !this.seen || this.seen.gameId !== pub.gameId;
    if (firstOfGame) {
      const sh = (App.priv && App.priv.shown) || [];
      this.seen = { event: pub.event && pub.event.id, react: pub.react && pub.react.id, gameId: pub.gameId, dice: pub.ts && pub.ts.diceId, anim: pub.anim && pub.anim.id, sug: pub.lastSug && pub.lastSug.id, acc: pub.lastAcc && pub.lastAcc.id, shown: sh.length ? sh[sh.length - 1].id : 0, wrong: !!(App.priv && App.priv.sol), over: pub.phase === 'over' ? pub.gameId : null, turn: null, logLen: 0 };
      if (prev && prev.phase === 'lobby') { Sound.horn(); }
      this.seenChats = pub.log.filter(e => e.kind === 'chat').length; this.seen.logLen = 0;
      if (!store.get('aurora-intro-' + pub.gameId)) { store.set('aurora-intro-' + pub.gameId, 1); this.introModal(); }
    }
    this.renderGame();
    this.events(firstOfGame);
    if ($('#notes').classList.contains('open') && Notes._sig !== Notes.sig()) Notes.render();
  },

  /* ----- sala de espera ----- */
  renderLobby() {
    const pub = App.pub, me = App.me();
    const link = location.origin + location.pathname + '#/sala/' + pub.code;
    const takenBy = {}; pub.players.forEach(p => { if (p.suspect) takenBy[p.suspect] = p; });
    $('#lobby-box').innerHTML = `
      <div class="poster-top">PORTÃO DE EMBARQUE</div>
      <h2 class="lobby-title">Sala <span class="code-big">${pub.code}</span></h2>
      <div class="share"><input readonly value="${esc(link)}" id="share-link"><button class="btn" data-copy>Copiar convite</button></div>
      <h3>Escolha seu personagem</h3>
      <div class="char-grid">${SUSPECTS.map(s => {
        const p = takenBy[s.id], mine = p && p.id === ME;
        return `<button class="char ${p ? 'taken' : ''} ${mine ? 'mine' : ''}" data-suspect="${s.id}" ${p && !mine ? 'disabled' : ''} style="--c:${s.color}">
          ${portrait(s)}<b>${esc(s.name)}</b><small>${esc(s.bio)}</small>${p ? `<span class="tag">${mine ? 'você' : esc(p.name)}</span>` : ''}</button>`;
      }).join('')}</div>
      <h3>A bordo (${pub.players.length}/6)</h3>
      <ul class="aboard">${pub.players.map(p => `<li><i class="dot ${pub.online[p.id] ? 'on' : ''}"></i>${esc(p.name)}${p.id === pub.hostId ? ' <em>anfitrião</em>' : ''}${p.suspect ? ` · <span style="color:${S[p.suspect].color}">${S[p.suspect].short}</span>` : ''}</li>`).join('')}</ul>
      <div class="settings"><h3>Regras da mesa</h3>
        ${UI.settingRow('refute', 'Tempo para mostrar carta', [[30, '30 segundos'], [60, '1 minuto'], [90, '1 min e meio'], [120, '2 minutos'], [0, 'Sem limite']], pub.settings.refuteSecs)}
        ${UI.settingRow('dice', 'Dados', [[2, '2 dados (2 a 12 casas)'], [1, '1 dado (1 a 6 casas)']], pub.settings.dice)}
        ${UI.settingRow('events', 'Eventos do navio', [[1, 'Ligados'], [0, 'Desligados']], pub.settings.events ? 1 : 0)}
        ${UI.settingRow('autoEnd', 'Passar a vez sozinho após o palpite', [[1, 'Sim'], [0, 'Não']], pub.settings.autoEnd ? 1 : 0)}
        <p class="hint">Tempo esgotado: o jogo mostra uma das cartas da pessoa por sorteio. Eventos: a cada rodada pode acontecer algo no navio (tempestade, apagão, mar calmo, dutos fechados).</p></div>
      ${UI.scoreboard()}
      ${App.isHost()
        ? `<button class="btn gold big" data-start ${pub.players.length < 2 ? 'disabled' : ''}>Zarpar! Começar a partida</button><p class="hint">Mínimo 2 jogadores, o ideal é de 3 a 6. Quem não escolher personagem recebe um aleatório.</p>`
        : `<p class="hint">Aguardando o anfitrião começar…</p>`}
      ${me ? '' : ''}`;
  },

  /* ----- tabuleiro ----- */
  buildBoard() {
    const pct = v => (v / N * 100) + '%';
    let html = '<div class="sea-edge"></div>';
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (isHall(r, c)) {
      html += `<div class="tile ${(r + c) % 2 ? 'alt' : ''}" style="left:${pct(c)};top:${pct(r)};width:${pct(1)};height:${pct(1)}"></div>`;
    }
    ROOMS.forEach(rm => {
      const [r0, c0, r1, c1] = rm.rect;
      html += `<div class="room room-${rm.id}" data-room="${rm.id}" style="left:${pct(c0)};top:${pct(r0)};width:${pct(c1 - c0 + 1)};height:${pct(r1 - r0 + 1)};--tint:${rm.tint};--photo:url(img/room-${rm.id}.jpg)">
        <div class="room-photo"></div><div class="room-name">${rm.name}</div><div class="room-weapons" id="rw-${rm.id}"></div>
        ${PASSAGES[rm.id] ? `<div class="passage" title="Duto de serviço para ${ROOM[PASSAGES[rm.id]].name}">⇲<span>duto → ${ROOM[PASSAGES[rm.id]].name}</span></div>` : ''}</div>`;
      rm.doors.forEach(([r, c]) => {
        let st;
        if (r < r0) st = `left:${pct(c)};top:${pct(r0)};width:${pct(1)};height:5px;transform:translateY(-50%)`;
        else if (r > r1) st = `left:${pct(c)};top:${pct(r1 + 1)};width:${pct(1)};height:5px;transform:translateY(-50%)`;
        else if (c < c0) st = `left:${pct(c0)};top:${pct(r)};width:5px;height:${pct(1)};transform:translateX(-50%)`;
        else st = `left:${pct(c1 + 1)};top:${pct(r)};width:5px;height:${pct(1)};transform:translateX(-50%)`;
        html += `<div class="door" style="${st}"></div>`;
      });
    });
    TUNNELS.forEach(t => [t.a, t.b].forEach(([r, c], i) => {
      const [or, oc] = i ? t.a : t.b;
      html += `<div class="tunnel" data-tunnel="${t.id}" style="left:${pct(c)};top:${pct(r)};width:${pct(1)};height:${pct(1)};--tc:${t.color}" title="Escotilha ${t.id}: entre aqui e saia na outra escotilha ${t.id}, do outro lado do navio, gastando só 1 passo"><span>${t.id}</span></div>`;
    }));
    // linhas que ligam cada par de escotilhas
    html += `<svg class="tunnel-links" viewBox="0 0 ${N} ${N}" preserveAspectRatio="none">${TUNNELS.map(t => {
      const [ay, ax] = t.a, [by, bx] = t.b, [cy, cx] = t.ctrl;
      return `<path data-link="${t.id}" d="M${ax + .5} ${ay + .5} Q${cx} ${cy} ${bx + .5} ${by + .5}" stroke="${t.color}"/>`;
    }).join('')}</svg>`;
    Object.entries(STARTS).forEach(([id, [r, c]]) => {
      html += `<div class="start" style="left:${pct(c)};top:${pct(r)};width:${pct(1)};height:${pct(1)};--c:${S[id].color}" title="Partida: ${S[id].name}"></div>`;
    });
    html += `<div class="compass">N<br>✦</div><div id="hl"></div><div id="pawns">${SUSPECTS.map(s => `<div class="pawn" id="pawn-${s.id}" style="--c:${s.color};--img:url(img/s-${s.id}.jpg)" title="${esc(s.name)}"><b class="pawn-tag"></b></div>`).join('')}</div>`;
    $('#board').innerHTML = html;
    this.boardBuilt = true;
  },
  cellXY(r, c) { return { x: (c + 0.5) / N * 100, y: (r + 0.5) / N * 100 }; },
  roomSlot(rid, i) {
    const [r0, c0, r1, c1] = ROOM[rid].rect, w = c1 - c0 + 1, gap = 1.45;
    const perRow = Math.max(1, Math.floor((w - 0.8) / gap)), row = Math.floor(i / perRow), col = i % perRow;
    const startX = c0 + (w - (Math.min(perRow, 6) - 1) * gap) / 2;
    return { x: (startX + col * gap) / N * 100, y: (r1 + 0.2 - row * 1.5) / N * 100 };
  },
  computeTargets(pos) {
    const out = {}, byRoom = {};
    SUSPECTS.forEach(s => { const p = pos[s.id]; if (p.room) (byRoom[p.room] = byRoom[p.room] || []).push(s.id); else out[s.id] = this.cellXY(p.r, p.c); });
    for (const [r, list] of Object.entries(byRoom)) list.forEach((sid, i) => { out[sid] = this.roomSlot(r, i); });
    return out;
  },
  showPath(key) {
    const el = $('#path'); this.previewKey = key;
    $$('.hl-cell.sel, .room.sel').forEach(x => x.classList.remove('sel'));
    if (!el) return;
    if (!key || !this.movePrev || this.movePrev[key] === undefined) { el.innerHTML = ''; $$('.tunnel-links path.jump').forEach(p => p.classList.remove('jump')); return; }
    const dots = []; let k = this.movePrev[key];
    while (k !== undefined && this.movePrev[k] !== undefined) { if (!k.startsWith('room:')) dots.push(k); k = this.movePrev[k]; }
    el.innerHTML = dots.map(d => { const [r, c] = d.split(',').map(Number); return `<i class="path-dot" style="left:${(c + 0.5) / N * 100}%;top:${(r + 0.5) / N * 100}%"></i>`; }).join('');
    const full = [key]; let q = key; while (this.movePrev[q] !== undefined) { q = this.movePrev[q]; full.push(q); }
    const jumps = new Set(); for (let i = 0; i + 1 < full.length; i++) if (tunnelMap[full[i]] === full[i + 1]) jumps.add(tunnelOf[full[i]].id);
    $$('.tunnel-links path').forEach(p => p.classList.toggle('jump', jumps.has(p.dataset.link)));
    const target = key.startsWith('room:') ? $(`.room[data-room="${key.slice(5)}"]`) : $(`.hl-cell[data-key="${key}"]`);
    if (target) target.classList.add('sel');
  },
  setPawn(sid, xy) { const el = $('#pawn-' + sid); if (el && xy) { el.style.left = xy.x + '%'; el.style.top = xy.y + '%'; } },
  async animatePath(anim) {
    const el = $('#pawn-' + anim.sid); if (!el) return;
    this.animating.add(anim.sid); el.classList.add('walking');
    let last = null;
    for (const k of anim.path) {
      const xy = k.startsWith('room:') ? this.target[anim.sid] : this.cellXY(...k.split(',').map(Number));
      if (last && !k.startsWith('room:') && Math.hypot(xy.x - last.x, xy.y - last.y) > 10) {
        // atravessou uma escotilha: some e reaparece do outro lado
        el.classList.add('hatch'); Sound.card(); await sleep(220);
        el.style.transition = 'none'; this.setPawn(anim.sid, xy); void el.offsetWidth; el.style.transition = '';
        el.classList.remove('hatch'); await sleep(220);
      } else { this.setPawn(anim.sid, xy); Sound.step(); await sleep(anim.path.length > 1 ? 140 : 500); }
      last = xy;
    }
    el.classList.remove('walking'); this.animating.delete(anim.sid);
    this.setPawn(anim.sid, this.target[anim.sid]);
  },

  renderGame() {
    const pub = App.pub, priv = App.priv, ts = pub.ts || {};
    $('#g-code').textContent = pub.code;
    $('#btn-sound').textContent = Sound.muted ? '🔇' : '🔊';
    const cur = pub.players[pub.turn], mine = cur && cur.id === ME && pub.phase === 'play';
    const mySid = App.mySid(), myPos = mySid && pub.pos[mySid];

    // armas nas salas
    ROOMS.forEach(rm => { $('#rw-' + rm.id).innerHTML = WEAPONS.filter(w => pub.wpos[w.id] === rm.id).map(w => `<span class="wchip" title="${w.name}" style="background-image:url(img/w-${w.id}.jpg)"></span>`).join(''); });

    // destaques de movimento
    $$('.room').forEach(el => el.classList.remove('reach'));
    $$('.passage').forEach(el => el.classList.remove('active'));
    let hl = '';
    const choosing = !!(mine && !pub.pending && ts.rolled && !ts.moved);
    $('#board').classList.toggle('choosing', choosing);
    this.movePrev = null;
    if (choosing) {
      const { out, prev } = reachable(pub.pos, mySid, ts.steps || diceSum(ts.dice), closedTunnels(pub.event));
      this.movePrev = prev;
      var viaTunnels = new Set();
      ts.reach.forEach(k => {
        if (k.startsWith('room:')) $(`.room[data-room="${k.slice(5)}"]`).classList.add('reach');
        else {
          const [r, c] = k.split(',').map(Number), via = tunnelMap[k] && prev[k] === tunnelMap[k] ? tunnelOf[k] : null;
          if (via) viaTunnels.add(via.id);
          hl += `<div class="hl-cell${via ? ' via' : ''}" data-key="${k}" style="left:${c / N * 100}%;top:${r / N * 100}%;width:${100 / N}%;height:${100 / N}%${via ? ';--tc:' + via.color : ''}"${via ? ` title="Saída da escotilha ${via.id}"` : ''}><b>${out[k] || ''}</b></div>`;
        }
      });
      hl += '<div id="path"></div>';
    }
    if (mine && !pub.pending && !ts.rolled && !ts.moved && myPos && myPos.room && PASSAGES[myPos.room] && !(pub.event && pub.event.key === 'ducts')) $(`.room[data-room="${myPos.room}"] .passage`).classList.add('active');
    $('#hl').innerHTML = hl;
    this.previewKey = null;
    $$('.tunnel-links path').forEach(p => p.classList.toggle('on', choosing && viaTunnels.has(p.dataset.link)));
    const closedT = closedTunnels(pub.event);
    $$('.tunnel').forEach(el => el.classList.toggle('closed', closedT.includes(el.dataset.tunnel)));
    $$('.tunnel').forEach(el => el.classList.toggle('on', choosing && viaTunnels.has(el.dataset.tunnel)));

    // dica de movimento
    let hint = '';
    if (pub.phase === 'play' && mine && !pub.pending) {
      const canSug0 = myPos.room && !ts.suggested && (ts.entered || !ts.moved);
      if (choosing) {
        const rooms = ts.reach.filter(k => k.startsWith('room:')).length, cells = ts.reach.length - rooms;
        hint = ts.reach.length
          ? `🎲 <b>${ts.steps || diceSum(ts.dice)}</b>: clique numa <span class="hint-cell"></span> <b>casa dourada</b> (número = passos)` +
            (rooms ? ` ou numa sala <span class="hint-room">▶ ENTRAR</span>` : '') + '.' +
            (viaTunnels.size ? ` <span class="hint-t">Escotilha ${[...viaTunnels].join(' e ')} no alcance: leva à placa da mesma cor do outro lado (1 passo).</span>` : '') +
            (TOUCH ? ' <i>1º toque mostra o caminho, 2º confirma.</i>' : '') +
            (canSug0 ? ` Ou fique ${ROOM[myPos.room].in} e <b>palpite aqui</b> no painel.` : '')
          : (canSug0 ? `Sem casas livres para andar. Você pode <b>palpitar aqui</b> ${ROOM[myPos.room].in}.` : '');
      } else if (!ts.rolled && !ts.moved) {
        hint = `É a sua vez: <b>role os dados</b> no painel${myPos.room && PASSAGES[myPos.room] ? ' ou use o <b>duto ⇲</b> desta sala' : ''}${myPos.room ? `, ou <b>palpite aqui mesmo</b> ${ROOM[myPos.room].in} sem sair` : ''}.`;
      } else if (canSug0) hint = `Você está ${ROOM[myPos.room].in}. Faça seu <b>palpite</b> no painel.`;
    }
    const mh = $('#move-hint'); mh.innerHTML = hint; mh.classList.toggle('hidden', !hint);
    // a dica fica no lado do tabuleiro com menos opções iluminadas
    if (choosing) {
      const rowOf = k => k.startsWith('room:') ? (ROOM[k.slice(5)].rect[0] + ROOM[k.slice(5)].rect[2]) / 2 : +k.split(',')[0];
      const bottom = ts.reach.filter(k => rowOf(k) >= 19).length, top = ts.reach.filter(k => rowOf(k) <= 4).length;
      mh.classList.toggle('top', bottom > top);
    } else mh.classList.remove('top');

    // peões
    this.target = this.computeTargets(pub.pos);
    $$('.pawn').forEach(el => el.classList.remove('turn', 'me'));
    if (cur) $('#pawn-' + cur.suspect).classList.add('turn');
    if (mySid) $('#pawn-' + mySid).classList.add('me');
    SUSPECTS.forEach(s => {
      const owner = pub.players.find(p => p.suspect === s.id);
      $('#pawn-' + s.id + ' .pawn-tag').textContent = s.id === mySid ? 'VOCÊ' : owner ? owner.name : s.short;
    });
    SUSPECTS.forEach(s => { if (!this.animating.has(s.id)) this.setPawn(s.id, this.target[s.id]); });

    // painel da vez
    let status = '', acts = '';
    if (pub.phase === 'over') {
      const wn = pub.players.find(p => p.id === pub.winner);
      status = wn ? `<b>${esc(wn.name)}</b> desvendou o mistério.` : 'Fim de jogo.';
      acts = `<button class="btn" data-act="showover">Ver o envelope</button>` + (App.isHost() ? `<button class="btn gold" data-act="newgame">Nova partida</button>` : '');
    } else if (pub.pending) {
      const asking = pub.players.find(p => p.id === pub.pending.askingId);
      status = asking ? (asking.id === ME ? '<b>Você precisa mostrar uma carta.</b>' : `Aguardando <b>${esc(asking.name)}</b> escolher uma carta…`) + (pub.pending.deadline ? ` <span class="countdown" data-countdown></span>` : '') : 'Conferindo as cartas…';
    } else if (mine) {
      const canSug = myPos.room && !ts.suggested && (ts.entered || !ts.moved), stay = canSug && !ts.entered;
      if (!ts.rolled && !ts.moved) {
        status = myPos.room ? `${ts.summoned ? 'Você foi trazido' : 'Você está'} ${ROOM[myPos.room].in}. Pode palpitar aqui mesmo ou rolar os dados para andar.` : 'Sua vez! Role os dados.';
        acts += `<button class="btn gold" data-act="roll">🎲 Rolar dados</button>`;
        if (myPos.room && PASSAGES[myPos.room] && !(pub.event && pub.event.key === 'ducts')) acts += `<button class="btn" data-act="passage">⇲ Duto → ${ROOM[PASSAGES[myPos.room]].name}</button>`;
      } else if (ts.rolled && !ts.moved) status = `Escolha uma casa iluminada (até ${ts.steps || diceSum(ts.dice)} passos) ou entre numa sala${stay ? ', ou fique e palpite aqui' : ''}.`;
      else if (canSug) status = `Você está ${ROOM[myPos.room].in}. Dê seu palpite!`;
      else if (ts.autoEnd) status = 'Palpite respondido. <b>A vez passa sozinha</b> em instantes…';
      else status = 'Pode encerrar a vez.';
      if (canSug) acts += stay ? `<button class="btn ${ts.rolled ? '' : 'gold'}" data-act="suggest">🔎 Palpitar aqui (sem sair)</button>` : `<button class="btn gold" data-act="suggest">🔎 Dar palpite</button>`;
      if (ts.rolled || ts.moved || ts.suggested) acts += `<button class="btn" data-act="end">Encerrar vez ➜</button>`;
    } else if (cur) {
      status = !pub.online[cur.id] ? `<b>${esc(cur.name)}</b> desconectou. Aguardando voltar…` : ts.autoEnd ? `Palpite respondido. A vez de <b>${esc(cur.name)}</b> já vai passar…` : `Aguardando <b>${esc(cur.name)}</b>…`;
      if (!pub.online[cur.id] && App.isHost()) acts += `<button class="btn" data-act="skip">Pular a vez de ${esc(cur.name)}</button>`;
    }

    let sugBox = '';
    if (pub.lastSug && pub.phase === 'play') {
      const g = pub.lastSug, by = pub.players.find(p => p.id === g.by);
      let res = 'conferindo…';
      if (g.result && g.result.none) res = '<b class="gold">ninguém refutou!</b>';
      else if (g.result && g.result.by) { const rb = pub.players.find(p => p.id === g.result.by); res = `${esc(rb ? rb.name : '?')} mostrou uma carta`; }
      sugBox = `<div class="last-sug"><small>Último palpite · ${esc(by ? by.name : '')}</small><div>${S[g.s].short}, ${W[g.w].name}, ${ROOM[g.r].name}</div><small>${res}</small></div>`;
    }
    const nDice = (ts.dice && ts.dice.length) || pub.settings.dice || 2, d = ts.dice || Array(nDice).fill(0);
    const ev = pub.event && pub.phase === 'play' ? `<div class="event-chip">${EVENTS[pub.event.key].icon} <b>${EVENTS[pub.event.key].name}</b> · ${EVENTS[pub.event.key].text(pub.event.tunnel)}</div>` : '';
    $('#turn').innerHTML = cur ? `
      <div class="turn-head ${mine ? 'mine' : ''}">${portrait(S[cur.suspect])}<div><small>${pub.phase === 'over' ? 'FIM DE JOGO' : mine ? 'SUA VEZ' : 'VEZ DE'}</small><b>${esc(cur.name)}</b><span style="color:${S[cur.suspect].color}">${S[cur.suspect].short}</span></div>
        <div class="dice"><div class="die" id="d1">${dieHTML(d[0])}</div>${nDice > 1 ? `<div class="die" id="d2">${dieHTML(d[1])}</div>` : ''}</div></div>${ev}
      <p class="status">${status}</p><div class="actions">${acts}</div>${sugBox}` : '';

    // mão
    $('#hand').innerHTML = priv ? priv.hand.map(c => cardHTML(c, 'hand-card')).join('') : '<p class="hint">Você está assistindo.</p>';

    // jogadores
    const specs = pub.spectators || [];
    $('#players').innerHTML = '<h3>Detetives</h3>' + pub.players.map((p, i) => `
      <div class="pl ${i === pub.turn ? 'cur' : ''} ${p.out ? 'out' : ''}" data-pl="${p.id}">${portrait(S[p.suspect])}
        <div><b>${esc(p.name)}${p.id === ME ? ' (você)' : ''}${(pub.scores || {})[p.id] ? ` <span class="trophy" title="vitórias na sala">🏆${pub.scores[p.id]}</span>` : ''}</b><small style="color:${S[p.suspect].color}">${S[p.suspect].short}</small></div>
        <span class="pl-meta"><i class="dot ${pub.online[p.id] ? 'on' : ''}" title="${pub.online[p.id] ? 'conectado' : 'desconectado'}"></i>${pub.online[p.id] ? '' : '<em class="off">offline</em> '}🂠 ${pub.handCounts[p.id]}${p.out ? ' · fora' : ''}</span></div>`).join('') +
      (specs.length ? `<p class="specs">👁 Assistindo: ${specs.map(v => esc(v.name) + (v.id === ME ? ' (você)' : '')).join(', ')}</p>` : '') +
      `<div class="reacts" title="Reagir para a mesa">${REACTIONS.map(e => `<button class="react-btn" data-react="${e}">${e}</button>`).join('')}</div>`;
    $('#g-code').parentElement.classList.toggle('spectating', !App.me());

    // diário
    const log = $('#log'), atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
    const ICON = { roll: '🎲', move: '🚶', sug: '🔎', ref: '✋', win: '🏆', acc: '⚖️', sys: '·' };
    log.innerHTML = pub.log.map(e => e.kind === 'chat'
      ? `<div class="lg chat-line"><span class="ic">💬</span><div><b style="color:${e.color}">${esc(e.who)}</b> ${esc(e.text)}</div></div>`
      : e.kind === 'turn'
        ? `<div class="lg l-turn">${e.sid ? `<img src="img/s-${e.sid}.jpg" alt="">` : ''}<span>${esc(e.text)}</span></div>`
        : `<div class="lg l-${e.kind}"><span class="ic">${ICON[e.kind] || '·'}</span><div>${esc(e.text)}</div></div>`).join('');
    if (atBottom || this.seen.logLen !== pub.log.length) log.scrollTop = log.scrollHeight;
    const chats = pub.log.filter(e => e.kind === 'chat').length;
    if (this.tab === 'log') this.seenChats = chats;
    $('#tab-btn-log').classList.toggle('badge', chats > (this.seenChats ?? chats));
    this.seen.logLen = pub.log.length;
    this.renderSugs();

    // modal de refutação
    if (priv && priv.ask && pub.phase === 'play') { if (Modal.kind !== 'ask') this.askModal(); }
    else if (Modal.kind === 'ask') Modal.close();
  },

  events(first) {
    const pub = App.pub, priv = App.priv, sn = this.seen, ts = pub.ts || {};
    if (first) return;
    if (ts.diceId && ts.diceId !== sn.dice) { sn.dice = ts.diceId; this.rollDice(ts.dice); }
    if (pub.anim && pub.anim.id !== sn.anim) { sn.anim = pub.anim.id; this.animatePath(pub.anim); }
    if (pub.lastSug && pub.lastSug.id !== sn.sug) {
      sn.sug = pub.lastSug.id; const g = pub.lastSug, by = pub.players.find(p => p.id === g.by);
      Sound.sting();
      Voice.say(`${by.id === ME ? 'Você suspeita' : by.name + ' suspeita'} de ${S[g.s].name}, com ${W[g.w].with}, ${ROOM[g.r].in}.`);
      banner(`<small>${esc(by.name)} suspeita…</small><div class="banner-cards">${cardHTML('s:' + g.s, 'sm')}${cardHTML('w:' + g.w, 'sm')}${cardHTML('r:' + g.r, 'sm')}</div>`, 4500);
    }
    if (pub.lastAcc && pub.lastAcc.id !== sn.acc) {
      sn.acc = pub.lastAcc.id; const a = pub.lastAcc, by = pub.players.find(p => p.id === a.by);
      if (!a.ok) { Sound.lose(); banner(`<small>${esc(by.name)} acusou…</small><div class="banner-cards">${cardHTML('s:' + a.s, 'sm')}${cardHTML('w:' + a.w, 'sm')}${cardHTML('r:' + a.r, 'sm')}</div><b class="bad">e errou!</b>`, 5000); }
    }
    const sh = (priv && priv.shown) || [];
    const last = sh[sh.length - 1];
    if (last && last.id !== sn.shown) {
      sn.shown = last.id;
      const by = pub.players.find(p => p.id === last.by);
      Sound.card();
      Modal.open(`<h2>${esc(by ? by.name : '?')} mostra uma carta…</h2><p class="hint">Só você está vendo. Anote no seu caderno (tecla N).</p>
        <div class="flip"><div class="flip-inner">${cardBack('face back')}${cardHTML(last.card, 'face front big')}</div></div>
        <button class="btn gold" data-close>Entendi</button>`, { kind: 'shown', cls: 'center' });
    }
    if (priv && priv.sol && !sn.wrong) {
      sn.wrong = true; const s = priv.sol;
      Modal.open(`<h2>Acusação errada</h2><p>Você abriu o envelope em segredo. Ele continha:</p>
        <div class="row-cards">${cardHTML('s:' + s.s)}${cardHTML('w:' + s.w)}${cardHTML('r:' + s.r)}</div>
        <p class="hint">Você está fora da investigação, mas ainda precisa mostrar cartas quando pedirem. Não conte nada!</p>
        <button class="btn gold" data-close>Bico calado</button>`, { kind: 'wrong', cls: 'center' });
    }
    if (pub.phase === 'over' && sn.over !== pub.gameId) { sn.over = pub.gameId; this.overModal(); }
    if (pub.react && pub.react.id !== sn.react) { sn.react = pub.react.id; this.showReact(pub.react); }
    if (pub.event && pub.event.id !== sn.event) {
      sn.event = pub.event.id; const E = EVENTS[pub.event.key];
      Sound.horn(); banner(`<small>Evento do navio</small><div class="ev-big">${E.icon} ${E.name}</div><p class="ev-text">${E.text(pub.event.tunnel)}</p>`, 6000);
      Voice.say(`Evento do navio: ${E.name}. ${E.text(pub.event.tunnel)}`);
    }
    const cur = pub.players[pub.turn];
    if (cur && pub.phase === 'play') {
      const turnKey = pub.turn + ':' + (pub.log.filter(e => e.kind === 'turn').length);
      if (sn.turn !== turnKey) { sn.turn = turnKey; if (cur.id === ME) { Sound.ding(); toast('É a sua vez, detetive!'); } }
    }
  },

  chip(card, cls = '') {
    const [t, k] = card.split(':'), img = t === 's' ? `s-${k}` : t === 'w' ? `w-${k}` : `room-${k}`;
    return `<span class="chip chip-${t} ${cls}"><img src="img/${img}.jpg" alt="">${esc(cardData(card).name)}</span>`;
  },
  renderSugs() {
    const pub = App.pub, H = pub.history || [], f = this.sugFilter || 'all';
    const P = id => pub.players.find(p => p.id === id), nm = id => id === ME ? 'você' : esc((P(id) || {}).name || '?');
    const sel = $('#sug-filter');
    const opts = `<option value="all">Todos os palpites</option>` + pub.players.map(p => `<option value="${p.id}">Envolvendo ${p.id === ME ? 'você' : esc(p.name)}</option>`).join('');
    if (sel.dataset.opts !== opts) { sel.innerHTML = opts; sel.dataset.opts = opts; }
    sel.value = f;
    $('#sug-count').textContent = H.length ? `(${H.length})` : '';
    const shownToMe = {}, gave = {};
    ((App.priv && App.priv.shown) || []).forEach(x => { if (x.sugId) shownToMe[x.sugId] = x; });
    ((App.priv && App.priv.gave) || []).forEach(x => { gave[x.sugId] = x; });
    const list = H.filter(h => f === 'all' || h.by === f || h.shownBy === f || h.passed.includes(f)).slice().reverse();
    $('#sugs').innerHTML = list.length ? list.map(h => {
      const by = P(h.by), res = [];
      if (h.passed.length) res.push(`<span class="r-pass">✗ ${(t => t[0].toUpperCase() + t.slice(1))(h.passed.map(nm).join(', '))} não ${h.passed.length > 1 ? 'tinham' : 'tinha'} nenhuma</span>`);
      if (h.shownBy) {
        if (shownToMe[h.id]) res.push(`<span class="r-show">✋ ${nm(h.shownBy)} mostrou a você: ${this.chip(shownToMe[h.id].card, 'mini')}</span>`);
        else if (gave[h.id]) res.push(`<span class="r-show">✋ Você mostrou a ${nm(h.by)}: ${this.chip(gave[h.id].card, 'mini')}</span>`);
        else res.push(`<span class="r-show">✋ ${nm(h.shownBy)} mostrou uma carta a ${nm(h.by)}</span>`);
      }
      if (h.none) res.push(`<span class="r-none">⚠️ Ninguém tinha nenhuma das três</span>`);
      if (h.win) res.push(`<span class="r-win">🏆 Acertou o envelope!</span>`);
      if (!h.shownBy && !h.none && !h.win) res.push(`<span class="r-wait">⏳ conferindo…</span>`);
      return `<div class="sug ${h.by === ME ? 'mine' : ''}" style="--c:${by ? S[by.suspect].color : '#888'}">
        <div class="sug-head"><b>#${h.n}</b>${by ? `<img src="img/s-${by.suspect}.jpg" alt="">` : ''}<span>${h.by === ME ? 'Você' : nm(h.by)} perguntou</span></div>
        <div class="sug-chips">${this.chip('s:' + h.s)}${this.chip('w:' + h.w)}${this.chip('r:' + h.r)}</div>
        <div class="sug-res">${res.join('')}</div></div>`;
    }).join('') : `<p class="hint">${H.length ? 'Nenhum palpite com esse filtro.' : 'Nenhum palpite ainda. Eles vão aparecer aqui, com quem não tinha e quem mostrou carta.'}</p>`;
  },
  sugTable() {
    const pub = App.pub, H = pub.history || [];
    const P = id => pub.players.find(p => p.id === id), nm = id => id === ME ? 'você' : esc((P(id) || {}).name || '?');
    const shownToMe = {}, gave = {};
    ((App.priv && App.priv.shown) || []).forEach(x => { if (x.sugId) shownToMe[x.sugId] = x; });
    ((App.priv && App.priv.gave) || []).forEach(x => { gave[x.sugId] = x; });
    Modal.open(`<h2>Todos os palpites</h2>
      <div class="table-wrap"><table class="sug-table"><tr><th>#</th><th>Quem</th><th>Suspeito</th><th>Arma</th><th>Local</th><th>Não tinham</th><th>Mostrou</th></tr>
      ${H.map(h => `<tr class="${h.by === ME ? 'mine' : ''}"><td>${h.n}</td><td>${nm(h.by)}</td><td>${S[h.s].name}</td><td>${W[h.w].name}</td><td>${ROOM[h.r].name}</td>
        <td>${h.passed.map(nm).join(', ') || '—'}</td>
        <td>${h.win ? '🏆 acertou' : h.none ? '⚠️ ninguém' : h.shownBy ? (shownToMe[h.id] ? `${nm(h.shownBy)} → <b>${esc(cardData(shownToMe[h.id].card).name)}</b>` : gave[h.id] ? `você → <b>${esc(cardData(gave[h.id].card).name)}</b>` : nm(h.shownBy)) : '…'}</td></tr>`).join('') || '<tr><td colspan="7">Nenhum palpite ainda.</td></tr>'}
      </table></div><p class="hint">A carta em negrito só aparece para quem viu ou mostrou.</p>
      <div class="actions center"><button class="btn gold" data-close>Fechar</button></div>`, { kind: 'table', cls: 'wide' });
  },
  async rollDice(final) {
    Sound.dice();
    const cur = App.pub.players[App.pub.turn], mine = cur && cur.id === ME, n = final.length;
    const show = $('#dice-show'); clearTimeout(this._diceHide);
    show.innerHTML = `<div class="ds-name">${mine ? 'Você rola' : esc(cur ? cur.name : '') + ' rola'} ${n > 1 ? 'os dados' : 'o dado'}…</div>
      <div class="ds-dice">${final.map((_, i) => `<div class="bigdie ${i ? 'b2' : ''}" id="bd${i + 1}">${dieHTML(1)}</div>`).join('')}</div><div class="ds-total">&nbsp;</div>`;
    show.classList.remove('hidden', 'out'); void show.offsetWidth; show.classList.add('in');
    const small = i => $('#d' + (i + 1)), big = i => $('#bd' + (i + 1));
    const t0 = performance.now();
    while (performance.now() - t0 < 950) {
      final.forEach((_, i) => { const r = 1 + Math.floor(Math.random() * 6); if (small(i)) { small(i).innerHTML = dieHTML(r); small(i).classList.add('rolling'); } if (big(i)) big(i).innerHTML = dieHTML(r); });
      await sleep(75);
    }
    final.forEach((v, i) => { if (small(i)) { small(i).innerHTML = dieHTML(v); small(i).classList.remove('rolling'); } if (big(i)) { big(i).innerHTML = dieHTML(v); big(i).classList.add('land'); } });
    const steps = App.pub.ts && App.pub.ts.steps, sum = diceSum(final);
    const tot = $('#dice-show .ds-total');
    if (tot) tot.innerHTML = (n > 1 ? `${final.join(' + ')} = <b>${sum}</b>` : `<b>${sum}</b>`) + (steps && steps !== sum ? ` <small class="ds-mod">→ anda ${steps} (${EVENTS[App.pub.event.key].name.toLowerCase()})</small>` : '');
    Sound.step();
    this._diceHide = setTimeout(() => { show.classList.add('out'); this._diceHide = setTimeout(() => show.classList.add('hidden'), 400); }, 1600);
  },

  revealHTML() {
    const pub = App.pub, R = pub.reveal; if (!R) return '';
    const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;
    const nm = id => id === ME ? 'Você' : esc((pub.players.find(p => p.id === id) || {}).name || '?');
    const rows = pub.players.map(p => { const st = R.stats[p.id] || { hand: [], asked: 0, showed: 0, passed: 0 };
      return `<div class="rv-row" style="--c:${S[p.suspect].color}"><div class="rv-who">${portrait(S[p.suspect])}<div><b>${nm(p.id)}</b><small>${pl(st.asked, 'palpite', 'palpites')} · mostrou ${pl(st.showed, 'carta', 'cartas')} · passou ${pl(st.passed, 'vez', 'vezes')}</small></div></div>
        <div class="rv-hand">${st.hand.map(c => this.chip(c, 'mini')).join('')}</div></div>`; }).join('');
    const mostAsk = pub.players.slice().sort((a, b) => (R.stats[b.id] || {}).asked - (R.stats[a.id] || {}).asked)[0];
    const mostShow = pub.players.slice().sort((a, b) => (R.stats[b.id] || {}).showed - (R.stats[a.id] || {}).showed)[0];
    const c = R.closest;
    const facts = [
      `🔎 ${pl(R.total, 'palpite', 'palpites')} na partida`,
      mostAsk && (R.stats[mostAsk.id] || {}).asked ? `🗣 Mais curioso: <b>${nm(mostAsk.id)}</b> (${pl(R.stats[mostAsk.id].asked, 'palpite', 'palpites')})` : '',
      mostShow && (R.stats[mostShow.id] || {}).showed ? `✋ Mais generoso: <b>${nm(mostShow.id)}</b> (mostrou ${pl(R.stats[mostShow.id].showed, 'carta', 'cartas')})` : '',
      c && c.hits >= 2 ? `🎯 Quase lá: palpite #${c.n} de <b>${nm(c.by)}</b> acertou ${c.hits} de 3` : '',
    ].filter(Boolean);
    return `<div class="reveal"><h3>As cartas de cada um</h3>${rows}<div class="facts">${facts.map(f => `<span>${f}</span>`).join('')}</div></div>${this.scoreboard('in-modal')}`;
  },
  showReact(r) {
    Sound.pop();
    const P = App.pub.players.find(p => p.id === r.by);
    // emoji sobe da ficha da pessoa no tabuleiro
    if (P && this.target[P.suspect]) {
      const xy = this.target[P.suspect], el = document.createElement('div');
      el.className = 'react-float'; el.textContent = r.e; el.style.left = xy.x + '%'; el.style.top = xy.y + '%';
      $('#board').appendChild(el); setTimeout(() => el.remove(), 2600);
    }
    // e aparece ao lado do nome na lista
    const row = $(`[data-pl="${r.by}"]`);
    if (row) { const b = document.createElement('span'); b.className = 'react-bubble'; b.textContent = r.e; row.appendChild(b); setTimeout(() => b.remove(), 2600); }
    else { const V = (App.pub.spectators || []).find(v => v.id === r.by); if (V) toast(`${V.name} 👁 reagiu ${r.e}`, 2000); }
  },
  introModal() {
    const sid = App.mySid(), s = sid && S[sid];
    if (!App.me()) return Modal.open(`<div class="poster-top">CONFIDENCIAL</div><h2>Você está assistindo</h2>
      <p>A partida já tinha começado, então você entrou como espectador 👁. Dá para acompanhar o tabuleiro, os palpites, conversar e reagir. Na próxima partida você entra como jogador.</p>
      <button class="btn gold" data-close>Assistir</button>`, { kind: 'intro', cls: 'center' });
    Modal.open(`<div class="poster-top">CONFIDENCIAL</div><h2>A bordo do Aurora</h2>
      <p>Augusto Faria foi encontrado morto durante o baile. Um envelope lacrado guarda a verdade: <b>quem</b>, <b>com o quê</b> e <b>onde</b>.</p>
      ${s ? `<div class="intro-me">${portrait(s)}<div><small>Você é</small><b>${esc(s.name)}</b><p>${esc(s.bio)}</p></div></div>` : ''}
      <p>As cartas na sua mão <b>não</b> estão no envelope. Abra o caderno (tecla N) e faça suas anotações.</p>
      <p class="hint">Atalhos do navio: <b style="color:#3fc8d4">escotilhas I</b> e <b style="color:#d27ae6">II</b> nos corredores ligam um lado ao outro por 1 passo, e os <b>dutos ⇲</b> das salas de canto levam à sala oposta.</p>
      <div class="row-cards">${(App.priv ? App.priv.hand : []).map(c => cardHTML(c, 'sm')).join('')}</div>
      <button class="btn gold" data-close>Começar a investigar</button>`, { kind: 'intro', cls: 'center' });
  },
  askModal() {
    const ask = App.priv.ask, by = App.pub.players.find(p => p.id === ask.by);
    Sound.card();
    Modal.open(`<h2>${esc(by ? by.name : '?')} fez um palpite</h2>
      <p>Você tem ${ask.cards.length > 1 ? 'algumas dessas cartas. Escolha <b>uma</b> para mostrar em segredo' : 'uma dessas cartas. Mostre-a em segredo'}:</p>
      <div class="row-cards">${ask.all.map(c => ask.cards.includes(c) ? cardHTML(c, 'pickable', `data-refute="${c}"`) : cardHTML(c, 'dim')).join('')}</div>
      <p class="hint">Só ${esc(by ? by.name : '')} vai ver a carta escolhida.</p>
      ${UI.deadline ? '<p class="ask-timer">⏳ <span data-countdown></span> para escolher, depois o jogo sorteia</p>' : ''}`, { kind: 'ask', persistent: true, cls: 'center' });
  },
  overModal() {
    const pub = App.pub, sol = pub.solution, wn = pub.players.find(p => p.id === pub.winner);
    if (pub.winner === ME) Sound.win(); else Sound.sting();
    if (wn) Voice.say(`Caso encerrado! ${wn.id === ME ? 'Você desvendou' : wn.name + ' desvendou'} o crime. Foi ${S[sol.s].name}, com ${W[sol.w].with}, ${ROOM[sol.r].in}.`);
    Modal.open(`<div class="poster-top">CASO ENCERRADO</div>
      <h2>${wn ? (wn.id === ME ? 'Você desvendou o crime!' : `${esc(wn.name)} desvendou o crime!`) : 'Ninguém desvendou o crime'}</h2>
      <div class="envelope"><div class="env-flap"></div><div class="env-body">CONFIDENCIAL</div>
        <div class="env-cards">${cardHTML('s:' + sol.s, 'e1')}${cardHTML('w:' + sol.w, 'e2')}${cardHTML('r:' + sol.r, 'e3')}</div></div>
      <p class="verdict">Foi <b>${S[sol.s].name}</b>, com <b>${W[sol.w].with}</b>, <b>${ROOM[sol.r].in}</b>.</p>
      ${UI.revealHTML()}
      <div class="actions center">${App.isHost() ? '<button class="btn gold" data-act="newgame">Nova partida</button>' : '<span class="hint">O anfitrião pode iniciar uma nova partida.</span>'}<button class="btn" data-close>Fechar</button></div>`, { kind: 'over', cls: 'center wide' });
  },
  picker(mode) {
    const pub = App.pub, room = pub.pos[App.mySid()].room;
    const sel = { s: null, w: null, r: mode === 'suggest' ? room : null };
    const grid = (ids, key) => `<div class="pick-grid">${ids.map(id => cardHTML(id, 'sm pickable', `data-pick="${key}" data-val="${id.slice(2)}"`)).join('')}</div>`;
    Modal.open(`<h2>${mode === 'suggest' ? 'Seu palpite' : 'Acusação final'}</h2>
      ${mode === 'accuse' ? '<p class="warn">Atenção: se errar, você sai da investigação. Só acuse se tiver certeza.</p>' : `<p>O palpite é feito ${ROOM[room].in}. O suspeito e a arma serão trazidos para cá.</p>`}
      <h3>Quem?</h3>${grid(SUSPECTS.map(s => 's:' + s.id), 's')}
      <h3>Com o quê?</h3>${grid(WEAPONS.map(w => 'w:' + w.id), 'w')}
      ${mode === 'accuse' ? `<h3>Onde?</h3>${grid(ROOMS.map(r => 'r:' + r.id), 'r')}` : ''}
      <div class="actions center"><button class="btn" data-close>Cancelar</button><button class="btn ${mode === 'accuse' ? 'danger' : 'gold'}" id="pick-ok" disabled>${mode === 'accuse' ? '⚖️ Acusar!' : '🔎 Perguntar à mesa'}</button></div>`, { kind: 'picker', cls: 'wide' });
    const box = $('#modal-box');
    box.onclick = e => {
      const c = e.target.closest('[data-pick]');
      if (c) {
        sel[c.dataset.pick] = c.dataset.val;
        $$(`[data-pick="${c.dataset.pick}"]`, box).forEach(x => x.classList.toggle('selected', x === c));
        Sound.card();
        $('#pick-ok').disabled = !(sel.s && sel.w && sel.r);
      }
      if (e.target.id === 'pick-ok') {
        App.send(mode === 'suggest' ? { type: 'suggest', s: sel.s, w: sel.w } : { type: 'accuse', s: sel.s, w: sel.w, r: sel.r });
        box.onclick = null; Modal.close();
      }
    };
  },
  help() {
    Modal.open(`<h2>Como jogar</h2><ol class="rules">
      <li>No início, um <b>suspeito</b>, uma <b>arma</b> e um <b>local</b> são escondidos no envelope. O resto das cartas é distribuído.</li>
      <li>Na sua vez, <b>role os dados</b> e ande até esse número de casas pelos corredores (pode andar menos). Entrar numa sala encerra o movimento. As salas dos cantos têm <b>dutos de serviço</b> ⇲ para a sala oposta.</li>
      <li>Nos corredores há duas <b>escotilhas</b>: as placas <b style="color:#3fc8d4">I</b> (turquesa) e <b style="color:#d27ae6">II</b> (lilás). Pisou numa, pode sair na outra placa da mesma cor, do outro lado do navio, gastando só 1 passo. Passe o mouse ou toque numa placa para ver a ligação.</li>
      <li>Dentro de uma sala, dê um <b>palpite</b>: suspeito + arma + a sala onde você está. O suspeito e a arma são levados até lá.</li>
      <li>Seguindo a ordem da mesa, o primeiro jogador que tiver uma das três cartas mostra <b>uma</b>, em segredo, só para você.</li>
      <li>Se você começar a vez dentro de uma sala, pode <b>palpitar ali mesmo, sem sair</b>, antes ou depois de rolar os dados (palpitar encerra o movimento).</li>
      <li>Não existe acusação: <b>vence quem fizer o palpite exatamente igual ao envelope</b>. Se ninguém conseguir mostrar carta, pode ser a pista que faltava (ou alguém blefando com as próprias cartas).</li>
      <li>Use o <b>caderno</b> (tecla N) para riscar o que já descobriu.</li></ol>
      <p class="hint">Fotos de época em domínio público ou licença livre, do Wikimedia Commons. <a href="img/CREDITOS.md" target="_blank" style="color:var(--gold2)">Ver créditos</a>.</p>
      <button class="btn gold" data-close>Entendi</button>`, { kind: 'help' });
  },
};

/* ---------------- EVENTOS DE TELA ---------------- */
document.addEventListener('click', e => {
  Sound.unlock();
  const t = e.target;
  if (t.closest('[data-close]')) return Modal.close();
  if (t.id === 'modal' && !Modal.persistent) return Modal.close();
  const act = t.closest('[data-act]');
  if (act) {
    const a = act.dataset.act;
    if (a === 'suggest') return UI.picker(a);
    if (a === 'showover') return UI.overModal();
    if (a === 'sugtable') return UI.sugTable();
    if (a === 'newgame') { Modal.close(); return App.send({ type: 'newgame' }); }
    if (a === 'end' && App.pub.ts && !App.pub.ts.suggested && App.pub.pos[App.mySid()].room && App.pub.ts.entered && !confirm('Encerrar a vez sem dar palpite?')) return;
    return App.send({ type: a });
  }
  const rf = t.closest('[data-refute]');
  if (rf) { App.send({ type: 'refute', card: rf.dataset.refute }); Modal.close(); return; }
  const ch = t.closest('[data-suspect]');
  if (ch && !ch.disabled) { const mine = App.mySid() === ch.dataset.suspect; Sound.card(); return App.send({ type: 'pick', suspect: mine ? null : ch.dataset.suspect }); }
  if (t.closest('[data-start]')) return App.send({ type: 'start' });
  const rb = t.closest('[data-react]'); if (rb) return App.send({ type: 'react', e: rb.dataset.react });
  if (t.closest('[data-copy]')) { const v = $('#share-link').value; navigator.clipboard?.writeText(v).then(() => toast('Convite copiado! Mande para a galera.'), () => { $('#share-link').select(); toast('Copie o link selecionado.'); }); return; }
  if (t.closest('[data-close-notes]')) return Notes.toggle(false);
  const nc = t.closest('[data-nc]');
  if (nc) { Notes.cycle(nc.dataset.nc, nc.dataset.np); return Notes.updateCell(nc); }
});

const TOUCH = matchMedia('(hover: none)').matches;
$('#board').addEventListener('click', e => {
  if (e.target.closest('.passage.active')) return App.send({ type: 'passage' });
  const h = e.target.closest('[data-key]'), room = e.target.closest('.room.reach');
  const key = h ? h.dataset.key : room ? 'room:' + room.dataset.room : null;
  if (!key) return;
  // no celular: 1º toque mostra o caminho, 2º toque confirma
  if (TOUCH && UI.previewKey !== key) { UI.showPath(key); return; }
  UI.showPath(null);
  App.send({ type: 'move', key });
});
$('#board').addEventListener('mouseover', e => {
  if (TOUCH) return;
  const h = e.target.closest('[data-key]'), room = e.target.closest('.room.reach');
  UI.showPath(h ? h.dataset.key : room ? 'room:' + room.dataset.room : null);
});
$('#board').addEventListener('mouseleave', () => { if (!TOUCH) UI.showPath(null); });
function peekTunnel(id) {
  $$('.tunnel-links path').forEach(p => p.classList.toggle('peek', p.dataset.link === id));
  $$('.tunnel').forEach(el => el.classList.toggle('peek', el.dataset.tunnel === id));
}
$('#board').addEventListener('mouseover', e => { if (TOUCH) return; const t = e.target.closest('[data-tunnel]'); peekTunnel(t ? t.dataset.tunnel : null); });
$('#board').addEventListener('click', e => {
  const t = e.target.closest('[data-tunnel]');
  if (t && !e.target.closest('[data-key]')) { peekTunnel(t.dataset.tunnel); toast(`Escotilha ${t.dataset.tunnel}: pisou numa, sai na outra placa da mesma cor (1 passo).`, 3500); clearTimeout(peekTunnel._t); peekTunnel._t = setTimeout(() => peekTunnel(null), 3500); }
});

document.addEventListener('click', e => {
  const tb = e.target.closest('[data-tab]'); if (!tb) return;
  UI.tab = tb.dataset.tab;
  $$('[data-tab]').forEach(b => b.classList.toggle('on', b === tb));
  $('#tab-sugs').classList.toggle('hidden', UI.tab !== 'sugs'); $('#tab-log').classList.toggle('hidden', UI.tab !== 'log');
  if (UI.tab === 'log') { UI.seenChats = (App.pub.log || []).filter(x => x.kind === 'chat').length; $('#tab-btn-log').classList.remove('badge'); const l = $('#log'); l.scrollTop = l.scrollHeight; }
});
$('#sug-filter').addEventListener('change', e => { UI.sugFilter = e.target.value; UI.renderSugs(); });
$('#notes').addEventListener('input', e => { if (e.target.id === 'notes-free') store.set(Notes.key() + '-free', e.target.value); });
$('#btn-notes').onclick = () => Notes.toggle();
$('#btn-help').onclick = () => UI.help();
$('#btn-sound').onclick = () => { Sound.unlock(); Sound.setMuted(!Sound.muted); $('#btn-sound').textContent = Sound.muted ? '🔇' : '🔊'; };
document.addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.setting; if (!k) return;
  const v = +e.target.value;
  App.send({ type: 'settings', ...(k === 'refute' ? { refuteSecs: v } : k === 'dice' ? { dice: v } : k === 'events' ? { events: !!v } : { autoEnd: !!v }) });
});
// relógio de quem precisa mostrar carta
setInterval(() => {
  const els = $$('[data-countdown]'); if (!els.length) return;
  const left = UI.deadline ? Math.max(0, Math.ceil((UI.deadline - performance.now()) / 1000)) : null;
  els.forEach(el => { el.textContent = left == null ? '' : (left >= 60 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : `${left}s`); el.classList.toggle('urgent', left != null && left <= 10); });
}, 250);
$('#btn-voice').onclick = () => { const on = Voice.toggle(); $('#btn-voice').classList.toggle('on', on); toast(on ? 'Narração ligada: os palpites serão lidos em voz alta.' : 'Narração desligada.'); };
if (Voice.on) $('#btn-voice').classList.add('on');
$('#btn-music').onclick = () => { Sound.unlock(); const on = !Sound.music; Sound.setMusic(on); $('#btn-music').classList.toggle('on', on); };
$('#btn-sea').onclick = () => { const on = !Sound.sea; Sound.setSea(on); $('#btn-sea').classList.toggle('on', on); };
$('#chat').onsubmit = e => { e.preventDefault(); const v = $('#chat-in').value.trim(); if (v) App.send({ type: 'chat', text: v }); $('#chat-in').value = ''; };
document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea')) return;
  if (e.key === 'n' || e.key === 'N') Notes.toggle();
  if (e.key === 'Escape') { if ($('#notes').classList.contains('open')) Notes.toggle(false); else if (!Modal.persistent) Modal.close(); }
  if ((e.key === 'r' || e.key === 'R') && App.pub && App.pub.phase === 'play') { const b = $('[data-act="roll"]'); if (b) b.click(); }
});
window.addEventListener('pagehide', () => {
  try { if (App.role === 'client' && App.net && App.net.conn) App.net.conn.close(); if (App.role === 'host' && App.net && App.net.peer) App.net.peer.destroy(); } catch { }
});
window.addEventListener('beforeunload', e => { if (App.role === 'host' && App.pub && App.pub.phase === 'play') { e.preventDefault(); e.returnValue = ''; } });

/* ---------------- CAPA ---------------- */
(function home() {
  const params = new URLSearchParams(location.search);
  const nameIn = $('#in-name'), codeIn = $('#in-code');
  nameIn.value = store.get('aurora-name', '');
  const hm = location.hash.match(/^#\/sala\/([A-Za-z]{4})/);
  const sala = ((hm && hm[1]) || params.get('sala') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  if (sala) document.title = `Convite · Sala ${sala} · Mistério no Aurora`;
  if (sala) { codeIn.value = sala; $('#btn-join').classList.add('gold'); $('#btn-create').classList.remove('gold'); }
  codeIn.addEventListener('input', () => { codeIn.value = codeIn.value.toUpperCase().replace(/[^A-Z]/g, ''); });
  const getName = () => { const n = nameIn.value.trim(); if (!n) { $('#home-err').textContent = 'Diga seu nome, detetive.'; nameIn.focus(); return null; } store.set('aurora-name', n); return n; };
  $('#btn-create').onclick = () => { Sound.unlock(); const n = getName(); if (n) App.create(n); };
  $('#btn-join').onclick = () => {
    Sound.unlock(); const n = getName(); if (!n) return;
    const c = codeIn.value.trim(); if (c.length !== 4) { $('#home-err').textContent = 'O código da sala tem 4 letras.'; return; }
    App.join(c, n);
  };
  codeIn.addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-join').click(); });

  // retomar partidas
  const box = $('#resume-box'); let html = '';
  const h = store.get('aurora-host');
  if (h && h.st && h.st.phase !== 'lobby' && Date.now() - h.at < 1000 * 60 * 60 * 12) html += `<button class="btn sm" id="resume-host">↺ Retomar a partida que eu hospedava (sala ${h.code})</button>`;
  const l = store.get('aurora-last');
  if (l && Date.now() - l.at < 1000 * 60 * 60 * 12 && (!h || h.code !== l.code)) html += `<button class="btn sm" id="resume-client">↺ Voltar para a sala ${l.code} como ${esc(l.name)}</button>`;
  box.innerHTML = html;
  if ($('#resume-host')) $('#resume-host').onclick = () => { Sound.unlock(); App.create(h.st.players.find(p => p.id === h.st.hostId)?.name || 'Anfitrião', h); };
  if ($('#resume-client')) $('#resume-client').onclick = () => { Sound.unlock(); App.join(l.code, l.name, l.token); };
})();
