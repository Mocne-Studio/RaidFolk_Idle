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
    if (r) startMineLoop(S.activity.skill, r.id, r.ms);
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
  const E = S.expedition;
  // Na wyprawie nie ma pięter ani fal — jest etap runu. Nagłówek musi mówić
  // prawdę o tym, gdzie gracz stoi.
  let h = E
    ? `<div class="scr-head">${esc(E.riskLabel ?? 'Wyprawa')}
        <span>ETAP ${Math.min(E.at + 1, E.total)} / ${E.total}</span></div>`
    : `<div class="scr-head">Piętro ${S.floor}
        <span>FALA ${Math.min(S.fight + 1, S.fightsOnFloor)} / ${S.fightsOnFloor}</span></div>`;
  h += E ? trasaHtml(E) : waveDots();
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
      <div class="big-word bad">${f.expFailed ? 'WYPRAWA PRZEPADŁA' : 'PORAŻKA'}</div>
      <div class="t2" style="text-align:center">${esc(f.enemy.name)} był za mocny.</div>
      ${f.expFailed ? `
        <div class="stat"><span class="k">Doszedłeś do</span><span class="v">${f.expReached} z ${f.expTotal}</span></div>
        <div class="stat"><span class="k">Boss</span><span class="v down">nie osiągnięty</span></div>
        ${(f.expLost ?? []).length ? `<div class="sec">Przepadło</div>
          ${f.expLost.map(n => `<div class="stat"><span class="k">${esc(n)}</span><span class="v down">×</span></div>`).join('')}` : ''}
        ${Object.entries(f.expLostMats ?? {}).filter(([, v]) => v).map(([k, v]) =>
          `<div class="stat"><span class="k">${esc(k)}</span><span class="v down">−${v}</span></div>`).join('')}
        <div class="t2" style="margin-top:8px"><b>Twój noszony sprzęt i plecak są nietknięte.</b>
          Zdrowie nie wraca — wylecz się przed kolejnym wyjściem.</div>`
        : `<div class="t2" style="text-align:center">Wracasz na pierwszą falę tego piętra.
           Zdrowie nie wraca — mikstury albo czekanie.</div>`}
      <button class="btn solid big wide" style="margin-top:12px" data-act="closefight">
        ${f.expFailed ? 'Wróć do Przygód' : 'Spróbuj jeszcze raz'}</button>
    </div>`;
    return h;
  }

  if (f.expDone) {
    const mats = Object.entries(f.expMats ?? {}).filter(([, v]) => v);
    h += `<div class="card hi cleared"><div class="big-word">WYPRAWA UKOŃCZONA</div>
      <div class="t2" style="text-align:center">Boss padł — sakwa jest Twoja.</div>
      <div class="stat"><span class="k">Przedmioty</span><span class="v up">+${(f.expLoot ?? []).length}</span></div>
      ${mats.length ? `<div class="stat"><span class="k">Surowce</span>
        <span class="v up">${mats.map(([k, v]) => `${k} ×${v}`).join(', ')}</span></div>` : ''}
      <div class="stat"><span class="k">Złoto z wyprawy</span><span class="v up">+${nf(f.expGold ?? 0)}</span></div>
      <button class="btn solid big wide" style="margin-top:10px" data-act="runagain">Jeszcze raz</button>
    </div>`;
  } else if (f.floorCleared) {
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

  if (f.expWave) {
    h += `<div class="card"><div class="stat"><span class="k">Sakwa</span>
      <span class="v" style="color:var(--brass)">${f.sakwa} przedmiotów</span></div>
      <div class="t2" style="margin-top:5px">Wpadnie do plecaka po ukończeniu wyprawy. Padniesz — przepadnie.</div></div>`;
  }

  const lista = f.expDone ? (f.expLoot ?? []) : f.loot;
  if (lista.length) h += `<div class="sec">${f.expDone ? 'Sakwa' : 'Znalezione'} · ${lista.length}</div>`
    + lista.map(it => itemRow(it, { equipped: !f.expDone })).join('');
  if (f.backpackFull) h += `<div class="card bad"><div class="t2">Plecak pełny — reszta łupu przepadła.</div></div>`;

  h += `<div class="actions">
    <button class="btn solid" data-act="closefight">${f.floorCleared || f.expDone ? 'Dalej' : 'Następna walka'}</button>
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
  if (AUTO && F.result?.win && !F.result.floorCleared && !F.result.expDone) {
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

// Klasa wpisu logu. Rodzaj obrażeń nadpisuje kolor: fizyczne bordowe,
// magiczne niebieskie. Wrogie ciosy zostają czerwone niezależnie od typu.
function logClass(entry) {
  const base = LOG_CLASS[entry.kind] ?? '';
  if (!entry.dtype || entry.kind === 'enemy') return base;
  return `${base} d-${entry.dtype}`;
}

function appendLog(entry) {
  const el = $('#fightlog');
  if (!el) return;
  const d = document.createElement('div');
  d.className = logClass(entry);
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
        d.className = logClass(e);
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
    desc: 'Wspinaczka bez końca. Złoto i exp, ale ŻADNYCH przedmiotów.' },
  { id: 'wyprawa',ic: '🧭', label: 'Wyprawa',    stan: 'on',
    desc: 'Jedyne źródło przedmiotów. Osiem walk, sakwa wpada do plecaka dopiero na końcu.' },
  { id: 'wboss',  ic: '🐉', label: 'World Boss', stan: 'lock',
    desc: 'Jeden przeciwnik dla całego serwera, bity przez wielu graczy naraz.' },
  { id: 'kolos',  ic: '🗿', label: 'Kolos',      stan: 'lock',
    desc: 'Walka na wytrzymałość, liczona w fazach zamiast w falach.' },
  { id: 'tytan',  ic: '☄',  label: 'Tytan',      stan: 'lock',
    desc: 'Szczyt rozgrywki końcowej. Nagroda wraca do herbu.' },
];

const STAN_BADGE = { on: 'OTWARTE', soon: 'WKRÓTCE', lock: 'ZAMKNIĘTE' };

function renderHub() {
  let h = `<div class="scr-head">Przygody <span>PIĘTRO ${S.maxFloor}</span></div>`;
  h += `<div class="modes">`;
  for (const t of TRYBY) {
    const czynny = t.stan === 'on';
    const akcja = t.id === 'wieza' ? 'opentower' : t.id === 'wyprawa' ? 'openexp' : null;
    const podpis = t.id === 'wieza' ? `${S.actName} · piętro ${S.floor} z ${S.actId * 10}`
      : t.id === 'wyprawa' ? (S.expedition
          ? `TRWA · fala ${S.expedition.fight + 1} z ${S.expedition.fights} · sakwa ${S.expedition.sakwaCount}`
          : t.desc)
      : t.desc;
    h += `<button class="card row mode-card compact ${czynny ? 'hi' : 'off'}" title="${esc(t.desc)}"
      ${akcja ? `data-act="${akcja}"` : ''} ${czynny ? '' : 'disabled'}>
      <div class="icon lg">${t.ic}</div>
      <div class="grow">
        <div class="t1">${esc(t.label)}</div>
        <div class="t2">${esc(podpis)}</div>
      </div>
      <span class="badge ${czynny ? 'on' : ''}">${S.expedition && t.id === 'wyprawa' ? 'TRWA' : STAN_BADGE[t.stan]}</span>
    </button>`;
  }
  return h + `</div>`;
}

// ---------------------------------------------------------------- WYPRAWA
// Jedyne źródło przedmiotów. Osiem walk, HP nie wraca, sakwa wpada do plecaka
// dopiero po ukończeniu — śmierć zabiera wszystko.

// Wybór przed wyruszeniem: dokąd, jakie ryzyko, jakie utrudnienia.
let expSel = null;                 // id wybranej wyprawy albo null = lista
let expRisk = 'rowne';
let expMods = new Set();

const NODE_IC = { walka: '●', rozdroze: '◆', event: '?', safepoint: '⛺', elita: '★', boss: '☠' };
const NODE_NAZWA = { walka: 'Walka', rozdroze: 'Rozdroże', event: 'Zdarzenie',
                     safepoint: 'Postój', elita: 'Elita', boss: 'Boss wyprawy' };

// Pasek trasy: gdzie jestem w runie. Jedna linijka, mieści się na telefonie.
function trasaHtml(E) {
  return `<div class="trasa">${E.nodes.map(n =>
    `<span class="tw ${n.done ? 'done' : ''} ${n.here ? 'here' : ''} t-${n.typ}"
      title="${NODE_NAZWA[n.typ] ?? n.typ}">${NODE_IC[n.typ] ?? '●'}</span>`).join('')}</div>`;
}

function sakwaHtml(E) {
  const mats = E.mats ?? [];
  return `<div class="card ${E.sakwaCount || mats.length ? 'hi' : ''}">
    <div class="row">
      <div class="grow"><div class="t1">Sakwa wyprawy</div>
        <div class="t2">${E.sakwaCount} przedmiotów${mats.length
          ? ` · ${mats.map(m => `${m.id} ×${m.count}`).join(', ')}` : ''}</div></div>
      <span class="badge ${E.sakwaCount ? 'on' : ''}">×${E.lootMult} łupu</span>
    </div>
    ${E.sakwa.length ? `<div class="sakwa-lista">${E.sakwa.map(it =>
      `<div class="sk-row" style="color:${rarityColor(it.rarity)}">${esc(it.name)}</div>`).join('')}</div>` : ''}
    <div class="t2" style="margin-top:6px">Wpada do plecaka <b>dopiero po bossie</b>.
      Padniesz albo zawrócisz — przepada.</div>
  </div>`;
}

function renderWyprawaTryb() {
  const st = S.stats;
  const hpPct = Math.round(st.hp / st.maxHp * 100);
  const E = S.expedition;

  // ---------------- wybór wyprawy ----------------
  if (!E && !expSel) {
    let h = `<div class="scr-head">
      <button class="lnk" data-act="hub">‹ Przygody</button>
      <span>DOKĄD IDZIESZ</span></div>`;
    h += `<div class="card"><div class="t2">Wyprawa to <b>jedyne źródło sprzętu</b>.
      Wybierz cel — potem zobaczysz, co z niego wypada i jak bardzo chcesz sobie utrudnić.</div></div>`;
    h += `<div class="scrollbox">`;
    for (const w of S.expLista ?? []) {
      h += `<button class="card row res-row ${w.otwarta ? '' : 'locked'}"
        ${w.otwarta ? `data-act="expsel" data-id="${w.id}"` : 'disabled'}>
        <div class="icon lg">${w.ic}</div>
        <div class="grow">
          <div class="t1">${esc(w.label)}</div>
          <div class="t2">${w.otwarta ? esc(w.opis) : `Otwiera się na piętrze ${w.unlockFloor}`}</div>
          ${w.otwarta ? `<div class="t2" style="color:var(--brass)">${w.dlugosc} etapów ·
            odkryte ${w.dropsZnane} z ${w.dropsTotal} przedmiotów</div>` : ''}
        </div>
        <span class="badge ${w.otwarta ? 'on' : ''}">${w.otwarta ? 'RUSZAJ' : '🔒'}</span>
      </button>`;
    }
    h += `</div>`;
    return h;
  }

  // ---------------- szczegóły wybranej wyprawy ----------------
  if (!E) {
    const w = (S.expLista ?? []).find(x => x.id === expSel);
    if (!w) { expSel = null; return renderWyprawaTryb(); }

    const mnR = (S.expRisks ?? []).find(r => r.id === expRisk)?.lootMult ?? 1;
    const mnM = (S.expMods ?? []).filter(m => expMods.has(m.id)).reduce((a, m) => a + m.reward, 0);
    const razem = (mnR + mnM).toFixed(2);

    let h = `<div class="scr-head">
      <button class="lnk" data-act="expsel" data-id="">‹ Wyprawy</button>
      <span>${esc(w.label.toUpperCase())}</span></div>`;

    h += `<div class="two-col"><div class="col">
      <div class="card ${hpPct < 50 ? 'bad' : ''}">
        <div class="row" style="margin-bottom:6px">
          <div class="grow"><div class="t1">Zdrowie ${nf(st.hp)} / ${nf(st.maxHp)}</div>
            <div class="t2">Wchodzisz z tym, co masz — lecz się TERAZ</div></div>
          <span class="num" style="font-size:17px;color:${hpPct < 50 ? 'var(--blood)' : 'var(--brass)'}">${hpPct}%</span>
        </div>
        <div class="bar hp big"><i style="width:${hpPct}%"></i></div>
        <div class="actions">
          <button class="btn ghost" data-act="potion" ${S.potions && st.hp < st.maxHp ? '' : 'disabled'}>Wypij miksturę</button>
        </div>
      </div>

      <div class="card">
        <div class="stat"><span class="k">Etapów</span><span class="v">${w.dlugosc}${
          w.dlugosc < w.dlugoscMax ? ` (do ${w.dlugoscMax} wyżej)` : ''}</span></div>
        <div class="stat"><span class="k">Twoja moc</span><span class="v" style="color:var(--brass)">${nf(st.power)}</span></div>
        <div class="stat"><span class="k">Mikstury</span>
          <span class="v">${Math.min(S.potions, S.potionCarry?.wyprawa ?? 10)} z ${S.potionCarry?.wyprawa ?? 10}</span></div>
        <div class="stat"><span class="k">Drużyna</span><span class="v">${1
          + (S.teamStats?.allies.filter(Boolean).length ?? 0)
          + (S.teamStats?.pet ? 1 : 0)} jednostek</span></div>
      </div>

      <div class="sec">Co stąd wypada · ${w.dropsZnane} z ${w.dropsTotal}</div>
      <div class="droptab">
        ${w.drops.map(d => `<div class="dr ${d.base ? 'znany' : ''}">
          <span class="di">${d.base ? (SLOT_ICON[d.slot] ?? '▪') : '?'}</span>
          <span class="dn">${d.base ? esc(d.base) : '???'}${d.base && d.hands === 2 ? ' 2H' : ''}</span>
        </div>`).join('')}
      </div>
      <div class="t2" style="margin-top:5px">Znak zapytania znika, gdy przedmiot raz
        przejdzie Ci przez ręce. Odkrycia zostają na zawsze.</div>
    </div><div class="col">
      <div class="sec">Ryzyko</div>
      <div class="segs">
        ${(S.expRisks ?? []).map(r => `<button data-act="exprisk" data-r="${r.id}"
          aria-selected="${expRisk === r.id}" title="${esc(r.desc)}">${esc(r.label.split(' ')[0])}</button>`).join('')}
      </div>

      <div class="sec">Utrudnienia — każde podbija nagrodę</div>
      <div class="scrollbox">
      ${(S.expMods ?? []).map(m => `<button class="card row compact ${m.otwarty ? '' : 'locked'} ${expMods.has(m.id) ? 'hi' : ''}"
        ${m.otwarty ? `data-act="expmod" data-m="${m.id}"` : 'disabled'}>
        <div class="icon">${expMods.has(m.id) ? '✓' : m.otwarty ? '·' : '🔒'}</div>
        <div class="grow"><div class="t1">${esc(m.label)}</div>
          <div class="t2">${m.otwarty ? esc(m.desc) : `Otwiera się na piętrze ${m.unlockFloor}`}</div></div>
        <span class="badge ${expMods.has(m.id) ? 'on' : ''}">+${Math.round(m.reward * 100)}%</span>
      </button>`).join('')}
      </div>

      <div class="card hi" style="margin-top:8px">
        <div class="row"><div class="grow"><div class="t1">Mnożnik nagrody</div>
          <div class="t2">ryzyko ×${mnR.toFixed(1)}${mnM ? ` + utrudnienia +${Math.round(mnM * 100)}%` : ''}</div></div>
          <span class="num big-n">×${razem}</span></div>
      </div>
      <button class="btn solid big wide" style="margin-top:8px" data-act="expstart"
        data-id="${w.id}" data-r="${expRisk}">Ruszaj na wyprawę</button>
    </div></div>`;
    return h;
  }

  // ---------------- run w toku ----------------
  let h = `<div class="scr-head">
    <button class="lnk" data-act="hub">‹ Przygody</button>
    <span>${esc(E.riskLabel ?? '')} · ${E.at + 1} z ${E.total}</span></div>`;

  h += trasaHtml(E);

  // DECYZJA — run stoi, dopóki gracz nie wybierze.
  if (E.decyzja) {
    h += `<div class="card hi decyzja" style="margin-top:8px">
      <div class="big-word">DECYZJA</div>
      <div class="t2" style="text-align:center;margin-bottom:10px">${esc(E.decyzja.pytanie)}</div>
      ${E.decyzja.opcje.map(o => `<button class="card row res-row" data-act="expchoose" data-o="${o.id}">
        <div class="grow"><div class="t1">${esc(o.label)}</div>
          <div class="t2">${esc(o.desc)}</div></div>
        <span class="badge on">WYBIERZ</span>
      </button>`).join('')}
    </div>`;
    h += sakwaHtml(E);
    return h;
  }

  // POSTÓJ — jedyne wcześniejsze wyjście dla łupu, i to wąskie.
  if (E.safepoint) {
    h += `<div class="card hi" style="margin-top:8px">
      <div class="big-word">POSTÓJ</div>
      <div class="t2" style="text-align:center">Możesz odesłać do plecaka <b>jeden przedmiot</b>
        i <b>jeden rodzaj surowca</b> (cały stos). Reszta sakwy zostaje na szali.</div>
    </div>`;
    h += `<div class="scrollbox">`;
    h += `<div class="sec">Przedmiot</div>`;
    h += E.sakwa.length
      ? E.sakwa.map(it => `<button class="card row compact" data-act="expsafe" data-item="${it.id}">
          <div class="icon" style="border-color:${rarityColor(it.rarity)}">${SLOT_ICON[it.slot] ?? '▪'}</div>
          <div class="grow"><div class="t1" style="color:${rarityColor(it.rarity)}">${esc(it.name)}</div>
            <div class="t2">${esc(S.rarities[it.rarity]?.label ?? '')}</div></div>
          <span class="badge on">ODEŚLIJ</span></button>`).join('')
      : `<div class="card"><div class="t2">Nic jeszcze nie wypadło.</div></div>`;
    h += `<div class="sec">Surowiec</div>`;
    h += (E.mats ?? []).length
      ? E.mats.map(m => `<button class="card row compact" data-act="expsafe" data-mat="${m.id}">
          <div class="icon">🪨</div>
          <div class="grow"><div class="t1">${esc(m.id)}</div>
            <div class="t2">cały stos: ${m.count}</div></div>
          <span class="badge on">ODEŚLIJ</span></button>`).join('')
      : `<div class="card"><div class="t2">Brak surowców w sakwie.</div></div>`;
    h += `<button class="btn ghost wide" style="margin-top:8px" data-act="expsafe">Idź dalej bez odsyłania</button>`;
    h += `</div>`;
    return h;
  }

  // WALKA
  const e = E.enemy;
  const boss = E.node?.typ === 'boss';
  const elita = E.node?.typ === 'elita';

  h += `<div class="two-col" style="margin-top:8px"><div class="col">
    <div class="card ${hpPct < 40 ? 'bad' : ''}">
      <div class="row" style="margin-bottom:6px">
        <div class="grow"><div class="t1">Zdrowie ${nf(st.hp)} / ${nf(st.maxHp)}</div>
          <div class="t2">Mikstury w drodze: ${E.potionsLeft} · masz ${S.potions}</div></div>
        <span class="num" style="font-size:17px;color:${hpPct < 40 ? 'var(--blood)' : 'var(--brass)'}">${hpPct}%</span>
      </div>
      <div class="bar hp big"><i style="width:${hpPct}%"></i></div>
      <div class="actions">
        <button class="btn ghost" data-act="potion" ${S.potions && st.hp < st.maxHp ? '' : 'disabled'}>Wypij</button>
        <button class="btn ghost" data-act="expleave">Porzuć</button>
      </div>
    </div>
    ${(E.efekty ?? []).length ? `<div class="card">
      <div class="sec" style="margin-top:0">Działa na Ciebie</div>
      ${E.efekty.map(x => `<div class="stat"><span class="k">${esc(x.label)}</span>
        <span class="v ${x.mobDmg ? 'down' : 'up'}">${x.mobDmg ? `wrogowie +${Math.round((x.mobDmg - 1) * 100)}%` : 'korzystnie'}</span></div>`).join('')}
    </div>` : ''}
    ${sakwaHtml(E)}
  </div><div class="col">
    <div class="card ${boss ? 'hi' : ''}">
      <div class="row"><div class="grow">
        <div class="t1">${boss ? 'BOSS WYPRAWY' : elita ? 'ELITA' : `Etap ${E.at + 1}`}</div>
        <div class="t2">${boss ? 'Jego śmierć oddaje sakwę. Walka turowa.'
          : elita ? 'Mocniejszy niż reszta, lepszy łup.' : 'Zwykły przeciwnik.'}</div>
      </div><span class="badge on">${NODE_NAZWA[E.node?.typ] ?? ''}</span></div>
    </div>
    <div class="units">
      <div class="unit me"><div class="png">${heroCrest(38)}</div>
        <div class="nm">${esc(S.name)}</div>
        <div class="bar hp"><i style="width:${hpPct}%"></i></div>
        <div class="hpn">${nf(st.hp)}</div></div>
      <div class="unit"><div class="png">${boss ? '👑' : elita ? '⚔' : '👹'}</div>
        <div class="nm">${esc(e?.name ?? '—')}</div>
        <div class="bar foe"><i style="width:100%"></i></div>
        <div class="hpn">${nf(e?.maxHp ?? 0)}</div></div>
    </div>
    <div class="card">
      <div class="stat"><span class="k">Atak</span><span class="v">${nf(st.damage)} vs ${nf(e?.damage ?? 0)}</span></div>
      <div class="stat"><span class="k">Obrona</span><span class="v">${st.armor} vs ${e?.armor ?? 0}</span></div>
    </div>
    <button class="btn solid big wide" style="margin-top:8px" data-act="fight">
      ${boss ? 'Stań do bossa' : S.mode === 'auto' && !S.alwaysAuto === false ? 'Walcz' : 'Ruszaj'}</button>
  </div></div>`;
  return h;
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
    <button class="lnk" data-act="hub">‹ Przygody</button>
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

    ${S.lastDefeat ? `<div class="card bad compact" style="margin-top:6px"
      title="Ostatnie miejsce, w którym Cię rozłożyło">
      <div class="t1">Ostatnia porażka: piętro ${S.lastDefeat.floor}, fala ${S.lastDefeat.wave} z ${S.lastDefeat.waves}</div>
      <div class="t2">Rozłożył Cię ${esc(S.lastDefeat.enemy)}. Tyle brakowało.</div>
    </div>` : ''}

    <div class="card ${hpPct < 40 ? 'bad' : ''}" style="margin-top:6px">
      <div class="row" style="margin-bottom:6px">
        <div class="grow"><div class="t1">Zdrowie ${nf(st.hp)} / ${nf(st.maxHp)}</div>
          <div class="t2">Mikstury: ${S.potions}</div></div>
        <span class="num" style="font-size:17px;color:${hpPct < 40 ? 'var(--blood)' : 'var(--brass)'}">${hpPct}%</span>
      </div>
      <div class="bar hp big"><i style="width:${hpPct}%"></i></div>
      <div class="actions">
        <button class="btn ghost" data-act="potion" ${S.potions && st.hp < st.maxHp ? '' : 'disabled'}>Wypij</button>
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
  // Trwająca wyprawa zawsze wygrywa nad hubem — inaczej gracz gubi, gdzie jest.
  if (S.expedition) return renderWyprawaTryb();
  if (advView === 'exp') return renderWyprawaTryb();
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
    <button class="lnk" data-act="tab" data-tab="wyprawa">‹ Przygody</button>
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

    <div class="card row">
      <div class="grow"><div class="t1">Skille bojowe</div>
        <div class="t2">Rosną z tego, czym bijesz</div></div>
      <button class="btn" data-act="skillgo" data-t="bojowe">Otwórz</button>
    </div>

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

// Drzewko punktowe zeszło z UI. Liczby, reguły odblokowania i respec siedzą
// nietknięte w game/config.js i game/character.js — jeśli wróci, kod czeka gotowy.

// ---------------------------------------------------------------- SKILLE BOJOWE
// Drzewko punktowe zeszło ze sceny (liczby zostały w config.tree — może wróci).
// Na jego miejscu stoi to, co było w pierwszej wersji: skille rosnące z tego,
// CZYM bijesz. Podział expa zależy od rąk i widać go tutaj na żywo.

const UDZIAL_OPIS = {
  1: '100% expa', 0.5: '50% expa', 0: 'nic nie dostaje',
};

function sekcjaBojowe() {
  const lista = S.cskills ?? [];
  const dwureczna = S.hands?.offBlocked;
  const bron = S.equipped?.bron;
  const off = S.equipped?.offhand;

  let h = '';

  // Skąd bierze się podział — najważniejsza informacja na tym ekranie.
  const rece = !bron ? 'Gołe pięści — cały exp idzie w Broń białą.'
    : dwureczna ? `${bron.name} jest dwuręczna — cały exp idzie w jeden skill, a druga ręka jest zajęta.`
    : off?.wtype === 'tarcza' ? `${bron.name} i tarcza — exp dzieli się po połowie między broń i Obronę.`
    : off ? `${bron.name} i ${off.name} — exp dzieli się po połowie między oba skille.`
    : `${bron.name} w jednej ręce — cały exp idzie w jej skill. Druga ręka wolna.`;

  h += `<div class="card hi">
    <div class="t1">Skąd bierze się exp</div>
    <div class="t2">${esc(rece)}</div>
    <div class="t2" style="margin-top:6px"><b>Witalność rośnie zawsze</b>, z samego udziału w walce.
      Dwuręczne bronie biją mocniej — to ich cała przewaga nad tarczą.</div>
  </div>`;

  h += `<div class="scrollbox">`;
  for (const s of lista) {
    const pct = Math.round(s.xp / s.need * 100);
    const czynny = s.udzial > 0;
    h += `<div class="card ${czynny ? '' : 'off'} cskill" title="${esc(s.opis)}">
      <div class="row" style="margin-bottom:6px">
        <div class="icon">${s.ic}</div>
        <div class="grow">
          <div class="t1">${esc(s.label)}
            <span class="num" style="color:var(--brass)">Lv. ${s.lvl}</span></div>
          <div class="t2">${esc(s.opis)}</div>
        </div>
        <span class="badge ${czynny ? 'on' : ''}">${UDZIAL_OPIS[s.udzial] ?? Math.round(s.udzial * 100) + '%'}</span>
      </div>
      <div class="bar xp"><i style="width:${pct}%"></i></div>
      <div class="t2 num" style="margin-top:4px">${s.xp} / ${s.need} exp</div>
    </div>`;
  }

  h += `<div class="card" style="margin-top:8px"><div class="t2">
    Skille <b>nie bramkują sprzętu</b> — jedyną bramką zostaje poziom postaci.
    Dają wyłącznie bonusy, więc noszenie czegoś nowego nigdy nie jest zablokowane.</div></div>`;
  h += `</div>`;

  return h;
}

// ---------------------------------------------------------------- EKWIPUNEK
// Ekran ma się mieścić na jednym ekranie: makieta postaci i statystyki obok
// siebie u góry, plecak z kategoriami niżej. Scrolluje się WYŁĄCZNIE lista
// przedmiotów, bo tylko ona rośnie bez końca.

// Makieta 3×3 z portretem w środku. Głowa u góry, bronie po bokach,
// pancerz pod spodem, dodatki w rogach — czyta się bez legendy.
// Napierśnik stoi w środku — tam, gdzie w każdym RPG stoi tors. Portret zniknął,
// bo zjadał najlepsze miejsce na ekranie i niczego nie mówił.
const DOLL_GRID = [
  ['rekawice', 'helm',       'amulet'],
  ['bron',     'napiersnik', 'offhand'],
  ['pierscien','buty',       null],
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
    // Wolna komórka niesie Moc — jedną liczbę na porównanie buildów.
    if (!slot) {
      return `<div class="doll-power" title="Atak, zdrowie i pancerz w jednej liczbie">
        <span class="k">MOC</span><span class="v">${nf(S.stats.power)}</span></div>`;
    }
    const it = S.equipped[slot];
    const wybrany = detail?.where === 'worn' && detail.slot === slot;
    // Dwuręczna blokuje drugą rękę — trzeba to widać, zanim gracz kliknie.
    const zablokowany = slot === 'offhand' && S.hands?.offBlocked;
    const tip = zablokowany
      ? 'Zajęte przez broń dwuręczną'
      : (it ? `${it.name} — ${S.rarities[it.rarity]?.label}` : S.slots[slot].label);
    return `<button class="doll-cell${it ? '' : ' empty'}${wybrany ? ' on' : ''}${zablokowany ? ' blocked' : ''}"
      data-act="slot" data-slot="${slot}" title="${esc(tip)}"
      style="${it ? `border-color:${rarityColor(it.rarity)}` : ''}">
      <span class="ic">${zablokowany ? '⛓' : (SLOT_ICON[slot] ?? '▪')}</span>
      <span class="lb">${zablokowany ? 'zajęte' : (it ? esc(it.name.split(' ')[0]) : esc(S.slots[slot].label))}</span>
      ${it && it.hands === 2 ? '<span class="tag2h">2H</span>' : ''}
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
  const noszony = detail.where === 'bag' ? (S.equipped[it.slot] ?? null) : null;
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
    ${it.slot === 'bron' ? `<div class="stat" title="${it.hands === 2
      ? 'Zajmuje obie ręce: bez tarczy i bez drugiego ostrza, ale bije mocniej i cały exp idzie w jeden skill.'
      : 'Zostawia drugą rękę wolną na tarczę albo drugą broń — exp dzieli się wtedy po połowie.'}">
      <span class="k">Chwyt</span><span class="v">${it.hands === 2 ? 'dwuręczna' : 'jednoręczna'}</span></div>` : ''}
    ${it.damage ? `<div class="stat"><span class="k">Atak</span><span class="v">${nf(it.damage)}</span></div>` : ''}
    ${it.armor ? `<div class="stat"><span class="k">Obrona</span><span class="v">${nf(it.armor)}</span></div>` : ''}
    ${(it.affixes ?? []).map(a => `<div class="stat"><span class="k">${esc(a.label)}</span>
      <span class="v up">+${a.value}${a.pct ? '%' : ''}</span></div>`).join('')}

    ${detail.where === 'bag' && noszony ? porownanie(noszony, it) : ''}
    ${detail.where === 'bag' && diff ? `<div class="sec">Bilans</div>${diff}` : ''}
    ${detail.where === 'bag' && !noszony ? `<div class="sec">Zmiana</div>
      <div class="t2">Slot jest pusty — wszystko powyżej to czysty zysk.</div>` : ''}

    ${detail.where === 'bag' && it.slot === 'bron' && it.hands === 2 && S.equipped.offhand
      ? `<div class="t2" style="color:var(--brass);margin-top:8px">Założenie zdejmie
         <b>${esc(S.equipped.offhand.name)}</b> z drugiej ręki.</div>` : ''}
    ${detail.where === 'bag' && it.slot === 'offhand' && S.hands?.offBlocked
      ? `<div class="t2" style="color:#D9736B;margin-top:8px">Trzymasz broń dwuręczną —
         druga ręka jest zajęta.</div>` : ''}

    ${!eqCheck.ok ? `<div class="t2" style="color:#D9736B;margin-top:8px">${esc(eqCheck.reason)}</div>` : ''}

    ${detail.where === 'bag' ? `<div class="actions">
      <button class="btn solid" data-act="equip" data-id="${it.id}" ${eqCheck.ok ? '' : 'disabled'}>Załóż</button>
      <button class="btn ghost" data-act="sell" data-id="${it.id}">Sprzedaj</button>
    </div>` : ''}
  </div>`;
}

// Porównanie obok siebie: co nosisz kontra co trzymasz. Bez tego gracz musiał
// pamiętać liczby z drugiego ekranu.
function porownanie(stary, nowy) {
  const kol = (it, tytul) => {
    const s = itemStats(it);
    const wiersze = Object.entries(s).filter(([, v]) => v)
      .map(([k, v]) => `<div class="pk"><span>${STAT_NAZWA[k] ?? k}</span>
        <b>${v}${STAT_PCT.has(k) ? '%' : ''}</b></div>`).join('');
    return `<div class="pcol">
      <div class="ph" style="color:${rarityColor(it.rarity)}">${esc(tytul)}</div>
      <div class="pn" style="color:${rarityColor(it.rarity)}">${esc(it.name)}</div>
      <div class="t2">${esc(S.rarities[it.rarity]?.label ?? '')}${it.slot === 'bron'
        ? ` · ${it.hands === 2 ? '2H' : '1H'}` : ''}</div>
      ${wiersze || '<div class="t2">bez statystyk</div>'}
    </div>`;
  };
  return `<div class="sec">Nosisz kontra bierzesz</div>
    <div class="porownanie">${kol(stary, 'NOSISZ')}${kol(nowy, 'BIERZESZ')}</div>`;
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

// ---------------------------------------------------------------- DRUŻYNA
// Lewa kolumna to skład, prawa to panel wybranego członka. Klikasz siebie —
// dostajesz swój panel, klikasz sojusznika — jego. Nagłówek u góry nie jest
// już jedyną drogą do własnych ulepszeń.

let teamSel = 'ja';        // 'ja' | 'a0' | 'a1' | 'a2' | 'pet'

function renderDruzyna() {
  const st = S.stats;
  const T = S.teamStats ?? { allies: [], pet: null };
  const obsadzeni = T.allies.filter(Boolean).length + (T.pet ? 1 : 0);

  let h = `<div class="scr-head">Drużyna <span>${1 + obsadzeni} / ${(S.allySlots ?? 3) + 2} W WALCE</span></div>`;
  h += `<div class="two-col">`;

  // ---- lewa: skład ----
  h += `<div class="col">`;
  h += `<button class="card row team-row ${teamSel === 'ja' ? 'hi' : ''}" data-act="teamsel" data-s="ja">
    <div class="icon lg">${heroCrest(28)}</div>
    <div class="grow"><div class="t1">${esc(S.name)}</div>
      <div class="t2">poziom ${S.poziom} · moc ${nf(st.power)}</div></div>
    <span class="badge on">TY</span>
  </button>`;

  for (let i = 0; i < (S.allySlots ?? 3); i++) {
    const a = T.allies[i];
    h += `<button class="card row team-row ${teamSel === 'a' + i ? 'hi' : ''} ${a ? '' : 'off'}"
      data-act="teamsel" data-s="a${i}">
      <div class="icon lg" ${a ? `style="border-color:${rarityColor(a.rarity)}"` : ''}>${a ? '👤' : '＋'}</div>
      <div class="grow">
        <div class="t1" ${a ? `style="color:${rarityColor(a.rarity)}"` : ''}>${esc(a?.name ?? `Slot ${i + 1}`)}</div>
        <div class="t2">${a ? `${nf(a.damage)} atak · ${nf(a.maxHp)} HP` : 'pusty'}</div>
      </div>
      <span class="badge ${a ? 'on' : ''}">${a ? 'WALCZY' : 'WOLNY'}</span>
    </button>`;
  }

  const p = T.pet;
  h += `<button class="card row team-row ${teamSel === 'pet' ? 'hi' : ''} ${p ? '' : 'off'}"
    data-act="teamsel" data-s="pet">
    <div class="icon lg" ${p ? `style="border-color:${rarityColor(p.rarity)}"` : ''}>${p ? '🐺' : '＋'}</div>
    <div class="grow">
      <div class="t1" ${p ? `style="color:${rarityColor(p.rarity)}"` : ''}>${esc(p?.name ?? 'Slot peta')}</div>
      <div class="t2">${p ? `${nf(p.damage)} atak · ${nf(p.maxHp)} HP` : 'pusty'}</div>
    </div>
    <span class="badge ${p ? 'on' : ''}">${p ? 'WALCZY' : 'WOLNY'}</span>
  </button>`;
  h += `</div>`;

  // ---- prawa: panel wybranego ----
  h += `<div class="col">${teamSel === 'ja' ? panelGracza() : panelTowarzysza()}</div>`;

  h += `</div>`;
  return h;
}

function panelGracza() {
  const st = S.stats;
  return `<div class="card hi">
      <div class="row"><div class="icon lg">${heroCrest(30)}</div>
        <div class="grow"><div class="t1">${esc(S.name)}</div>
          <div class="t2">poziom ${S.poziom} · jedyny, który nosi ekwipunek</div></div></div>
    </div>
    <div class="statgrid" style="margin-bottom:8px">
      <div class="stat-box"><span class="k">Zdrowie</span><span class="v">${nf(st.hp)}/${nf(st.maxHp)}</span></div>
      <div class="stat-box"><span class="k">Atak</span><span class="v">${nf(st.damage)}</span></div>
      <div class="stat-box"><span class="k">Obrona</span><span class="v">${nf(st.armor)}</span></div>
      <div class="stat-box"><span class="k">Prędkość</span><span class="v">${st.speed}</span></div>
      <div class="stat-box"><span class="k">Kryt</span><span class="v">${(st.crit * 100).toFixed(1)}%</span></div>
      <div class="stat-box"><span class="k">Moc</span><span class="v">${nf(st.power)}</span></div>
    </div>
    <div class="card"><div class="t2">Ulepszenia siedzą w zakładce <b>Skille</b> —
      tam rozdajesz atrybuty i tam rosną skille bojowe. Tu jest sam podgląd składu.</div></div>`;
}

function panelTowarzysza() {
  const pet = teamSel === 'pet';
  const idx = pet ? null : Number(teamSel.slice(1));
  const wpis = pet ? S.teamStats.pet : S.teamStats.allies[idx];
  const pula = pet ? (S.collection?.pets ?? []) : (S.collection?.companions ?? []);
  const zajete = pet ? [] : (S.team?.allies ?? []).filter(x => x !== null && x !== idx);

  let h = '';

  if (wpis) {
    h += `<div class="card hi" style="border-color:${rarityColor(wpis.rarity)}">
      <div class="row">
        <div class="icon lg" style="border-color:${rarityColor(wpis.rarity)}">${pet ? '🐺' : '👤'}</div>
        <div class="grow">
          <div class="t1" style="color:${rarityColor(wpis.rarity)}">${esc(wpis.name)}</div>
          <div class="t2">${esc(S.rarities[wpis.rarity]?.label ?? wpis.rarity)} · ${pet ? 'pet' : 'sojusznik'}</div>
        </div>
      </div>
    </div>
    <div class="statgrid" style="margin-bottom:8px">
      <div class="stat-box"><span class="k">Zdrowie</span><span class="v">${nf(wpis.maxHp)}</span></div>
      <div class="stat-box"><span class="k">Atak</span><span class="v">${nf(wpis.damage)}</span></div>
      <div class="stat-box"><span class="k">Obrona</span><span class="v">${nf(wpis.armor)}</span></div>
      <div class="stat-box"><span class="k">Prędkość</span><span class="v">${wpis.speed}</span></div>
      <div class="stat-box"><span class="k">Kryt</span><span class="v">${(wpis.crit * 100).toFixed(1)}%</span></div>
      <div class="stat-box"><span class="k">Rzadkość</span><span class="v">${esc(S.rarities[wpis.rarity]?.label ?? '')}</span></div>
    </div>
    <button class="btn ghost wide" data-act="teamset" data-slot="${pet ? 'pet' : idx}" data-idx="">
      Zdejmij ze slotu</button>`;
  } else {
    h += `<div class="card"><div class="t1">Pusty slot</div>
      <div class="t2">Wybierz z kolekcji poniżej. ${pet ? 'Pety' : 'Sojusznicy'} przychodzą z Przywołania.</div></div>`;
  }

  h += `<div class="sec">Kolekcja · ${pula.length}</div>`;
  h += `<div class="scrollbox">`;
  if (!pula.length) {
    h += `<div class="card"><div class="t2">Pusto. Idź do Przywołania.</div></div>`;
  } else {
    h += pula.map((c, i) => {
      const gdzieindziej = zajete.includes(i);
      const tu = wpis && wpis.idx === i;
      return `<button class="card row compact" data-act="teamset"
        data-slot="${pet ? 'pet' : idx}" data-idx="${i}" ${gdzieindziej || tu ? 'disabled' : ''}>
        <div class="icon" style="border-color:${rarityColor(c.rarity)}">${pet ? '🐺' : '👤'}</div>
        <div class="grow"><div class="t1" style="color:${rarityColor(c.rarity)}">${esc(c.name)}</div>
          <div class="t2">${esc(S.rarities[c.rarity]?.label ?? c.rarity)}</div></div>
        <span class="badge ${tu ? 'on' : ''}">${tu ? 'TUTAJ' : gdzieindziej ? 'W INNYM' : 'WSTAW'}</span>
      </button>`;
    }).join('');
  }
  h += `</div>`;

  h += `<div class="card" style="margin-top:8px"><div class="t2">
    <b>Towarzysze nie noszą ekwipunku.</b> Rosną wyłącznie rzadkością, a ich
    statystyki liczą się z Twoich — nigdy nie zostaną w tyle i nigdy Cię nie przerosną.</div></div>`;

  return h;
}

// ---------------------------------------------------------------- SKILLE
// Górnictwo GRA. Reszta to makiety.
//
// Pętla: klient trzyma zegar, po każdym cyklu woła /api/minetick, serwer wydaje
// dokładnie jeden cykl i sprawdza czas. Bez postępu offline, ale zmiana zakładki
// niczego nie gubi — timer chodzi dalej, bo to ta sama strona.

let skillOpen = 'gornictwo';
let MINE = null;         // { skill, res, ms, t0, timer, tick, pauza }
const PAUZA_MS = 700;    // oddech między cyklami — żeby było widać, że coś padło

// skill jest parametrem, nie stałą — inaczej drugi cykl Rybołówstwa szukał
// swojego surowca w tabeli Górnictwa i wywalał się na undefined.
function startMineLoop(skill, res, ms) {
  stopMineLoop();
  MINE = { skill, res, ms, t0: Date.now() };
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
    const sk = S.skills[skill];
    if (d.awans) toast(`${sk.label} ${sk.lvl}!`);
    const r = sk.resources.find(x => x.id === res);
    render();
    // Przerwa między cyklami. Bez niej pasek skacze do zera w tej samej klatce,
    // w której się wypełnił, i nie widać, że coś się w ogóle wydarzyło.
    if (S.activity && r) {
      MINE = { skill, res, ms: r.ms, t0: Date.now(), pauza: true };
      const bar = $('#mineprog'); if (bar) bar.style.width = '100%';
      const zeg = $('#minetime'); if (zeg) zeg.textContent = 'chwila…';
      MINE.timer = setTimeout(() => startMineLoop(skill, res, r.ms), PAUZA_MS);
    }
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

// Skille to jedno miejsce na wszystko, co się rozwija: zbieranie, walkę
// i atrybuty. Drużyna została podglądem składu i niczym więcej.
let skillTab = 'zbierackie';   // 'zbierackie' | 'bojowe' | 'atrybuty'

function renderSkille() {
  let h = `<div class="scr-head">Skille
    <span>${skillTab === 'bojowe' ? 'BOJOWE' : skillTab === 'atrybuty' ? 'ATRYBUTY' : 'ZBIERACKIE'}</span></div>`;

  h += `<div class="segs">
    <button data-act="skilltab" data-t="zbierackie" aria-selected="${skillTab === 'zbierackie'}">Zbierackie</button>
    <button data-act="skilltab" data-t="bojowe" aria-selected="${skillTab === 'bojowe'}">Bojowe</button>
    <button data-act="skilltab" data-t="atrybuty" aria-selected="${skillTab === 'atrybuty'}">
      Atrybuty${S.unspentAttr ? ` · ${S.unspentAttr}` : ''}</button>
  </div>`;

  if (skillTab === 'bojowe') return h + sekcjaBojowe();
  if (skillTab === 'atrybuty') return h + sekcjaAtrybuty();
  return h + sekcjaZbierackie();
}

function sekcjaAtrybuty() {
  const st = S.stats;
  let h = `<div class="scrollbox">`;
  h += `<div class="card ${S.unspentAttr ? 'hi' : ''} row">
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
  h += `<div class="statgrid" style="margin-top:8px">
    <div class="stat-box"><span class="k">Zdrowie</span><span class="v">${nf(st.maxHp)}</span></div>
    <div class="stat-box"><span class="k">Atak</span><span class="v">${nf(st.damage)}</span></div>
    <div class="stat-box"><span class="k">Obrona</span><span class="v">${nf(st.armor)}</span></div>
    <div class="stat-box"><span class="k">Prędkość</span><span class="v">${st.speed}</span></div>
    <div class="stat-box"><span class="k">Kryt</span><span class="v">${(st.crit * 100).toFixed(1)}%</span></div>
    <div class="stat-box"><span class="k">Moc</span><span class="v">${nf(st.power)}</span></div>
  </div>`;
  return h + `</div>`;
}

function sekcjaZbierackie() {
  const s = S.skills[skillOpen];
  const akt = S.activity;

  let h = '';
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

  // Szanse jawne od pierwszego dnia. System, który ukrywa liczby, uczy gracza
  // nieufności — a i tak je policzy.
  const wagi = S.summonOdds ?? {};
  const suma = Object.values(wagi).reduce((a, b) => a + b, 0) || 1;
  h += `<div class="sec">Szanse — ${summonKind === 'pets' ? 'pety' : 'sojusznicy'}</div>
    <div class="odds">
      ${Object.entries(wagi).map(([r, w]) => {
        const pct = w / suma * 100;
        return `<div class="oddrow" title="${w} na ${suma} losów">
          <span class="on" style="color:${rarityColor(r)}">${esc(S.rarities[r]?.label ?? r)}</span>
          <span class="ob"><i style="width:${Math.max(1.5, pct)}%;background:${rarityColor(r)}"></i></span>
          <span class="ov">${pct < 1 ? pct.toFixed(1) : Math.round(pct)}%</span>
        </div>`;
      }).join('')}
    </div>
    <div class="t2" style="margin-top:6px">Te same wagi dla obu pul. Jedno losowanie nie może dać
      sojusznika zamiast peta — pule są rozdzielone.</div>`;

  h += `<div class="card" style="margin-top:8px"><div class="t2">Docelowo duplikaty podbijają gwiazdki,
    maksymalny duplikat zamienia się w esencję, a system dostaje <b>jawny pity</b>.
    Tego jeszcze nie ma.</div></div>`;

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

  // Pasek żyje także wtedy, gdy run stoi i CZEKA NA DECYZJĘ — inaczej gracz
  // siedzi w Ekwipunku, a wyprawa stoi i on o tym nie wie.
  const czeka = S.expedition && (S.expedition.decyzja || S.expedition.safepoint);
  const trwa = FIGHT && (FIGHT.playing || AUTO || (FIGHT.mode === 'turowa' && !FIGHT.result));
  if (!trwa && !czeka) { bar.hidden = true; return; }
  bar.hidden = false;

  if (!trwa && czeka) {
    const E = S.expedition;
    bar.innerHTML = `
      <div class="cb-head"><span>WYPRAWA — ETAP ${E.at + 1} / ${E.total}</span>
        <span>SAKWA ${E.sakwaCount}</span></div>
      <div class="cb-decyzja">${E.safepoint ? 'POSTÓJ — WYBIERZ, CO ODESŁAĆ' : 'DECYZJA — WYBIERZ DROGĘ'}</div>
      <div class="cb-act">
        <button class="cbtn go" data-act="tab" data-tab="wyprawa">ROZSTRZYGNIJ</button>
      </div>`;
    return;
  }

  // Wpisy logu niosą tylko HP — nazwa wroga siedzi w FIGHT.foeName, ustawiona przy starcie fali.
  const me = FIGHT.party?.[0];
  const foe = (FIGHT.enemies ?? []).find(e => e.alive) ?? FIGHT.enemies?.[0];
  const pct = (u) => u && u.maxHp ? Math.max(0, Math.round(u.hp / u.maxHp * 100)) : 0;

  bar.innerHTML = `
    <div class="cb-head">
      <span>${S.expedition ? 'WYPRAWA' : `${esc(S.actName.toUpperCase())} — PIĘTRO ${S.floor}`}</span>
      <span>${S.expedition
        ? `ETAP ${Math.min(S.expedition.at + 1, S.expedition.total)} / ${S.expedition.total}`
        : `FALA ${Math.min(S.fight + 1, S.fightsOnFloor)} / ${S.fightsOnFloor}`}</span>
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

    } else if (act === 'openexp') {
      advView = 'exp'; render();

    } else if (act === 'hub') {
      advView = 'hub'; render();

    } else if (act === 'expsel') {
      expSel = btn.dataset.id || null; render();

    } else if (act === 'exprisk') {
      expRisk = btn.dataset.r; render();

    } else if (act === 'expmod') {
      const m = btn.dataset.m;
      if (expMods.has(m)) expMods.delete(m); else expMods.add(m);
      render();

    } else if (act === 'expstart') {
      const d = await api('expstart', {
        id: btn.dataset.id, risk: btn.dataset.r ?? expRisk, mods: [...expMods],
      });
      if (!d.error) { advView = 'exp'; render(); }

    } else if (act === 'expleave') {
      const E = S.expedition;
      if (!confirm(`PORZUCIĆ WYPRAWĘ?\n\nZ sakwy przepadnie: ${E?.sakwaCount ?? 0} przedmiotów`
        + `${(E?.mats ?? []).length ? ` i ${E.mats.map(m => `${m.id} ×${m.count}`).join(', ')}` : ''}.`
        + `\n\nTwój noszony sprzęt i plecak zostają nietknięte.`)) return;
      stopPlayback();
      const d = await api('expleave', {});
      if (!d.error) { advView = 'hub'; toast(d.stracone ? `Przepadło ${d.stracone} przedmiotów` : 'Porzucone'); render(); }

    } else if (act === 'expchoose') {
      const d = await api('expchoose', { opcja: btn.dataset.o });
      if (!d.error) { if (d.efekty?.length) toast(d.efekty.join(' · ')); render(); }

    } else if (act === 'expsafe') {
      const d = await api('expsafe', { itemId: btn.dataset.item ?? null, matId: btn.dataset.mat ?? null });
      if (!d.error) {
        toast(d.wyniesione.length ? `Odesłane: ${d.wyniesione.join(', ')}` : 'Idziesz dalej');
        render();
      }

    } else if (act === 'autoboss') {
      const d = await api('autoboss', { on: !S.alwaysAuto });
      if (!d.error) render();

    } else if (act === 'goto') {
      const d = await api('goto', { floor: Number(btn.dataset.f) });
      if (!d.error) render();

    } else if (act === 'skill') {
      skillOpen = btn.dataset.id; render();

    } else if (act === 'skilltab') {
      skillTab = btn.dataset.t; render();

    } else if (act === 'skillgo') {
      skillTab = btn.dataset.t; openTab('skille'); render();

    } else if (act === 'summonkind') {
      summonKind = btn.dataset.k; summonResult = null; render();

    } else if (act === 'summon') {
      summonResult = null;
      $('#s-summon').innerHTML = renderSummon();     // portal gaśnie na moment przed wynikiem
      const d = await api('summon', { kind: summonKind });
      if (!d.error) { summonResult = d.summon; render(); }

    } else if (act === 'logview') {
      logView = btn.dataset.v; logOpen = null; render();

    } else if (act === 'teamsel') {
      teamSel = btn.dataset.s; render();

    } else if (act === 'teamset') {
      const d = await api('team', { slot: btn.dataset.slot, idx: btn.dataset.idx === '' ? null : Number(btn.dataset.idx) });
      if (!d.error) render();

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

    } else if (act === 'runagain') {
      FIGHT = null; AUTO = false;
      advView = 'exp';
      openTab('wyprawa');
      render();

    } else if (act === 'closefight') {
      const byloWyprawa = FIGHT?.result?.expDone || FIGHT?.result?.expFailed;
      FIGHT = null; AUTO = false;
      advView = byloWyprawa ? 'hub' : (S.expedition ? 'exp' : 'wieza');
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
      startMineLoop(skillOpen, res, r.ms);
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
