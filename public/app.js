// RaidFolk_idle — klient.

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const nf = (n) => Number(n ?? 0).toLocaleString('pl-PL');

let TOKEN = localStorage.getItem('rf_token') || null;
let S = null;               // stan z serwera

// ---------------------------------------------------------------- sieć

async function api(path, body) {
  const res = await fetch('/api/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify({ ...body, token: TOKEN }) : undefined,
  });
  const data = await res.json().catch(() => ({ error: 'Zła odpowiedź serwera' }));
  if (res.status === 401) { localStorage.removeItem('rf_token'); location.reload(); return {}; }
  if (data.state) S = data.state;
  if (data.error) toast(data.error, true);
  return data;
}

function toast(msg, err = false) {
  $$('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 2600);
}

// ---------------------------------------------------------------- ekran startowy

import { SHAPES, SYMBOLS, COLORS, DEFAULT_CREST, randomCrest, crestSvg } from './crest.js';

let crest = { ...DEFAULT_CREST };
const heroCrest = (size) => crestSvg(S?.crest ?? DEFAULT_CREST, size);

function paintMaker() {
  $('#crestPreview').innerHTML = crestSvg(crest, 104);
  $('#crestName').textContent = $('#name').value.trim() || '—';
  $$('#pickShape  button').forEach(b => b.classList.toggle('on', b.dataset.v === crest.shape));
  $$('#pickSymbol button').forEach(b => b.classList.toggle('on', b.dataset.v === crest.symbol));
  $$('#pickColor  button').forEach(b => b.classList.toggle('on', b.dataset.v === crest.color));
  $$('#pickBorder button').forEach(b => b.classList.toggle('on', b.dataset.v === crest.border));
  $$('#pickInk    button').forEach(b => b.classList.toggle('on', b.dataset.v === crest.ink));
}

function buildPickers() {
  $('#pickShape').innerHTML = Object.entries(SHAPES).map(([k, v]) =>
    `<button data-v="${k}" title="${esc(v.label)}">${crestSvg({ ...crest, shape: k }, 36)}</button>`).join('');
  // Kafelek symbolu dostaje tło w kolorze środka herbu — inaczej ciemny symbol
  // znika na ciemnym tle, a przy okazji od razu widać, jak wyjdzie na herbie.
  const inkCol = (COLORS[crest.ink] ?? COLORS.smola).base;
  const fillCol = (COLORS[crest.color] ?? COLORS.mosiadz).base;
  $('#pickSymbol').innerHTML = Object.entries(SYMBOLS).map(([k, v]) =>
    `<button data-v="${k}" title="${esc(v.label)}" style="background:${fillCol}">
       <span class="glyph" style="color:${inkCol}">${v.g}</span></button>`).join('');

  const swatches = () => Object.entries(COLORS).map(([k, v]) =>
    `<button data-v="${k}" title="${esc(v.label)}"><i style="background:${v.base}"></i></button>`).join('');
  $('#pickColor').innerHTML = swatches();
  $('#pickBorder').innerHTML = swatches();
  $('#pickInk').innerHTML = swatches();

  const wire = (sel, key) => $$(sel + ' button').forEach(b => b.onclick = () => {
    crest[key] = b.dataset.v;
    if (key !== 'symbol') buildPickers();     // podgląd kształtów przejmuje aktualne kolory
    paintMaker();
  });
  wire('#pickShape', 'shape');
  wire('#pickSymbol', 'symbol');
  wire('#pickColor', 'color');
  wire('#pickBorder', 'border');
  wire('#pickInk', 'ink');
}

async function boot() {
  if (TOKEN) {
    const d = await fetch('/api/state?token=' + TOKEN).then(r => r.json()).catch(() => ({}));
    if (d.state) { S = d.state; enterGame(); return; }
    localStorage.removeItem('rf_token'); TOKEN = null;
  }

  crest = randomCrest();
  buildPickers();
  paintMaker();
  $('#name').addEventListener('input', () => {
    $('#crestName').textContent = $('#name').value.trim() || '—';
  });
  $('#roll').onclick = () => { crest = randomCrest(); buildPickers(); paintMaker(); };

  // Herb → imię → gra. Bez przystanków: żadnego wprowadzenia, żadnego wyboru klasy.
  $('#create').onclick = async () => {
    const name = $('#name').value.trim();
    if (!name) return toast('Podaj imię', true);
    const d = await api('new', { name, crest });
    if (d.token) {
      TOKEN = d.token; localStorage.setItem('rf_token', TOKEN);
      enterGame();
    }
  };
  $('#name').addEventListener('keydown', e => { if (e.key === 'Enter') $('#create').click(); });

  // Wczytanie postaci kodem — ratuje przed utratą postaci przy zmianie adresu serwera.
  const restore = async () => {
    const code = $('#code').value.trim();
    if (!code) return toast('Wklej kod', true);
    const d = await fetch('/api/state?token=' + encodeURIComponent(code)).then(r => r.json()).catch(() => ({}));
    if (!d.state) return toast('Nie znaleziono takiej postaci', true);
    TOKEN = code; localStorage.setItem('rf_token', TOKEN); S = d.state;
    toast(`Wczytano: ${S.name}`);
    enterGame();
  };
  $('#restore').onclick = restore;
  $('#code').addEventListener('keydown', e => { if (e.key === 'Enter') restore(); });
}

function openTab(name) {
  $$('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  $$('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + name));
  $('.screens').scrollTop = 0;
}

function enterGame() {
  $('#start').hidden = true;
  $('#app').hidden = false;
  render();
  // Kopanie przetrwało odświeżenie strony — serwer pamięta, co gracz robił.
  if (S.activity) {
    const s = S.skills[S.activity.skill];
    const r = s?.resources?.find(x => x.id === S.activity.res);
    if (r) startMineLoop(r.id, r.ms);
  }
}

// ---------------------------------------------------------------- render

function header() {
  const box = $('#hdrCrest');
  if (box) box.innerHTML = heroCrest(30);
  $('#hdrName').textContent = S.name;
  $('#hdrMeta').textContent = `POZIOM ${S.poziom} · MOC ${nf(S.stats.power)} · ${S.actName.toUpperCase()}`;
  const purse = $('#hdrPurse');
  if (purse) purse.innerHTML = `${nf(S.gold)} zł<br>${S.keys ?? 0} 🔑`;
}

// ---------------------------------------------------------------- walka

// Stan odtwarzania walki po stronie klienta.
// Trzymany osobno, żeby render() nie przerysowywał areny w trakcie animacji.
let FIGHT = null;   // { log, idx, timer, php, pmax, ehp, emax, enemy, result, mode }

// AUTO: ciąg fal leci sam, aż piętro padnie albo padniesz Ty. To jest cała
// pętla idle — playback chodzi na timerze klienta, więc nie przerywa go
// przejście na inną zakładkę.
let AUTO = false;
let SPEED = 1;      // mnożnik tempa odtwarzania: ×1 albo ×2

const LOG_CLASS = { crit: 'crit', heal: 'heal', enemy: 'enemy', win: 'win', lose: 'lose',
                    hit: 'hit', miss: 'miss', info: 'info', buff: 'buff', ult: 'ult',
                    kill: 'win', down: 'lose', lost: 'lost' };

function waveDots() {
  let d = '';
  for (let i = 0; i < S.fightsOnFloor; i++) {
    const cls = i < S.fight ? 'done' : i === S.fight ? 'now' : '';
    d += `<i class="${cls}"></i>`;
  }
  return `<div class="waves">${d}</div>`;
}

const PARTY_SLOTS = 5;          // Ty + 3 sojuszników + pet
const SLOT_ICON_PARTY = [null, '👤', '👤', '👤', '🐺'];
const SLOT_LABEL = [null, 'sojusznik', 'sojusznik', 'sojusznik', 'pet'];

function unitBox(u, opts = {}) {
  if (!u) {
    return `<div class="unit empty">
      <div class="png"></div>
      <div class="nm">${esc(opts.label ?? '—')}</div>
      <div class="bar"><i style="width:0"></i></div>
      <div class="hpn">wolne</div></div>`;
  }
  const pct = Math.round(u.hp / u.maxHp * 100);
  const dead = !u.alive || u.hp <= 0;
  return `<div class="unit ${opts.me ? 'me' : ''} ${dead ? 'dead' : ''}">
    <div class="png">${opts.icon ?? '👹'}</div>
    <div class="nm">${esc(u.name)}</div>
    <div class="bar ${opts.foe ? 'foe' : 'hp'}"><i style="width:${pct}%"></i></div>
    <div class="hpn">${nf(u.hp)} / ${nf(u.maxHp)}</div></div>`;
}

function arenaHtml() {
  const F = FIGHT;
  const enemies = F.enemies ?? [];
  const party = F.party ?? [];

  let h = '<div class="side foe-side">';
  for (let i = 0; i < Math.max(1, enemies.length); i++) {
    h += unitBox(enemies[i], { foe: true, icon: S.isBoss ? '👑' : '👹' });
  }
  h += '</div>';

  h += `<div class="charge-wrap">
    <div class="charge"><i style="width:${Math.round((F.charge ?? 0) / (S.chargeMax || 10) * 100)}%"></i></div>
    <div class="charge-n">${F.charge ?? 0} / ${S.chargeMax || 10}</div>
  </div>`;

  h += '<div class="side">';
  for (let i = 0; i < PARTY_SLOTS; i++) {
    h += unitBox(party[i], {
      me: i === 0,
      icon: i === 0 ? heroCrest(34) : SLOT_ICON_PARTY[i],
      label: SLOT_LABEL[i],
    });
  }
  h += '</div>';
  return h;
}

function renderFightView() {
  const F = FIGHT;
  let h = `<div class="scr-head">Piętro ${S.floor}
    <span>FALA ${Math.min(S.fight + 1, S.fightsOnFloor)} / ${S.fightsOnFloor}</span></div>`;
  h += waveDots();
  h += `<div id="arena">${arenaHtml()}</div>`;
  h += `<div class="log" id="fightlog"></div>`;

  if (F.mode === 'turowa' && !F.result) h += actionMenu();

  if (F.playing) {
    h += `<div class="actions"><button class="btn ghost" data-act="skipplay">Pomiń animację</button></div>`;
  }

  if (F.result) h += renderFightResult(F.result);
  return h;
}

// Menu akcji: Atak / Skille / Itemy — sekcjami, nie jednym rzędem przycisków.
function actionMenu() {
  const F = FIGHT;
  const cd = F.cooldowns ?? {};
  const full = (F.charge ?? 0) >= (S.chargeMax || 10);
  const U = S.ultimate;

  const atRisk = (F.charge ?? 0) > 0;

  let h = `<div class="sec">${esc(S.name)}</div><div class="strikes">`;
  for (const [k, v] of Object.entries(S.strengths)) {
    const risk = atRisk ? Math.round((1 - v.chance) * 100) : 0;
    h += `<button class="btn strike" data-act="strike" data-s="${k}">
      <b>${esc(v.label)}</b>
      <span>×${v.dmg.toFixed(2)} · ładuje ${v.charge}</span>
      <span class="ch">${Math.round(v.chance * 100)}% trafienia</span>
      ${atRisk ? `<span class="risk">${risk}% utraty paska</span>` : ''}</button>`;
  }
  h += `</div>`;

  if (atRisk) {
    h += `<div class="card"><div class="t2">
      Pudło zeruje pasek. Masz na nim <b style="color:var(--brass)">${F.charge}</b> —
      im mocniej bijesz, tym większa szansa, że stracisz wszystko.</div></div>`;
  }

  h += `<button class="btn ult wide ${full ? 'ready' : ''}" data-act="ultimate" ${full ? '' : 'disabled'}>
    <b>${esc(U.label)}</b>
    <span>${full ? esc(U.desc) : `pasek ${F.charge ?? 0} / ${S.chargeMax}`}</span>
  </button>`;

  h += `<div class="sec">Umiejętności</div>`;
  for (const a of S.abilities) {
    const left = cd[a.id] ?? 0;
    h += `<button class="card row skillbtn" data-act="ability" data-id="${a.id}" ${left ? 'disabled' : ''}>
      <div class="icon">${left ? left : '✦'}</div>
      <div class="grow"><div class="t1">${esc(a.label)}</div>
        <div class="t2">${esc(a.desc)}</div></div>
      <span class="badge ${left ? '' : 'on'}">${left ? `${left} tur` : `CD ${a.cd}`}</span>
    </button>`;
  }

  h += `<div class="sec">Obrona</div>
    <button class="card row skillbtn" data-act="defend">
      <div class="icon">🛡</div>
      <div class="grow"><div class="t1">Stań w obronie</div>
        <div class="t2">Oddajesz cios. Do następnej tury obrywasz o połowę mniej.</div></div>
      <span class="badge on">TURA</span>
    </button>`;

  h += `<div class="sec">Przedmioty</div>
    <button class="card row skillbtn" data-act="strikepotion" ${S.potions ? '' : 'disabled'}>
      <div class="icon">🧪</div>
      <div class="grow"><div class="t1">Mikstura</div>
        <div class="t2">Leczy 35% HP. Każda kolejna w tej walce o 10% słabiej.</div></div>
      <span class="badge ${S.potions ? 'on' : ''}">${S.potions}</span>
    </button>`;

  return h;
}

function renderFightResult(f) {
  const me = f.party?.[0];
  const hpPct = me?.maxHp ? Math.max(0, Math.round(me.hp / me.maxHp * 100)) : 0;

  let h = `<div class="sec">${(f.durationMs / 1000).toFixed(1)} s · ${f.turns} tur</div>`;

  if (!f.win) {
    h += `<div class="card bad cleared">
      <div class="big-word bad">PORAŻKA</div>
      <div class="t2" style="text-align:center">${esc(f.enemy.name)} był za mocny.
        Wracasz na pierwszą falę tego piętra z pełnym zdrowiem —
        nie tracisz nic poza czasem i wypitymi miksturami.</div>
      <button class="btn solid big wide" style="margin-top:12px" data-act="closefight">Spróbuj jeszcze raz</button>
    </div>`;
    return h;
  }

  if (f.floorCleared) {
    h += `<div class="card hi cleared"><div class="big-word">PIĘTRO ZDOBYTE</div></div>`;
  }

  h += `<div class="card">
    <div class="stat"><span class="k">Złoto</span><span class="v up">+${nf(f.gold)}</span></div>
    ${f.potionsUsed ? `<div class="stat"><span class="k">Mikstury</span><span class="v down">−${f.potionsUsed}</span></div>` : ''}
    <div class="stat"><span class="k">Zdrowie po walce</span>
      <span class="v ${hpPct < 40 ? 'down' : ''}">${nf(me?.hp ?? 0)} / ${nf(me?.maxHp ?? 0)} · ${hpPct}%</span></div>
    <div class="bar hp big" style="margin-top:6px"><i style="width:${hpPct}%"></i></div>
    ${f.floorCleared ? '' : `<div class="t2" style="margin-top:7px">Tyle wchodzi w następną falę. HP nie wraca.</div>`}
  </div>`;

  if (f.trophy) {
    h += `<div class="sec">Kronika</div>
      <div class="card hi"><div class="t1">Nowe trofeum: ${esc(f.trophy)}</div>
        <div class="t2">Odsłonięte na zawsze w Kronice, w karcie ${esc(f.enemy.name)}.</div></div>`;
  }

  if (f.loot.length) h += `<div class="sec">Łup · ${f.loot.length}</div>` + f.loot.map(it => itemRow(it)).join('');
  if (f.backpackFull) h += `<div class="card bad"><div class="t2">Plecak pełny — reszta łupu przepadła.</div></div>`;

  h += `<div class="actions">
    <button class="btn solid" data-act="closefight">${f.floorCleared ? 'Dalej' : 'Następna fala'}</button>
  </div>`;
  return h;
}

// Odtwarzanie logu: paski spadają krok po kroku, zamiast wyskakiwać na gotowe.
// `from` pozwala dograć tylko nowe wpisy — w trybie turowym gracz widział już resztę
// i nie ma sensu puszczać mu całej walki od początku.
function startPlayback(result, from = 0) {
  const F = FIGHT;
  F.log = result.log;
  F.idx = from;
  F.playing = true;
  F.pendingResult = result;
  F.result = null;
  drawFightView();
  tickPlayback();
}

function tickPlayback() {
  const F = FIGHT;
  if (!F || !F.playing) return;

  // Podbijamy indeks dopiero po sprawdzeniu wpisu. Wcześniej wychodził poza log
  // i przerysowanie ekranu po walce leciało na undefined.
  const entry = F.log[F.idx];
  if (!entry) return finishPlayback();
  F.idx++;

  F.party = entry.party; F.enemies = entry.enemies; F.charge = entry.charge;
  paintArena();
  appendLog(entry);
  paintCombatBar();          // pasek ma żyć także wtedy, gdy patrzysz na ekwipunek

  const rest = F.log.length - F.idx;
  const delay = (rest > 24 ? 40 : rest > 12 ? 90 : 170) / SPEED;   // przyspiesz, gdy log długi
  F.timer = setTimeout(tickPlayback, delay);
}

function finishPlayback() {
  const F = FIGHT;
  clearTimeout(F.timer);
  F.playing = false;
  // dociągnij resztę logu bez animacji
  while (F.idx < F.log.length) { appendLog(F.log[F.idx]); F.idx++; }
  const last = F.log[F.log.length - 1];
  if (last) { F.party = last.party; F.enemies = last.enemies; F.charge = last.charge; paintArena(); }
  F.result = F.pendingResult;

  // Ciąg fal: wygrana i piętro jeszcze niezdobyte — następna fala rusza sama.
  // Przegrana albo zdobyte piętro zatrzymują ciąg i oddają ekran graczowi.
  if (AUTO && F.result?.win && !F.result.floorCleared) {
    setTimeout(() => { if (AUTO) { FIGHT = null; startWave(); } }, 600 / SPEED);
    paintCombatBar();
    return;
  }
  AUTO = false;
  drawFightView();
  paintCombatBar();
}

function paintArena() {
  const el = $('#arena');
  if (el) el.innerHTML = arenaHtml();
}

function appendLog(entry) {
  const el = $('#fightlog');
  if (!el) return;
  const d = document.createElement('div');
  d.className = LOG_CLASS[entry.kind] ?? '';
  d.textContent = entry.text;
  el.append(d);
  el.scrollTop = el.scrollHeight;      // przewija się TYLKO log, nie cała strona
}

function syncFightHp() {
  const F = FIGHT;
  const last = F.log[F.idx - 1];
  if (last) { F.party = last.party; F.enemies = last.enemies; F.charge = last.charge; }
}

// Przerysowuje tylko menu akcji — arena i log zostają nietknięte,
// żeby nic nie skakało pod palcem.
function drawActionMenu() {
  const old = $('.strikes');
  if (!old) return drawFightView();
  const tmp = document.createElement('div');
  tmp.innerHTML = actionMenu();
  // podmień wszystko od pierwszego .sec menu w dół
  let node = old.previousElementSibling;
  while (node && node.nextElementSibling) node.nextElementSibling.remove();
  if (node) node.remove();
  $('#s-wyprawa').append(...tmp.childNodes);
}

function drawFightView() {
  $('#s-wyprawa').innerHTML = renderFightView();
  if (FIGHT?.log) {
    const el = $('#fightlog');
    if (el) {
      for (let i = 0; i < FIGHT.idx; i++) {
        const e = FIGHT.log[i];
        const d = document.createElement('div');
        d.className = LOG_CLASS[e.kind] ?? '';
        d.textContent = e.text;
        el.append(d);
      }
      el.scrollTop = el.scrollHeight;
    }
  }
}

// ---------------------------------------------------------------- WYPRAWA
// Hub trybów. Działa jeden — Wieża. Reszta stoi widoczna i wyłączona, żeby było
// wiadomo, dokąd to idzie, i żeby nikt nie klikał w obietnicę.

let advView = 'hub';     // 'hub' | 'wieza'

const TRYBY = [
  { id: 'wieza',  ic: '🗼', label: 'Wieża',      stan: 'on',
    desc: 'Wspinaczka bez końca. Piętro to od sześciu do dziesięciu fal, co dziesiąte pilnuje boss.' },
  { id: 'wyprawa',ic: '🧭', label: 'Wyprawa',    stan: 'soon',
    desc: 'Dłuższy wypad poza wieżę, z prawdziwą stawką i śmiercią, która coś kosztuje.' },
  { id: 'wboss',  ic: '🐉', label: 'World Boss', stan: 'lock',
    desc: 'Jeden przeciwnik dla całego serwera, bity przez wielu graczy naraz.' },
  { id: 'kolos',  ic: '🗿', label: 'Kolos',      stan: 'lock',
    desc: 'Walka na wytrzymałość, liczona w fazach zamiast w falach.' },
  { id: 'tytan',  ic: '☄',  label: 'Tytan',      stan: 'lock',
    desc: 'Szczyt rozgrywki końcowej. Nagroda wraca do herbu.' },
];

const STAN_BADGE = { on: 'OTWARTE', soon: 'WKRÓTCE', lock: 'ZAMKNIĘTE' };

function renderHub() {
  let h = `<div class="scr-head">Wyprawa <span>PIĘTRO ${S.maxFloor}</span></div>`;
  h += `<div class="modes">`;
  for (const t of TRYBY) {
    const czynny = t.stan === 'on';
    h += `<button class="card row mode-card compact ${czynny ? 'hi' : 'off'}" title="${esc(t.desc)}"
      ${czynny ? `data-act="opentower"` : ''} ${czynny ? '' : 'disabled'}>
      <div class="icon lg">${t.ic}</div>
      <div class="grow">
        <div class="t1">${esc(t.label)}</div>
        <div class="t2">${czynny
          ? `${esc(S.actName)} · piętro ${S.floor} z ${S.actId * 10}`
          : esc(t.desc)}</div>
      </div>
      <span class="badge ${czynny ? 'on' : ''}">${STAN_BADGE[t.stan]}</span>
    </button>`;
  }
  return h + `</div>`;
}

// Lista pięter biomu. Zamknięte piętra pokazują tylko numer — co jest wyżej,
// zobaczysz dopiero, gdy tam wejdziesz.
function floorGrid() {
  let h = `<div class="floors">`;
  for (const f of S.floors) {
    const cls = [f.here ? 'here' : '', f.cleared ? 'done' : '', f.unlocked ? '' : 'lock',
                 f.isBoss ? 'boss' : ''].filter(Boolean).join(' ');
    h += `<button class="floor ${cls}" ${f.unlocked ? `data-act="goto" data-f="${f.floor}"` : 'disabled'}>
      <span class="n">${f.floor}</span>
      <span class="k">${f.isBoss ? 'BOSS' : f.unlocked ? (f.isPlus ? '+' : `${f.fights}×`) : '🔒'}</span>
    </button>`;
  }
  return h + `</div>`;
}

function renderWieza() {
  const done = S.fight >= S.fightsOnFloor;
  const e = S.nextEnemy;
  const st = S.stats;
  const hpPct = Math.round(st.hp / st.maxHp * 100);

  let html = `<div class="scr-head">
    <button class="lnk" data-act="hub">‹ Wyprawa</button>
    <span>${esc(S.actName.toUpperCase())} · PIĘTRO ${S.floor}</span></div>`;

  html += `<div class="two-col">`;

  // ---- lewa: gdzie jesteś ----
  html += `<div class="col">
    ${floorGrid()}
    <div class="card hi" style="margin-top:8px">
      <div class="row" style="margin-bottom:7px">
        <div class="grow"><div class="t1">Piętro ${S.floor}${S.isBoss ? ` · ${esc(S.bossName ?? 'Boss')}` : ''}</div>
          <div class="t2">${S.isBoss ? 'Jedna walka, turowa' : `${S.fightsOnFloor} fal · HP nie wraca`}</div></div>
        <span class="badge on">${S.isBoss ? 'BOSS' : S.isPlus ? 'PIĘTRO +' : 'ZWYKŁE'}</span>
      </div>
      ${waveDots()}
    </div>

    <div class="card ${hpPct < 40 ? 'bad' : ''}" style="margin-top:6px">
      <div class="row" style="margin-bottom:6px">
        <div class="grow"><div class="t1">Zdrowie ${nf(st.hp)} / ${nf(st.maxHp)}</div>
          <div class="t2">Mikstury: ${S.potions}</div></div>
        <span class="num" style="font-size:17px;color:${hpPct < 40 ? 'var(--blood)' : 'var(--brass)'}">${hpPct}%</span>
      </div>
      <div class="bar hp big"><i style="width:${hpPct}%"></i></div>
      <div class="actions">
        <button class="btn ghost" data-act="potion" ${S.potions && st.hp < st.maxHp ? '' : 'disabled'}>Wypij</button>
        <button class="btn ghost" data-act="buypotion">Kup za ${nf(40 + S.maxFloor * 6)}</button>
      </div>
    </div>
  </div>`;

  // ---- prawa: co robisz teraz ----
  html += `<div class="col">`;

  // Niedokończona walka turowa zostawiona na innym ekranie. Musi być z niej
  // wyjście w obie strony, inaczej postać zakleszcza się na zawsze.
  if (S.activeFight) {
    html += `<div class="card hi">
      <div class="t1">Masz niedokończoną walkę</div>
      <div class="t2">Turowa walka czeka na Twój ruch. Możesz do niej wrócić albo ją porzucić —
        porzucenie nic nie kosztuje, fala zaczyna się od nowa.</div>
      <div class="actions">
        <button class="btn solid" data-act="fight">Wróć do walki</button>
        <button class="btn ghost" data-act="abandon">Porzuć</button>
      </div>
    </div></div></div>`;
    return html;
  }

  if (done) {
    html += `<div class="card hi cleared">
      <div class="big-word">PIĘTRO ZDOBYTE</div>
      <div class="stat"><span class="k">Punkty drzewka</span><span class="v up">+${S.isBoss ? 5 : 1}</span></div>
      <div class="stat"><span class="k">Punkty atrybutów</span><span class="v up">+3</span></div>
      <div class="stat"><span class="k">Klucze Przywołania</span><span class="v up">+${S.isBoss ? 3 : 1}</span></div>
      <div class="stat"><span class="k">Zdrowie</span><span class="v up">pełne na nowym piętrze</span></div>
      <button class="btn solid big wide" style="margin-top:10px" data-act="advance">Wejdź na piętro ${S.floor + 1}</button>
    </div></div></div>`;
    return html;
  }

  html += S.forcedTurn
    ? `<div class="card hi"><div class="t1">Walka turowa</div>
        <div class="t2">Boss aktu nie gra się sam. Każdy cios, umiejętność i mikstura są Twoje.</div></div>`
    : `<div class="segs">
        <button data-act="mode" data-m="auto"   aria-selected="${S.mode === 'auto'}">Automatyczna</button>
        <button data-act="mode" data-m="turowa" aria-selected="${S.mode === 'turowa'}">Turowa</button>
      </div>`;

  html += `<div class="sec">Fala ${S.fight + 1} z ${S.fightsOnFloor}</div>
    <div class="units">
      <div class="unit me"><div class="png">${heroCrest(38)}</div>
        <div class="nm">${esc(S.name)}</div>
        <div class="bar hp"><i style="width:${hpPct}%"></i></div>
        <div class="hpn">${nf(st.hp)}</div></div>
      <div class="unit"><div class="png">${S.isBoss ? '👑' : '👹'}</div>
        <div class="nm">${esc(e.name)}</div>
        <div class="bar foe"><i style="width:100%"></i></div>
        <div class="hpn">${nf(e.maxHp)}</div></div>
    </div>
    <div class="card">
      <div class="stat"><span class="k">Atak</span><span class="v">${nf(st.damage)} vs ${nf(e.damage)}</span></div>
      <div class="stat"><span class="k">Prędkość</span><span class="v">${st.speed} vs ${e.speed}</span></div>
      <div class="stat"><span class="k">Obrona</span><span class="v">${st.armor} vs ${e.armor}</span></div>
      <div class="stat"><span class="k">Celność</span><span class="v">${Math.round(st.accuracy * 100)}%</span></div>
    </div>
    <button class="btn solid big wide" style="margin-top:8px" data-act="fight">
      ${S.isBoss ? 'Stań do bossa' : S.mode === 'auto' ? 'Ruszaj — fale lecą same' : 'Walcz'}</button>`;

  html += `</div></div>`;
  return html;
}

function renderWyprawa() {
  if (FIGHT) return renderFightView();
  return advView === 'wieza' ? renderWieza() : renderHub();
}

function rarityColor(r) { return S.rarities[r]?.color ?? '#888'; }

function itemRow(it, opts = {}) {
  const rar = S.rarities[it.rarity];
  const eqCheck = opts.equipped ? null : canEquipLocal(it);
  const affix = (it.affixes ?? []).map(a =>
    `${a.label} +${a.value}${a.pct ? '%' : ''}`).join(' · ');
  return `<div class="card row" data-item="${it.id}">
    <div class="icon" style="border-color:${rarityColor(it.rarity)}">${SLOT_ICON[it.slot] ?? '▪'}</div>
    <div class="grow">
      <div class="t1" style="color:${rarityColor(it.rarity)}">${esc(it.name)}</div>
      <div class="t2 num" title="Poziom przedmiotu — tyle pięter trzeba zdobyć, żeby go założyć.">${rar.label} · poz. ${it.ilvl}${it.damage ? ` · atak ${it.damage}` : ''}${it.armor ? ` · obrona ${it.armor}` : ''}</div>
      ${affix ? `<div class="t2">${esc(affix)}</div>` : ''}
      ${eqCheck && !eqCheck.ok ? `<div class="t2" style="color:#D9736B">${esc(eqCheck.reason)}</div>` : ''}
    </div>
    ${opts.equipped ? '' : `<div style="display:flex;flex-direction:column;gap:4px">
      <button class="btn" data-act="equip" data-id="${it.id}" ${eqCheck.ok ? '' : 'disabled'}>Załóż</button>
      <button class="btn ghost" data-act="sell" data-id="${it.id}">Sprzedaj</button></div>`}
  </div>`;
}

const SLOT_ICON = { bron:'🗡', offhand:'🛡', helm:'🪖', napiersnik:'🥋',
                    buty:'👢', rekawice:'🧤', pierscien:'💍', amulet:'📿' };

// Jedna bramka: poziom postaci. Serwer sprawdza to samo w canEquip().
function canEquipLocal(it) {
  return it.reqLevel > S.poziom
    ? { ok: false, reason: `Wymaga poziomu ${it.reqLevel} — masz ${S.poziom}` }
    : { ok: true };
}

const ATTR_LABEL = { sila: 'Siła', intelekt: 'Intelekt', zrecznosc: 'Zręczność', wytrzymalosc: 'Wytrzymałość' };
// Warstwa uniwersalna działa u każdego; obrażenia tylko z atrybutu swojej klasy.
const ATTR_DESC = {
  sila: 'obrażenia — tylko klasy siłowe',
  intelekt: 'obrażenia — tylko klasy magiczne',
  zrecznosc: 'prędkość · celność · unik · kryt (każdy)',
  wytrzymalosc: 'zdrowie i pancerz (każdy)',
};

// Makieta postaci przeniosła się do zakładki Ekwipunek — tam, gdzie gracz
// jej szuka. Postać zostaje kartą liczb: atrybuty, zasoby, drzewko, kod.

function renderPostac() {
  const st = S.stats;
  let h = `<div class="scr-head">
    <button class="lnk" data-act="tab" data-tab="wyprawa">‹ Wyprawa</button>
    <span>${esc(S.name.toUpperCase())} · POZIOM ${S.poziom}</span></div>`;

  h += `<div class="two-col">`;

  // ---- lewa kolumna: atrybuty, czyli jedyna rzecz, którą tu się KLIKA ----
  h += `<div class="col">
    <div class="card ${S.unspentAttr ? 'hi' : ''} row">
      <div class="grow"><div class="t1">Punkty do rozdania</div>
        <div class="t2">10 na start, 3 za każde zdobyte piętro</div></div>
      <span class="num big-n">${S.unspentAttr}</span>
    </div>`;

  for (const k of ['sila', 'intelekt', 'zrecznosc', 'wytrzymalosc']) {
    h += `<div class="card row attr-row" title="${esc(ATTR_DESC[k])}">
      <div class="grow"><div class="t1">${ATTR_LABEL[k]}</div><div class="t2">${ATTR_DESC[k]}</div></div>
      <span class="num" style="font-size:17px;width:38px;text-align:right">${st.attrs[k]}</span>
      <button class="btn" data-act="attr" data-attr="${k}" ${S.unspentAttr ? '' : 'disabled'}>+</button>
    </div>`;
  }
  h += `</div>`;

  // ---- prawa kolumna: liczby i sprawy administracyjne ----
  h += `<div class="col">
    <div class="card">
      <div class="stat"><span class="k">Złoto</span><span class="v" style="color:var(--brass)">${nf(S.gold)}</span></div>
      <div class="stat"><span class="k">Klucze Przywołania</span><span class="v">${S.keys ?? 0}</span></div>
      <div class="stat"><span class="k">Mikstury</span><span class="v">${S.potions}</span></div>
      <div class="stat"><span class="k">Moc</span><span class="v" style="color:var(--brass)">${nf(st.power)}</span></div>
    </div>

    <div class="card ${S.treePoints ? 'hi' : ''} row">
      <div class="grow"><div class="t1">Drzewko</div>
        <div class="t2">${S.treePoints ? 'Masz co wydać' : 'Punkt za piętro, pięć za bossa'}</div></div>
      <span class="num big-n">${S.treePoints}</span>
    </div>
    <button class="btn wide" data-act="tab" data-tab="drzewko">Otwórz drzewko</button>

    <div class="sec">Kod postaci</div>
    <div class="code-box" id="mycode">${esc(TOKEN ?? '')}</div>
    <div class="actions">
      <button class="btn" data-act="copycode">Kopiuj</button>
      <button class="btn ghost" data-act="logout">Zmień postać</button>
    </div>
    <div class="t2" style="margin-top:6px">Kto ma ten kod, ma Twoją postać. Zmiana postaci jej nie kasuje.</div>
  </div>`;

  h += `</div>`;
  return h;
}

// ---------------------------------------------------------------- drzewko klasy

// Opisy węzłów rodzą się z liczb w config — nie ma drugiego miejsca do poprawiania,
// gdy zmieni się balans.
const EFF_LABEL = {
  dmgPct:     { t: 'Obrażenia',            pct: true },
  hpPct:      { t: 'Zdrowie',              pct: true },
  armorPct:   { t: 'Pancerz',              pct: true },
  armorFlat:  { t: 'Pancerz',              pct: false },
  critChance: { t: 'Szansa na kryt',       pct: true },
  critPower:  { t: 'Siła kryta',           pct: true },
  speed:      { t: 'Prędkość ataku',       pct: false },
  accuracy:   { t: 'Celność',              pct: true },
  evasion:    { t: 'Unik',                 pct: true },
  block:      { t: 'Szansa na blok',       pct: true },
  blockCut:   { t: 'Siła bloku',           pct: true },
  potionPct:  { t: 'Leczenie z mikstur',   pct: true },
};

// dopełniacz — "obrażenia z Intelektu", nie "z Intelekt"
const ATTR_GEN = { sila: 'Siły', intelekt: 'Intelektu', zrecznosc: 'Zręczności', wytrzymalosc: 'Wytrzymałości' };

function effText(eff, mult = 1) {
  const parts = [];
  for (const [k, v] of Object.entries(eff)) {
    if (k === 'attrWeight') {
      for (const [a, w] of Object.entries(v)) {
        parts.push(`Obrażenia z ${ATTR_GEN[a] ?? a} +${(w * mult * 100).toFixed(0)}%`);
      }
      continue;
    }
    const d = EFF_LABEL[k];
    if (!d) continue;
    parts.push(d.pct
      ? `${d.t} +${(v * mult * 100).toFixed(1).replace(/\.0$/, '')}%`
      : `${d.t} +${Math.round(v * mult)}`);
  }
  return parts.join(' · ');
}

function renderDrzewko() {
  const total = (S.tree ?? []).reduce((s, b) => s + b.spent, 0);
  let h = `<div class="scr-head">
    <button class="lnk" data-act="tab" data-tab="postac">‹ Postać</button>
    <span>DRZEWKO BOHATERA</span></div>`;

  h += `<div class="card ${S.treePoints ? 'hi' : ''}">
    <div class="row"><div class="grow"><div class="t1">Punkty do wydania</div>
      <div class="t2">1 za piętro, 5 za bossa aktu · wydane: ${total}</div></div>
      <span class="num" style="font-size:22px;color:var(--brass)">${S.treePoints}</span></div>
  </div>`;

  h += `<div class="scrollbox"><div class="branches">`;
  for (const branch of S.tree ?? []) {
    h += `<div class="branch"><div class="sec">${esc(branch.label)} · ${branch.spent} pkt</div>`;
    for (const n of branch.nodes) {
      const pelny = n.rank >= n.max;
      const tip = n.unlocked
        ? `${effText(n.eff)} za rangę${n.rank ? ` · teraz ${effText(n.eff, n.rank)}` : ''}`
        : `Wymaga ${n.need} pkt w gałęzi ${branch.label}`;
      h += `<div class="card compact ${n.unlocked ? '' : 'locked'}" title="${esc(tip)}">
        <div class="row">
          <div class="grow">
            <div class="t1">${esc(n.label)}
              <span class="num" style="color:${n.rank ? 'var(--brass)' : 'var(--ink-mute)'}">${n.rank}/${n.max}</span></div>
            <div class="t2">${n.unlocked ? esc(effText(n.eff)) : `zamknięte — ${n.need} pkt w gałęzi`}</div>
          </div>
          <button class="btn" data-act="tree" data-node="${n.id}" ${n.canRaise ? '' : 'disabled'}>${pelny ? 'MAX' : '+'}</button>
        </div>
      </div>`;
    }
    h += `</div>`;
  }
  h += `</div>`;

  h += `<div class="card" style="margin-top:8px">
    <div class="row"><div class="grow"><div class="t1">Reset drzewka</div>
      <div class="t2">Zwraca wszystkie ${total} wydanych punktów. Koszt rośnie z poziomem.</div></div>
      <button class="btn" data-act="treereset" ${total && S.gold >= S.treeRespec ? '' : 'disabled'}>
        ${nf(S.treeRespec)} zł</button></div>
  </div></div>`;

  return h;
}

// ---------------------------------------------------------------- EKWIPUNEK
// Ekran ma się mieścić na jednym ekranie: makieta postaci i statystyki obok
// siebie u góry, plecak z kategoriami niżej. Scrolluje się WYŁĄCZNIE lista
// przedmiotów, bo tylko ona rośnie bez końca.

// Makieta 3×3 z portretem w środku. Głowa u góry, bronie po bokach,
// pancerz pod spodem, dodatki w rogach — czyta się bez legendy.
const DOLL_GRID = [
  ['rekawice', 'helm',       'amulet'],
  ['bron',     null,         'offhand'],
  ['buty',     'napiersnik', 'pierscien'],
];

let invCat = 'all';        // kategoria plecaka
let detail = null;         // { id, where: 'bag' | 'worn' | 'slot' }

const KATEGORIE = [
  ['all',  'Wszystko', null],
  ['bron', 'Broń',     ['bron', 'offhand']],
  ['panc', 'Pancerz',  ['helm', 'napiersnik', 'buty', 'rekawice']],
  ['dod',  'Dodatki',  ['pierscien', 'amulet']],
  ['mat',  'Surowce',  []],
];

function dollHtml() {
  const cell = (slot) => {
    if (!slot) {
      return `<div class="doll-hero">${heroCrest(52)}<span>${esc(S.name)}</span></div>`;
    }
    const it = S.equipped[slot];
    const wybrany = detail?.where === 'worn' && detail.slot === slot;
    return `<button class="doll-cell${it ? '' : ' empty'}${wybrany ? ' on' : ''}"
      data-act="slot" data-slot="${slot}" title="${esc(S.slots[slot].label)}"
      style="${it ? `border-color:${rarityColor(it.rarity)}` : ''}">
      <span class="ic">${SLOT_ICON[slot] ?? '▪'}</span>
      <span class="lb">${it ? esc(it.name.split(' ')[0]) : esc(S.slots[slot].label)}</span>
    </button>`;
  };
  return `<div class="doll">${DOLL_GRID.flat().map(cell).join('')}</div>`;
}

// Statystyki główne. Sześć liczb, które naprawdę o czymś mówią — reszta
// siedzi w podpowiedziach, żeby nie zasypać ekranu.
function statsHtml() {
  const st = S.stats;
  const w = (k, v, tip) => `<div class="stat-box" title="${esc(tip)}">
    <span class="k">${k}</span><span class="v">${v}</span></div>`;
  return `<div class="statgrid">
    ${w('Zdrowie', `${nf(st.hp)}/${nf(st.maxHp)}`, 'Nie wraca między falami. Pełne oddaje nowe piętro albo porażka.')}
    ${w('Atak', nf(st.damage), 'Obrażenia z jednego ciosu, przed pancerzem wroga. Rosną z Siły, Intelektu i Zręczności.')}
    ${w('Obrona', nf(st.armor), 'Pancerz. Zbija otrzymywane obrażenia — im więcej, tym mniejszy każdy cios.')}
    ${w('Kryt', `${(st.crit * 100).toFixed(1)}% ×${st.critMult.toFixed(2)}`, 'Szansa na trafienie krytyczne i jego mnożnik.')}
    ${w('Prędkość', st.speed, 'Jak często bijesz. 100 to cios co dwie sekundy.')}
    ${w('Moc', nf(st.power), 'Jedna liczba na porównanie buildów: atak, zdrowie i pancerz razem.')}
    ${w('Celność', `${Math.round(st.accuracy * 100)}%`, 'Szansa, że cios trafi. Pudło zeruje pasek ultimate.')}
    ${w('Unik', `${(st.evasion * 100).toFixed(1)}%`, 'Szansa, że cios wroga Cię minie.')}
    ${st.block ? w('Blok', `${Math.round(st.block * 100)}%`, 'Wymaga tarczy w drugiej ręce. Zablokowany cios traci połowę obrażeń.') : ''}
  </div>`;
}

// Ile dana statystyka wynosi z przedmiotu — do porównania z noszonym.
function itemStats(it) {
  const s = { dmg: it?.damage ?? 0, arm: it?.armor ?? 0 };
  for (const a of it?.affixes ?? []) {
    if (a.id === 'dmgFlat') s.dmg += a.value;
    else if (a.id === 'armorFlat') s.arm += a.value;
    else s[a.id] = (s[a.id] ?? 0) + a.value;
  }
  return s;
}

const STAT_NAZWA = {
  dmg: 'Atak', arm: 'Obrona', sila: 'Siła', intelekt: 'Intelekt',
  zrecznosc: 'Zręczność', wytrzymalosc: 'Wytrzymałość', wszystkie: 'Wszystkie staty',
  hpFlat: 'Zdrowie', critChance: 'Szansa na kryt', critPower: 'Siła kryta',
  speed: 'Prędkość', accuracy: 'Celność', evasion: 'Unik',
};
const STAT_PCT = new Set(['critChance', 'critPower', 'accuracy', 'evasion']);

// Panel szczegółu: nazwa, rzadkość, typ, slot, RÓŻNICA wobec noszonego, opis.
function detailHtml() {
  if (!detail) {
    return `<div class="card detail pusty"><div class="t2">Kliknij slot albo przedmiot,
      żeby zobaczyć, co robi i co zmieni.</div></div>`;
  }

  const it = detail.where === 'worn'
    ? S.equipped[detail.slot]
    : S.backpack.find(x => x.id === detail.id);

  if (!it) {
    const slot = detail.slot;
    return `<div class="card detail"><div class="t1">${esc(S.slots[slot]?.label ?? '—')}</div>
      <div class="t2">Pusty slot. Załóż tu coś z plecaka poniżej.</div></div>`;
  }

  const rar = S.rarities[it.rarity];
  const noszony = detail.where === 'bag' ? S.equipped[it.slot] : null;
  const mine = itemStats(it);
  const stare = itemStats(noszony);
  const klucze = [...new Set([...Object.keys(mine), ...Object.keys(stare)])];

  const diff = klucze.map(k => {
    const d = (mine[k] ?? 0) - (stare[k] ?? 0);
    if (!d) return '';
    const pct = STAT_PCT.has(k) ? '%' : '';
    return `<div class="stat"><span class="k">${STAT_NAZWA[k] ?? k}</span>
      <span class="v ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}${pct}</span></div>`;
  }).join('');

  const eqCheck = canEquipLocal(it);

  return `<div class="card detail" style="border-color:${rarityColor(it.rarity)}">
    <div class="d-head">
      <div class="icon lg" style="border-color:${rarityColor(it.rarity)}">${SLOT_ICON[it.slot] ?? '▪'}</div>
      <div class="grow">
        <div class="t1" style="color:${rarityColor(it.rarity)}">${esc(it.name)}</div>
        <div class="t2">${esc(rar.label)} · ${esc(S.slots[it.slot]?.label ?? it.slot)}${it.wtype ? ` · ${esc(it.wtype)}` : ''}</div>
      </div>
    </div>

    <div class="stat" title="Poziom przedmiotu. Tyle pięter trzeba zdobyć, żeby go założyć — i tyle waży jego baza obrażeń albo pancerza.">
      <span class="k">Poziom przedmiotu</span><span class="v">${it.ilvl}</span></div>
    ${it.damage ? `<div class="stat"><span class="k">Atak</span><span class="v">${nf(it.damage)}</span></div>` : ''}
    ${it.armor ? `<div class="stat"><span class="k">Obrona</span><span class="v">${nf(it.armor)}</span></div>` : ''}
    ${(it.affixes ?? []).map(a => `<div class="stat"><span class="k">${esc(a.label)}</span>
      <span class="v up">+${a.value}${a.pct ? '%' : ''}</span></div>`).join('')}

    ${detail.where === 'bag' && diff ? `<div class="sec">Zmiana wobec noszonego</div>${diff}` : ''}
    ${detail.where === 'bag' && !diff ? `<div class="sec">Zmiana</div>
      <div class="t2">Dokładnie to samo, co masz na sobie.</div>` : ''}

    ${!eqCheck.ok ? `<div class="t2" style="color:#D9736B;margin-top:8px">${esc(eqCheck.reason)}</div>` : ''}

    ${detail.where === 'bag' ? `<div class="actions">
      <button class="btn solid" data-act="equip" data-id="${it.id}" ${eqCheck.ok ? '' : 'disabled'}>Załóż</button>
      <button class="btn ghost" data-act="sell" data-id="${it.id}">Sprzedaj</button>
    </div>` : ''}
  </div>`;
}

function bagList() {
  const kat = KATEGORIE.find(k => k[0] === invCat);

  if (invCat === 'mat') {
    const mats = S.materials ?? [];
    if (!mats.length) {
      return `<div class="card"><div class="t2">Brak surowców. Kop w zakładce Skille.</div></div>`;
    }
    return mats.map(m => `<div class="inv-item mat">
      <div class="icon">🪨</div>
      <div class="grow"><div class="t1">${esc(m.label)}</div>
        <div class="t2">surowiec</div></div>
      <span class="num">${m.count}</span>
    </div>`).join('');
  }

  const lista = [...S.backpack].reverse()
    .filter(it => !kat[2] || kat[2].includes(it.slot));

  if (!lista.length) return `<div class="card"><div class="t2">Nic tu nie ma.</div></div>`;

  return lista.map(it => {
    const on = detail?.where === 'bag' && detail.id === it.id;
    const lepszy = S.equipped[it.slot]
      ? itemStats(it).dmg + itemStats(it).arm > itemStats(S.equipped[it.slot]).dmg + itemStats(S.equipped[it.slot]).arm
      : true;
    return `<button class="inv-item ${on ? 'on' : ''}" data-act="pick" data-id="${it.id}"
      style="border-color:${on ? rarityColor(it.rarity) : ''}">
      <div class="icon" style="border-color:${rarityColor(it.rarity)}">${SLOT_ICON[it.slot] ?? '▪'}</div>
      <div class="grow">
        <div class="t1" style="color:${rarityColor(it.rarity)}">${esc(it.name)}</div>
        <div class="t2">${esc(S.slots[it.slot]?.label ?? '')} · poz. ${it.ilvl}</div>
      </div>
      ${lepszy ? '<span class="up-dot" title="Lepsze od noszonego">▲</span>' : ''}
    </button>`;
  }).join('');
}

function renderEq() {
  const full = S.backpack.length >= S.backpackMax;

  let h = `<div class="scr-head">Ekwipunek
    <span>PLECAK ${S.backpack.length} / ${S.backpackMax}</span></div>`;

  h += `<div class="eq-top">
    <div class="eq-doll">${dollHtml()}</div>
    <div class="eq-side">${statsHtml()}${detailHtml()}</div>
  </div>`;

  h += `<div class="eq-bag">
    <div class="invtabs">
      ${KATEGORIE.map(([id, label]) => `<button class="${id === invCat ? 'on' : ''}"
        data-act="invcat" data-c="${id}">${label}</button>`).join('')}
      ${S.backpack.length ? `<button class="junk" data-act="selljunk"
        title="Sprzedaje wszystko gorsze od noszonego">Sprzedaj zbędne</button>` : ''}
    </div>
    ${full ? `<div class="card bad"><div class="t2">Plecak pełny — nowy łup przepada.</div></div>` : ''}
    <div class="invlist">${bagList()}</div>
  </div>`;

  return h;
}

// ---------------------------------------------------------------- DRUŻYNA
// Na razie sama struktura. Silnik walki już przyjmuje pięć jednostek po stronie
// gracza (patrz PARTY_SLOTS i createFight) — brakuje wyłącznie tego, czym je obsadzić.

function renderDruzyna() {
  const comp = S.collection?.companions ?? [];
  const pety = S.collection?.pets ?? [];
  const st = S.stats;

  let h = `<div class="scr-head">Drużyna <span>1 / 5 SLOTÓW</span></div>`;

  h += `<div class="card hi row">
    <div class="icon lg">${heroCrest(30)}</div>
    <div class="grow">
      <div class="t1">${esc(S.name)}</div>
      <div class="t2">poziom ${S.poziom} · moc ${nf(st.power)} · jedyny, który nosi ekwipunek</div>
    </div>
    <span class="badge on">AKTYWNY</span>
  </div>`;

  h += `<div class="scrollbox">`;
  h += `<div class="sec">Sojusznicy</div>`;
  for (let i = 0; i < 3; i++) {
    const c = comp[i];
    h += slotRow(c ? '👤' : '＋', c?.name ?? `Sojusznik ${i + 1}`, c
      ? `${esc(S.rarities[c.rarity]?.label ?? c.rarity)} · przywołany, jeszcze nie wchodzi do walki`
      : 'Pusty slot. Sojusznicy przychodzą z Przywołania.', c);
  }

  h += `<div class="sec">Pet</div>`;
  const p = pety[0];
  h += slotRow(p ? '🐺' : '＋', p?.name ?? 'Pet', p
    ? `${esc(S.rarities[p.rarity]?.label ?? p.rarity)} · przywołany, jeszcze nie wchodzi do walki`
    : 'Pusty slot. Pety przychodzą z Przywołania.', p);

  h += `<div class="sec">Zasady drużyny</div>
    <div class="card">
      <div class="t1" style="margin-bottom:6px">Ekwipunek należy tylko do Ciebie</div>
      <div class="t2"><b>Sojusznicy i pety nie noszą zwykłego sprzętu</b> — żadnych hełmów,
        napierśników ani mieczy. Rosną rzadkością, duplikatami i gwiazdkami.
        Legendary dostanie kiedyś własny relikt, a Legendary pet własną broń — i tyle.</div>
      <div class="t2" style="margin-top:7px">To także <b>oni mają klasy</b>, nie Ty.
        Twoja postać jest jedna i buduje się atrybutami, sprzętem i drzewkiem.</div>
    </div>`;
  h += `</div>`;

  return h;
}

function slotRow(ic, nazwa, opis, wypelniony) {
  return `<div class="card row ${wypelniony ? '' : 'off'}">
    <div class="icon lg" ${wypelniony ? `style="border-color:${rarityColor(wypelniony.rarity)}"` : ''}>${ic}</div>
    <div class="grow">
      <div class="t1" ${wypelniony ? `style="color:${rarityColor(wypelniony.rarity)}"` : ''}>${esc(nazwa)}</div>
      <div class="t2">${opis}</div>
    </div>
    <span class="badge ${wypelniony ? 'on' : ''}">${wypelniony ? 'W KOLEKCJI' : 'ZAMKNIĘTY'}</span>
  </div>`;
}

// ---------------------------------------------------------------- SKILLE
// Górnictwo GRA. Reszta to makiety.
//
// Pętla: klient trzyma zegar, po każdym cyklu woła /api/minetick, serwer wydaje
// dokładnie jeden cykl i sprawdza czas. Bez postępu offline, ale zmiana zakładki
// niczego nie gubi — timer chodzi dalej, bo to ta sama strona.

let skillOpen = 'gornictwo';
let MINE = null;         // { res, ms, t0, timer, raf }

function startMineLoop(res, ms) {
  stopMineLoop();
  MINE = { res, ms, t0: Date.now() };
  // setInterval, nie requestAnimationFrame: rAF zamiera, gdy strona nie jest
  // rysowana (zminimalizowane okno, tło), i pasek zastyga w miejscu.
  const rysuj = () => {
    if (!MINE) return;
    const pct = Math.min(100, (Date.now() - MINE.t0) / MINE.ms * 100);
    const bar = $('#mineprog'); if (bar) bar.style.width = pct + '%';
    const zeg = $('#minetime');
    if (zeg) zeg.textContent = Math.max(0, (MINE.ms - (Date.now() - MINE.t0)) / 1000).toFixed(1) + ' s';
  };
  rysuj();
  MINE.tick = setInterval(rysuj, 80);
  MINE.timer = setTimeout(async () => {
    const d = await api('minetick', {});
    if (d.error) { stopMineLoop(); render(); return; }
    if (d.awans) toast(`Górnictwo ${S.skills.gornictwo.lvl}!`);
    // Kolejny cykl rusza sam. STOP albo zmiana surowca to jedyne wyjście.
    const r = S.skills.gornictwo.resources.find(x => x.id === res);
    render();
    if (S.activity) startMineLoop(res, r.ms);
  }, ms + 60);
}

// Zatrzymuje wszystko, co po stronie klienta odtwarza walkę. Jedno miejsce,
// bo porzucenie i zmiana trybu muszą sprzątnąć dokładnie to samo.
function stopPlayback() {
  if (FIGHT?.timer) clearTimeout(FIGHT.timer);
  FIGHT = null;
  AUTO = false;
  paintCombatBar();
}

function stopMineLoop() {
  if (!MINE) return;
  clearTimeout(MINE.timer);
  clearInterval(MINE.tick);
  MINE = null;
}

function renderSkille() {
  const s = S.skills[skillOpen];
  const akt = S.activity;

  let h = `<div class="scr-head">Skille <span>ZBIERACKIE</span></div>`;

  h += `<div class="three-col">`;

  // ---- lewa: lista profesji ----
  h += `<div class="col skill-list">`;
  for (const [id, sk] of Object.entries(S.skills)) {
    const kopie = akt?.skill === id;
    h += `<button class="skillrow ${id === skillOpen ? 'on' : ''}" data-act="skill" data-id="${id}">
      <span class="ic">${sk.ic}</span>
      <span class="grow">
        <span class="nm">${esc(sk.label)}</span>
        <span class="lv">${sk.grywalne ? `Lv. ${sk.lvl}` : 'wkrótce'}</span>
      </span>
      ${kopie ? '<span class="dot"></span>' : ''}
    </button>`;
  }
  h += `</div>`;

  // ---- środek: surowce wybranej profesji ----
  h += `<div class="col skill-mid">`;
  if (!s.grywalne) {
    h += `<div class="card"><div class="t1">${esc(s.label)}</div>
      <div class="t2">Jeszcze nie działa. Docelowo: ${esc(s.daje)} — zasila ${esc(s.zasila)}.</div></div>`;
    for (const [nazwa, lv] of s.ladder ?? []) {
      h += `<div class="card row locked compact">
        <div class="grow"><div class="t1">${esc(nazwa)}</div></div>
        <span class="num">Lv.${lv}</span></div>`;
    }
  } else {
    h += `<div class="card xp-card">
      <div class="row">
        <div class="grow"><div class="t1">${esc(s.label)} · poziom ${s.lvl}</div>
          <div class="t2">${s.xp} / ${s.xpNeed} exp</div></div>
      </div>
      <div class="bar xp big" style="margin-top:6px"><i style="width:${Math.round(s.xp / s.xpNeed * 100)}%"></i></div>
    </div>`;

    for (const r of s.resources) {
      const kopie = akt?.res === r.id;
      h += `<button class="card row res-row ${r.unlocked ? '' : 'locked'} ${kopie ? 'hi' : ''}"
        ${r.unlocked ? `data-act="mine" data-res="${r.id}"` : 'disabled'}>
        <div class="icon">${r.unlocked ? '🪨' : '🔒'}</div>
        <div class="grow">
          <div class="t1">${esc(r.label)}</div>
          <div class="t2">${r.unlocked
            ? `${r.xp} exp · ${(r.ms / 1000).toFixed(1)} s`
            : `otwiera się na poziomie ${r.lvl}`}</div>
        </div>
        <span class="badge ${kopie ? 'on' : ''}">${kopie ? 'KOPIESZ' : `Lv.${r.lvl}`}</span>
      </button>`;
    }
  }
  h += `</div>`;

  // ---- prawa: co się teraz dzieje ----
  h += `<div class="col skill-now">`;
  if (akt && S.skills[akt.skill]?.grywalne) {
    const r = S.skills[akt.skill].resources.find(x => x.id === akt.res);
    h += `<div class="card hi">
      <div class="t1">Kopiesz: ${esc(r?.label ?? akt.res)}</div>
      <div class="t2" id="minetime">—</div>
      <div class="bar big" style="margin:9px 0"><i id="mineprog" style="width:0"></i></div>
      <div class="stat"><span class="k">Za cykl</span><span class="v">1 szt. · ${r?.xp ?? 0} exp</span></div>
      <div class="stat"><span class="k">Narzędzie</span><span class="v">Gołe ręce</span></div>
      <button class="btn wide" style="margin-top:10px" data-act="minestop">Przerwij</button>
    </div>`;
  } else {
    h += `<div class="card"><div class="t1">Nic nie kopiesz</div>
      <div class="t2">Wybierz surowiec obok. Kolejne cykle lecą same, aż klikniesz Przerwij.</div></div>`;
  }

  h += `<div class="sec">Surowce</div>`;
  const mats = S.materials ?? [];
  h += mats.length
    ? `<div class="matlist">${mats.map(m => `<div class="matrow">
        <span>${esc(m.label)}</span><span class="num">${m.count}</span></div>`).join('')}</div>`
    : `<div class="card"><div class="t2">Pusto. Wykopane trafia tutaj i do Ekwipunku → Surowce.</div></div>`;

  h += `<div class="card" style="margin-top:8px"><div class="t2">Poziom decyduje, <b>co</b> kopiesz.
    Narzędzie będzie decydować, <b>jak szybko</b>. Postęp po zamknięciu gry jeszcze nie działa.</div></div>`;
  h += `</div>`;

  h += `</div>`;
  return h;
}

// ---------------------------------------------------------------- PRZYWOŁANIE

let summonKind = 'companions';
let summonResult = null;      // { name, rarity, kind } — ostatnie losowanie

function renderSummon() {
  const keys = S.keys ?? 0;
  const stac = keys >= (S.keyCost ?? 1);

  let h = `<div class="scr-head">Przywołanie <span>KLUCZE ${keys}</span></div>`;

  h += `<div class="segs">
    <button data-act="summonkind" data-k="companions" aria-selected="${summonKind === 'companions'}">Sojusznicy</button>
    <button data-act="summonkind" data-k="pets"       aria-selected="${summonKind === 'pets'}">Pety</button>
  </div>`;

  h += `<div class="portal ${summonResult ? 'lit' : ''}">
    <div class="ring r1"></div><div class="ring r2"></div><div class="ring r3"></div>
    <div class="core">${summonKind === 'pets' ? '🐾' : '⚔'}</div>
  </div>`;

  if (summonResult) {
    const rar = S.rarities[summonResult.rarity];
    h += `<div class="reveal" style="--rar:${rarityColor(summonResult.rarity)}">
      <div class="rar">${esc(rar?.label ?? summonResult.rarity)}</div>
      <div class="nm">${esc(summonResult.name)}</div>
      <div class="t2">Trafił do kolekcji. Zobaczysz go w Drużynie i w Kronice.</div>
    </div>`;
  }

  h += `<div class="card">
    <div class="row">
      <div class="grow"><div class="t1">Klucz Przywołania</div>
        <div class="t2">Jeden za zdobyte piętro, trzy za bossa aktu. Nie kupisz go za pieniądze.</div></div>
      <span class="num" style="font-size:22px;color:var(--brass)">${keys}</span>
    </div>
  </div>`;

  h += `<button class="btn solid big wide" data-act="summon" ${stac ? '' : 'disabled'}>
    ${stac ? `Przywołaj ×1 — 1 klucz` : 'Brak kluczy'}</button>`;

  h += `<div class="sec">Dokąd to idzie</div>
    <div class="card"><div class="t2">Sojusznicy i pety losują się z <b>osobnych pul</b> — jedno losowanie
      nie może dać drugiego. Docelowo duplikaty podbijają gwiazdki, maksymalny duplikat zamienia się
      w esencję, a system ma <b>jawny pity</b>. Tego jeszcze nie ma — teraz to czysta próba odczucia.</div></div>`;

  return h;
}

// ---------------------------------------------------------------- KRONIKA

let logView = 'bestiariusz';
let logOpen = null;           // rozwinięty wpis bestiariusza

const LOG_TABS = [
  ['bestiariusz', 'Bestiariusz'], ['przedmioty', 'Przedmioty'], ['bossowie', 'Bossowie'],
  ['sojusznicy', 'Sojusznicy'], ['pety', 'Pety'], ['osiagniecia', 'Osiągnięcia'],
];

function renderKronika() {
  let h = `<div class="scr-head">Kronika <span>${esc((LOG_TABS.find(t => t[0] === logView) ?? [])[1] ?? '').toUpperCase()}</span></div>`;

  h += `<div class="logtabs">`;
  for (const [id, label] of LOG_TABS) {
    h += `<button class="${id === logView ? 'on' : ''}" data-act="logview" data-v="${id}">${label}</button>`;
  }
  h += `</div><div class="scrollbox">`;

  if (logView === 'bestiariusz') h += bestiariuszHtml(e => !e.family.includes('Strażnik'));
  else if (logView === 'bossowie') h += bestiariuszHtml(e => e.family.includes('Strażnik'));
  else if (logView === 'sojusznicy') h += kolekcjaHtml('companions', '👤', 'Sojusznicy przychodzą z Przywołania.');
  else if (logView === 'pety') h += kolekcjaHtml('pets', '🐺', 'Pety przychodzą z Przywołania.');
  else if (logView === 'przedmioty') {
    h += `<div class="card"><div class="t1">Katalog przedmiotów</div>
      <div class="t2">Jeszcze nie prowadzony. Docelowo każdy przedmiot, który raz przeszedł Ci przez ręce,
      zostaje tu na zawsze — z afiksami, źródłem i tym, gdzie wypada.</div></div>`;
  } else {
    h += `<div class="card"><div class="t1">Osiągnięcia</div>
      <div class="t2">Jeszcze nie prowadzone. Docelowo to one wracają do herbu:
      pełny bestiariusz Puszczy da symbol wilka, setny boss da obramowanie, Tytan da aurę.</div></div>`;
  }

  h += `</div>`;
  return h;
}

function bestiariuszHtml(filtr) {
  const lista = (S.bestiary ?? []).filter(filtr);
  const odkryte = lista.filter(e => e.seen).length;
  let h = `<div class="card"><div class="row">
    <div class="grow"><div class="t1">Odkryte</div>
      <div class="t2">Wpis otwiera się przy pierwszym zabiciu</div></div>
    <span class="num" style="font-size:17px;color:var(--brass)">${odkryte} / ${lista.length}</span>
  </div></div>`;

  for (const e of lista) {
    const open = logOpen === e.family;
    h += `<button class="card row ${e.seen ? '' : 'locked'}" data-act="logopen" data-f="${esc(e.family)}">
      <div class="icon">${e.seen ? (e.family.includes('Strażnik') ? '👑' : '👹') : '?'}</div>
      <div class="grow">
        <div class="t1">${e.seen ? esc(e.family) : '???'}</div>
        <div class="t2">${e.seen ? `zabity ${e.kills}×` : 'jeszcze niespotkany'}</div>
      </div>
      <span class="badge ${e.seen ? 'on' : ''}">${e.drops.filter(Boolean).length} / ${e.drops.length}</span>
    </button>`;

    if (open && e.seen) {
      h += `<div class="card sub">
        <div class="sec" style="margin-top:0">Trofea</div>
        ${e.drops.map(d => `<div class="stat"><span class="k">${d ? '✓' : '·'}</span>
          <span class="v" style="color:${d ? 'var(--ink)' : 'var(--ink-mute)'}">${d ? esc(d) : '???'}</span></div>`).join('')}
      </div>`;
    }
  }
  return h;
}

function kolekcjaHtml(kind, ic, pusto) {
  const lista = S.collection?.[kind] ?? [];
  if (!lista.length) return `<div class="card"><div class="t2">${pusto}</div></div>`;
  return lista.map(c => `<div class="card row">
    <div class="icon lg" style="border-color:${rarityColor(c.rarity)}">${ic}</div>
    <div class="grow">
      <div class="t1" style="color:${rarityColor(c.rarity)}">${esc(c.name)}</div>
      <div class="t2">${esc(S.rarities[c.rarity]?.label ?? c.rarity)}</div>
    </div>
  </div>`).join('');
}

// ---------------------------------------------------------------- STAŁY PASEK WALKI
// Widoczny na każdej zakładce. To on niesie tożsamość gry: wychodzisz do
// ekwipunku, a walka leci dalej i widzisz ją cały czas.

function paintCombatBar() {
  const bar = $('#combatbar');
  if (!bar || !S) return;

  const trwa = FIGHT && (FIGHT.playing || AUTO || (FIGHT.mode === 'turowa' && !FIGHT.result));
  if (!trwa) { bar.hidden = true; return; }
  bar.hidden = false;

  // Wpisy logu niosą tylko HP — nazwa wroga siedzi w FIGHT.foeName, ustawiona przy starcie fali.
  const me = FIGHT.party?.[0];
  const foe = (FIGHT.enemies ?? []).find(e => e.alive) ?? FIGHT.enemies?.[0];
  const pct = (u) => u && u.maxHp ? Math.max(0, Math.round(u.hp / u.maxHp * 100)) : 0;

  bar.innerHTML = `
    <div class="cb-head">
      <span>${esc(S.actName.toUpperCase())} — PIĘTRO ${S.floor}</span>
      <span>FALA ${Math.min(S.fight + 1, S.fightsOnFloor)} / ${S.fightsOnFloor}</span>
    </div>
    <div class="cb-row"><span class="cb-n">${esc(S.name)}</span>
      <span class="bar hp"><i style="width:${pct(me)}%"></i></span><span class="cb-p">${pct(me)}%</span></div>
    <div class="cb-row"><span class="cb-n">${esc(foe?.name ?? FIGHT.foeName ?? '—')}</span>
      <span class="bar foe"><i style="width:${pct(foe)}%"></i></span><span class="cb-p">${pct(foe)}%</span></div>
    <div class="cb-act">
      <button class="cbtn ${SPEED === 1 ? 'on' : ''}" data-act="speed" data-v="1">×1</button>
      <button class="cbtn ${SPEED === 2 ? 'on' : ''}" data-act="speed" data-v="2">×2</button>
      ${S.forcedTurn ? '' : `<button class="cbtn" data-act="mode"
        data-m="${S.mode === 'auto' ? 'turowa' : 'auto'}"
        title="Przełącza tryb i porzuca bieżącą walkę">${S.mode === 'auto' ? 'NA TUROWĄ' : 'NA AUTO'}</button>`}
      ${AUTO ? `<button class="cbtn" data-act="stopauto">STOP</button>` : ''}
      <button class="cbtn go" data-act="tab" data-tab="wyprawa">DO WALKI</button>
    </div>`;
}

function render() {
  header();
  // W trakcie walki arena i log mają własny cykl rysowania — nie ruszamy ich,
  // inaczej animacja pasków znika, a ekran skacze pod palcem.
  if (FIGHT) drawFightView();
  else $('#s-wyprawa').innerHTML = renderWyprawa();
  $('#s-druzyna').innerHTML = renderDruzyna();
  $('#s-eq').innerHTML      = renderEq();
  $('#s-skille').innerHTML  = renderSkille();
  $('#s-summon').innerHTML  = renderSummon();
  $('#s-kronika').innerHTML = renderKronika();
  $('#s-postac').innerHTML  = renderPostac();
  $('#s-drzewko').innerHTML = renderDrzewko();
  paintCombatBar();
}

// ---------------------------------------------------------------- akcje

// Jedna fala. Wyciągnięte z obsługi kliknięcia, bo ciąg auto woła to samo
// bez udziału gracza.
async function startWave() {
  const d = await api('fight', {});
  if (d.error) { AUTO = false; render(); return; }

  FIGHT = {
    mode: S.forcedTurn ? 'turowa' : S.mode,
    foeName: S.nextEnemy.name,
    party: [{ name: S.name, hp: S.stats.hp, maxHp: S.stats.maxHp, alive: true }],
    enemies: [{ name: S.nextEnemy.name, hp: S.nextEnemy.maxHp, maxHp: S.nextEnemy.maxHp, alive: true }],
    charge: 0, cooldowns: {},
    log: [], idx: 0, playing: false, result: null,
  };
  if (d.awaiting) {
    FIGHT.log = d.fight.log; FIGHT.idx = d.fight.log.length;
    FIGHT.cooldowns = d.fight.cooldowns;
    syncFightHp(); drawFightView(); paintCombatBar();
  } else startPlayback(d);
}

document.addEventListener('click', async (ev) => {
  const tab = ev.target.closest('.tabs button');
  if (tab) { openTab(tab.dataset.tab); return; }

  const btn = ev.target.closest('[data-act]');
  if (!btn || btn.disabled) return;
  const act = btn.dataset.act;
  btn.disabled = true;

  try {
    if (act === 'fight') {
      // Auto obejmuje cały ciąg fal. Boss aktu wyłamuje się z tego z definicji.
      AUTO = S.mode === 'auto' && !S.forcedTurn;
      await startWave();

    } else if (act === 'stopauto') {
      AUTO = false;
      paintCombatBar();

    } else if (act === 'speed') {
      SPEED = Number(btn.dataset.v) === 2 ? 2 : 1;
      paintCombatBar();

    } else if (act === 'tab') {
      openTab(btn.dataset.tab);

    } else if (act === 'opentower') {
      advView = 'wieza'; render();

    } else if (act === 'hub') {
      advView = 'hub'; render();

    } else if (act === 'goto') {
      const d = await api('goto', { floor: Number(btn.dataset.f) });
      if (!d.error) render();

    } else if (act === 'skill') {
      skillOpen = btn.dataset.id; render();

    } else if (act === 'summonkind') {
      summonKind = btn.dataset.k; summonResult = null; render();

    } else if (act === 'summon') {
      summonResult = null;
      $('#s-summon').innerHTML = renderSummon();     // portal gaśnie na moment przed wynikiem
      const d = await api('summon', { kind: summonKind });
      if (!d.error) { summonResult = d.summon; render(); }

    } else if (act === 'logview') {
      logView = btn.dataset.v; logOpen = null; render();

    } else if (act === 'logopen') {
      logOpen = logOpen === btn.dataset.f ? null : btn.dataset.f;
      render();

    } else if (act === 'strike' || act === 'strikepotion' || act === 'ability'
               || act === 'ultimate' || act === 'defend') {
      const action =
        act === 'strikepotion' ? { type: 'potion' } :
        act === 'ability'      ? { type: 'ability', id: btn.dataset.id } :
        act === 'ultimate'     ? { type: 'ultimate' } :
        act === 'defend'       ? { type: 'defend' } :
                                 { type: 'attack', strength: btn.dataset.s };
      const d = await api('act', { action });
      if (d.error) return;
      const from = FIGHT.idx;
      FIGHT.log = d.fight ? d.fight.log : d.log;
      if (d.awaiting) {
        for (let i = from; i < FIGHT.log.length; i++) appendLog(FIGHT.log[i]);
        FIGHT.idx = FIGHT.log.length;
        FIGHT.cooldowns = d.fight.cooldowns;
        syncFightHp(); paintArena();
        drawActionMenu();
      } else {
        // Walka się skończyła — dograj TYLKO nowe wpisy, nie cały przebieg od zera.
        FIGHT.idx = from;
        startPlayback(d, from);
      }

    } else if (act === 'skipplay') {
      finishPlayback();

    } else if (act === 'closefight') {
      FIGHT = null; AUTO = false;
      advView = 'wieza';
      render();

    } else if (act === 'mode') {
      // Zmiana trybu przerywa to, co leci. Serwer porzuca walkę, klient sprząta po sobie.
      stopPlayback();
      const d = await api('mode', { mode: btn.dataset.m });
      if (!d.error) {
        if (d.porzucona) toast('Walka porzucona — fala zaczyna się od nowa');
        openTab('wyprawa'); advView = 'wieza';
        render();
      }

    } else if (act === 'abandon') {
      stopPlayback();
      await api('abandon', {});
      render();

    } else if (act === 'advance') {
      FIGHT = null; AUTO = false;
      advView = 'wieza';
      const d = await api('advance', {});
      if (!d.error) { toast(`Piętro ${d.floor}`); render(); }
    } else if (act === 'tree') {
      const d = await api('tree', { node: btn.dataset.node });
      if (d.error) toast(d.error, true); else render();
    } else if (act === 'treereset') {
      const d = await api('treereset', {});
      if (d.error) toast(d.error, true); else { toast(`Zwrócono ${d.punkty} pkt`); render(); }
    } else if (act === 'slot') {
      // drugie kliknięcie w ten sam slot zwija podgląd
      detail = (detail?.where === 'worn' && detail.slot === btn.dataset.slot)
        ? null : { where: 'worn', slot: btn.dataset.slot };
      render();
    } else if (act === 'pick') {
      detail = (detail?.where === 'bag' && detail.id === btn.dataset.id)
        ? null : { where: 'bag', id: btn.dataset.id };
      render();
    } else if (act === 'invcat') {
      invCat = btn.dataset.c; render();
    } else if (act === 'mine') {
      const res = btn.dataset.res;
      const d = await api('mine', { skill: skillOpen, res });
      if (d.error) return;
      const r = S.skills[skillOpen].resources.find(x => x.id === res);
      render();
      startMineLoop(res, r.ms);
    } else if (act === 'minestop') {
      stopMineLoop();
      await api('minestop', {});
      render();
    } else if (act === 'equip') {
      const d = await api('equip', { itemId: btn.dataset.id });
      if (!d.error) { toast('Założone'); detail = null; render(); }
    } else if (act === 'sell') {
      const d = await api('sell', { itemId: btn.dataset.id });
      if (!d.error) { toast(`+${nf(d.gold)} zł`); detail = null; render(); }
    } else if (act === 'selljunk') {
      const d = await api('selljunk', {});
      if (!d.error) { toast(`Sprzedano ${d.count} — +${nf(d.gold)} zł`); render(); }
    } else if (act === 'attr') {
      await api('attr', { attr: btn.dataset.attr }); render();
    } else if (act === 'potion') {
      await api('potion', {}); render();
    } else if (act === 'logout') {
      if (!confirm('Wrócić do ekranu startowego?\n\nPostać zostaje na serwerze — wrócisz do niej kodem z zakładki Konto.')) return;
      localStorage.removeItem('rf_token');
      location.reload();
    } else if (act === 'copycode') {
      try { await navigator.clipboard.writeText(TOKEN); toast('Kod skopiowany'); }
      catch { toast('Zaznacz i skopiuj ręcznie', true); }
    } else if (act === 'buypotion') {
      const d = await api('buypotion', {});
      if (!d.error) toast('Kupiono miksturę');
      render();
    }
  } finally {
    if (btn.isConnected) btn.disabled = false;
  }
});

// odświeżenie regeneracji, gdy wracasz do apki
document.addEventListener('visibilitychange', async () => {
  if (!document.hidden && TOKEN && S) {
    const d = await fetch('/api/state?token=' + TOKEN).then(r => r.json()).catch(() => ({}));
    if (d.state) { S = d.state; render(); }
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

boot();
