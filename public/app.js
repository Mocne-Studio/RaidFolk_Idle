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

  // Kolejność: herb → wprowadzenie → wybór klasy → dopiero teraz postać powstaje
  // na serwerze, bo klasa jest jej częścią i nie da się jej potem podmienić.
  $('#create').onclick = () => {
    const name = $('#name').value.trim();
    if (!name) return toast('Podaj imię', true);
    showIntro(() => showClasses(async (klasa) => {
      const d = await api('new', { name, crest, klasa });
      if (d.token) {
        TOKEN = d.token; localStorage.setItem('rf_token', TOKEN);
        enterGame();
        openTab('postac');   // świeża postać ląduje na swojej karcie, nie w wieży
      }
    }));
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

// ---------------------------------------------------------------- WPROWADZENIE
// Zasada: opisujemy TYLKO to, co faktycznie działa w tym buildzie. Nowe sekcje
// dopisujemy dopiero wtedy, gdy system naprawdę wejdzie do gry — inaczej gracz
// dostaje obietnice, których gra nie spełnia.
const INTRO = [
  ['Wieża nie ma końca', `
    <p>Stoisz na jej dole. Nikt nie policzył pięter — ci, którzy próbowali, nie wrócili z liczbą.</p>
    <p>Piętra są zakryte. <b>Co jest wyżej, zobaczysz dopiero, gdy tam wejdziesz.</b></p>
    <p>Co dziesiąte piętro pilnuje boss aktu. Bije mocniej i ma dużo więcej życia niż to, co spotkałeś po drodze.</p>`],

  ['Ściana jest w środku piętra', `
    <p>Piętro to <b>od sześciu do dziesięciu fal</b> przeciwników, jedna po drugiej.</p>
    <p>Utkniesz na siódmej fali? Wracasz na niższe piętro, dobijasz poziom, poprawiasz sprzęt i wchodzisz jeszcze raz.</p>
    <p>Cofanie się nie jest porażką. <b>Na tej pętli stoi cała gra.</b></p>`],

  ['Jak się bijesz', `
    <p>Dwa tryby. <b>Automatyczny</b> toczy się sam — patrzysz i zbierasz łup. <b>Turowy</b> oddaje ci każdy cios.</p>
    <p>Trzy siły ciosu: lekki, średni, mocny. <b>Mocniej znaczy rzadziej</b> — mocny cios boli podwójnie, ale łatwiej nim spudłować.</p>
    <p>Nie każdy cios trafia. Celność jest twoja, unik jego — obie rosną ze Zręczności.</p>`],

  ['Pasek ultimate', `
    <p>Każde trafienie ładuje pasek: lekki cios o 1, średni o 2, mocny o 3. Pełny pasek to 10.</p>
    <p>Ładunki wydajesz na umiejętności i na ultimate swojej broni. <b>Pudło zeruje cały pasek</b> — mocny cios ryzykuje więcej, niż widać.</p>
    <p>Za każde piętro dostajesz trzy punkty atrybutów. Wytrzymałość daje życie i pancerz, Zręczność prędkość, celność i unik — to działa u każdego tak samo. <b>Obrażenia rosną tylko z atrybutu Twojej klasy</b>, a klasę wybierzesz za chwilę.</p>`],
];

function showIntro(done) {
  let i = 0;
  const last = () => i === INTRO.length - 1;
  const paint = () => {
    $('#introStep').textContent = `Wprowadzenie · ${i + 1} z ${INTRO.length}`;
    $('#introTitle').textContent = INTRO[i][0];
    $('#introBody').innerHTML = INTRO[i][1];
    $('#introNext').textContent = last() ? 'Wejdź do wieży' : 'Dalej';
    $('#intro').scrollTop = 0;
  };
  const finish = () => { $('#intro').hidden = true; done(); };
  $('#introNext').onclick = () => { if (last()) finish(); else { i++; paint(); } };
  $('#introSkip').onclick = finish;
  $('#start').hidden = true;
  $('#intro').hidden = false;
  paint();
}

// ---------------------------------------------------------------- WYBÓR KLASY
// ATTR_LABEL siedzi niżej, przy ekranie Postaci — tu tylko z niego korzystamy.
const scalingText = (attrs = []) => attrs.map(k => ATTR_LABEL[k] ?? k).join(' i ');

async function showClasses(done) {
  const d = await fetch('/api/classes').then(r => r.json()).catch(() => ({ classes: [] }));
  const list = d.classes ?? [];
  let pick = null;

  $('#cpGrid').innerHTML = list.map(c => `<button class="cp-item" data-id="${c.id}">
    <b>${esc(c.label)}</b><span>${esc(scalingText(c.dmgAttrs))}</span></button>`).join('');

  const paint = () => {
    $$('#cpGrid .cp-item').forEach(b => b.classList.toggle('on', b.dataset.id === pick));
    const c = list.find(x => x.id === pick);
    $('#cpDetail').hidden = !c;
    $('#cpStart').disabled = !c;
    if (!c) return;
    $('#cpStart').textContent = `Zacznij jako ${c.label}`;
    const start = [c.startWeapon, c.startOffhand].filter(Boolean).join(' + ');
    const bonus = Object.entries(c.attrs ?? {}).map(([k, v]) => `+${v} ${ATTR_LABEL[k] ?? k}`).join(' · ');
    $('#cpDetail').innerHTML = `
      <div class="t1">${esc(c.label)}</div>
      <div class="cp-line"><span>Obrażenia rosną z</span><b>${esc(scalingText(c.dmgAttrs))}</b></div>
      <div class="cp-line"><span>Bronie</span><b>${esc(c.bronie ?? '—')}</b></div>
      <div class="cp-line"><span>Na start</span><b>${esc(start || '—')}</b></div>
      ${bonus ? `<div class="cp-line"><span>Atrybuty</span><b>${esc(bonus)}</b></div>` : ''}
      <p class="cp-opis">${esc(c.opis ?? '')}</p>`;
  };

  $('#cpGrid').onclick = (e) => {
    const b = e.target.closest('.cp-item');
    if (!b) return;
    pick = b.dataset.id;
    paint();
  };
  $('#cpStart').onclick = () => { if (pick) { $('#classpick').hidden = true; done(pick); } };

  $('#intro').hidden = true;
  $('#classpick').hidden = false;
  paint();
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
}

// ---------------------------------------------------------------- render

function header() {
  const box = $('#hdrCrest');
  if (box) box.innerHTML = heroCrest(30);
  $('#hdrName').textContent = `${S.name} · ${S.klasaLabel}`;
  $('#hdrMeta').textContent = `PIĘTRO ${S.maxFloor} · MOC ${nf(S.stats.power)} · ${S.actName.toUpperCase()}`;
}

function hpCard() {
  const st = S.stats;
  const low = S.potions === 0;
  return `<div class="card ${low ? 'bad' : ''}">
    <div class="row" style="margin-bottom:7px">
      <div class="grow"><div class="t1">Mikstury</div>
        <div class="t2">Wypijają się same poniżej 30% HP w trakcie walki</div></div>
      <span class="num" style="font-size:17px;color:${low ? 'var(--blood)' : 'var(--brass)'}">${S.potions}</span>
    </div>
    <div class="stat"><span class="k">Zdrowie przed walką</span><span class="v">${nf(st.maxHp)} — zawsze pełne</span></div>
    <div class="actions">
      <button class="btn ghost" data-act="buypotion">Kup miksturę za ${nf(40 + S.maxFloor * 6)}</button>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- walka

// Stan odtwarzania walki po stronie klienta.
// Trzymany osobno, żeby render() nie przerysowywał areny w trakcie animacji.
let FIGHT = null;   // { log, idx, timer, php, pmax, ehp, emax, enemy, result, mode }

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
  let h = `<div class="sec">${f.win ? 'Wygrana' : 'Przegrana'} · ${(f.durationMs / 1000).toFixed(1)} s · ${f.turns} tur</div>`;

  if (f.win) {
    h += `<div class="card">
      <div class="stat"><span class="k">Złoto</span><span class="v up">+${nf(f.gold)}</span></div>
      ${f.potionsUsed ? `<div class="stat"><span class="k">Mikstury</span><span class="v down">−${f.potionsUsed}</span></div>` : ''}
    </div>`;
    if (f.loot.length) h += `<div class="sec">Łup · ${f.loot.length}</div>` + f.loot.map(it => itemRow(it)).join('');
    if (f.backpackFull) h += `<div class="card bad"><div class="t2">Plecak pełny — reszta łupu przepadła.</div></div>`;
  } else {
    h += `<div class="card bad"><div class="t1">${esc(f.enemy.name)} był za mocny</div>
      <div class="t2">Nic nie tracisz poza czasem. Popraw sprzęt, rozdaj punkty albo spróbuj innego ciosu.</div></div>`;
  }

  h += `<div class="actions">
    <button class="btn solid" data-act="closefight">${f.win && !f.floorCleared ? 'Następna fala' : 'Dalej'}</button>
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

  const rest = F.log.length - F.idx;
  const delay = rest > 24 ? 40 : rest > 12 ? 90 : 170;   // przyspiesz, gdy log długi
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
  drawFightView();
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
  $('#s-wieza').append(...tmp.childNodes);
}

function drawFightView() {
  $('#s-wieza').innerHTML = renderFightView();
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

function renderWieza() {
  if (FIGHT) return renderFightView();

  const done = S.fight >= S.fightsOnFloor;
  const e = S.nextEnemy;
  const st = S.stats;

  let html = `<div class="scr-head">Piętro ${S.floor}
    <span>${S.isBoss ? 'BOSS AKTU' : `FALA ${Math.min(S.fight + 1, S.fightsOnFloor)} / ${S.fightsOnFloor}`}</span></div>`;

  html += `<div class="card hi">
    <div class="row" style="margin-bottom:8px">
      <div class="grow"><div class="t1">${esc(S.actName)}</div>
        <div class="t2">Akt ${S.actId} · piętra ${(S.actId - 1) * 10 + 1}–${S.actId * 10}</div></div>
      <span class="badge on">${S.isBoss ? 'BOSS' : S.isPlus ? 'PIĘTRO +' : 'ZWYKŁE'}</span>
    </div>
    ${waveDots()}
  </div>`;

  if (done) {
    html += `<div class="sec">Piętro zdobyte</div>
      <div class="card hi">
        <div class="t1" style="margin-bottom:6px">Wszystkie fale za Tobą</div>
        <div class="stat"><span class="k">Punkty drzewka</span><span class="v up">+${S.isBoss ? 5 : 1}</span></div>
        <div class="stat"><span class="k">Punkty atrybutów</span><span class="v up">+3</span></div>
        ${S.isBoss ? `<div class="stat"><span class="k">Waluta specjalna</span><span class="v up">+1</span></div>` : ''}
        <button class="btn solid big wide" style="margin-top:10px" data-act="advance">Wejdź na piętro ${S.floor + 1}</button>
      </div>`;
    html += hpCard();
    return html;
  }

  html += `<div class="sec">Tryb walki</div>
    <div class="segs">
      <button data-act="mode" data-m="auto"   aria-selected="${S.mode === 'auto'}">Automatyczna</button>
      <button data-act="mode" data-m="turowa" aria-selected="${S.mode === 'turowa'}">Turowa</button>
    </div>
    <div class="card"><div class="t2">${S.mode === 'auto'
      ? 'Walka rozgrywa się sama. Bijesz średnio, mikstura idzie automatycznie poniżej 30% HP.'
      : 'Co turę wybierasz siłę ciosu. Mocniej znaczy rzadziej — celność rośnie ze Zręcznością.'}</div></div>`;

  html += `<div class="sec">Fala ${S.fight + 1} z ${S.fightsOnFloor}</div>
    <div class="units">
      <div class="unit me"><div class="png">${heroCrest(38)}</div>
        <div class="nm">${esc(S.name)}</div>
        <div class="bar hp"><i style="width:100%"></i></div>
        <div class="hpn">${nf(st.maxHp)}</div></div>
      <div class="unit"><div class="png">${S.isBoss ? '👑' : '👹'}</div>
        <div class="nm">${esc(e.name)}</div>
        <div class="bar foe"><i style="width:100%"></i></div>
        <div class="hpn">${nf(e.maxHp)}</div></div>
    </div>
    <div class="card">
      <div class="stat"><span class="k">Obrażenia</span><span class="v">${nf(st.damage)} vs ${nf(e.damage)}</span></div>
      <div class="stat"><span class="k">Prędkość</span><span class="v">${st.speed} vs ${e.speed}</span></div>
      <div class="stat"><span class="k">Pancerz</span><span class="v">${st.armor} vs ${e.armor}</span></div>
      <div class="stat"><span class="k">Celność</span><span class="v">${Math.round(st.accuracy * 100)}%</span></div>
    </div>
    <button class="btn solid big wide" style="margin-top:10px" data-act="fight">Walcz</button>`;

  html += hpCard();
  return html;
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
      <div class="t2 num">${rar.label} · ilvl ${it.ilvl}${it.damage ? ` · obr. ${it.damage}` : ''}${it.armor ? ` · panc. ${it.armor}` : ''}</div>
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

// Makieta postaci. Broń po lewej, druga ręka po prawej, pancerz między nimi —
// pusta komórka w górnym rzędzie robi miejsce na hełm nad środkiem.
const DOLL_ROWS = [
  [null,        'helm',       null],
  ['pierscien', 'amulet',     'rekawice'],
  ['bron',      'napiersnik', 'offhand'],
  [null,        'buty',       null],
];

let dollSlot = null;   // który slot gracz właśnie ogląda

function paperDollHtml() {
  const cell = (slot) => {
    if (!slot) return '<div class="doll-cell blank"></div>';
    const it = S.equipped[slot];
    const on = slot === dollSlot ? ' on' : '';
    return `<button class="doll-cell${it ? '' : ' empty'}${on}" data-act="slot" data-slot="${slot}"
      style="${it ? `border-color:${rarityColor(it.rarity)}` : ''}">
      <span class="ic">${SLOT_ICON[slot] ?? '▪'}</span>
      <span class="lb">${esc(S.slots[slot].label)}</span></button>`;
  };

  let h = `<div class="doll">${DOLL_ROWS.flat().map(cell).join('')}</div>`;
  if (dollSlot) {
    const it = S.equipped[dollSlot];
    h += it
      ? itemRow(it, { equipped: true })
      : `<div class="card"><div class="t1">${esc(S.slots[dollSlot].label)}</div>
         <div class="t2">Pusty slot. Załóż coś z plecaka w zakładce Ekwipunek.</div></div>`;
  }
  return h;
}

function renderPostac() {
  const st = S.stats;
  let h = `<div class="scr-head">${esc(S.name)} <span>${S.klasaLabel.toUpperCase()}</span></div>`;

  h += `<div class="card">
    <div class="stat"><span class="k">Zdrowie</span><span class="v">${nf(st.maxHp)}</span></div>
    <div class="stat"><span class="k">Obrażenia</span><span class="v">${nf(st.damage)}</span></div>
    <div class="stat"><span class="k">Prędkość ataku</span><span class="v">${st.speed}</span></div>
    <div class="stat"><span class="k">Pancerz</span><span class="v">${st.armor}</span></div>
    <div class="stat"><span class="k">Celność</span><span class="v">${Math.round(st.accuracy * 100)}%</span></div>
    <div class="stat"><span class="k">Unik</span><span class="v">${(st.evasion * 100).toFixed(1)}%</span></div>
    <div class="stat"><span class="k">Kryt</span><span class="v">${(st.crit * 100).toFixed(1)}% × ${st.critMult.toFixed(2)}</span></div>
    ${st.block ? `<div class="stat"><span class="k">Blok</span><span class="v">${Math.round(st.block * 100)}% × −${Math.round(st.blockCut * 100)}% obrażeń</span></div>` : ''}
    <div class="stat"><span class="k">Moc</span><span class="v" style="color:var(--brass)">${nf(st.power)}</span></div>
  </div>`;

  h += `<div class="sec">Na sobie</div>`;
  h += paperDollHtml();

  h += `<div class="sec">Zasoby</div><div class="card">
    <div class="stat"><span class="k">Złoto</span><span class="v" style="color:var(--brass)">${nf(S.gold)}</span></div>
    <div class="stat"><span class="k">Waluta specjalna</span><span class="v">${S.currency}</span></div>
    <div class="stat"><span class="k">Mikstury</span><span class="v">${S.potions}</span></div>
  </div>`;

  h += `<div class="card ${S.unspentAttr ? 'hi' : ''}">
    <div class="row"><div class="grow"><div class="t1">Punkty do rozdania</div>
      <div class="t2">10 na start, potem 3 za każde zdobyte piętro</div></div>
      <span class="num" style="font-size:22px;color:var(--brass)">${S.unspentAttr}</span></div>
  </div>`;

  h += `<div class="sec">Atrybuty</div>`;
  for (const k of ['sila', 'intelekt', 'zrecznosc', 'wytrzymalosc']) {
    h += `<div class="card row">
      <div class="grow"><div class="t1">${ATTR_LABEL[k]}</div><div class="t2">${ATTR_DESC[k]}</div></div>
      <span class="num" style="font-size:17px;width:38px;text-align:right">${st.attrs[k]}</span>
      <button class="btn" data-act="attr" data-attr="${k}" ${S.unspentAttr ? '' : 'disabled'}>+</button>
    </div>`;
  }

  h += `<div class="sec">Drzewko klasy</div><div class="card">
    <div class="stat"><span class="k">Punkty drzewka</span><span class="v" style="color:var(--brass)">${S.treePoints}</span></div>
    <div class="stat"><span class="k">Waluta specjalna</span><span class="v">${S.currency}</span></div>
    <div class="t2" style="margin-top:8px">Skille bojowe zniknęły — sprzęt bramkuje sam poziom postaci,
      a specjalizację niesie drzewko ${esc(S.klasaLabel)}. Wydajesz punkty w zakładce Drzewko.</div>
  </div>`;

  h += `<div class="sec">Kod postaci</div>
    <div class="card">
      <div class="t2" style="margin-bottom:8px">Zapisz go sobie. Pozwala wrócić do tej postaci
      z innego urządzenia albo gdy zmieni się adres serwera. Kto ma ten kod, ma Twoją postać.</div>
      <div class="code-box" id="mycode">${esc(TOKEN ?? '')}</div>
      <div class="actions">
        <button class="btn" data-act="copycode">Kopiuj kod</button>
      </div>
    </div>

    <div class="sec">Zmiana postaci</div>
    <div class="card">
      <div class="t2" style="margin-bottom:9px">Wraca do ekranu startowego, gdzie zrobisz nową postać
      albo wczytasz inną kodem. <b style="color:var(--brass)">Ta postać nie znika</b> — wrócisz do niej
      swoim kodem, więc najpierw go skopiuj.</div>
      <button class="btn wide" data-act="logout">Zmień postać</button>
    </div>`;

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
  let h = `<div class="scr-head">Drzewko <span>${esc(S.klasaLabel.toUpperCase())}</span></div>`;

  h += `<div class="card ${S.treePoints ? 'hi' : ''}">
    <div class="row"><div class="grow"><div class="t1">Punkty do wydania</div>
      <div class="t2">1 za piętro, 5 za bossa aktu · wydane: ${total}</div></div>
      <span class="num" style="font-size:22px;color:var(--brass)">${S.treePoints}</span></div>
  </div>`;

  for (const branch of S.tree ?? []) {
    h += `<div class="sec">${esc(branch.label)} · ${branch.spent} pkt</div>`;
    for (const n of branch.nodes) {
      const pelny = n.rank >= n.max;
      h += `<div class="card ${n.unlocked ? '' : 'locked'}">
        <div class="row">
          <div class="grow">
            <div class="t1">${esc(n.label)}
              <span class="num" style="color:${n.rank ? 'var(--brass)' : 'var(--ink-mute)'}">${n.rank}/${n.max}</span></div>
            <div class="t2">${esc(effText(n.eff))} za rangę</div>
            ${n.rank ? `<div class="t2" style="color:var(--brass)">teraz: ${esc(effText(n.eff, n.rank))}</div>` : ''}
            ${n.unlocked ? '' : `<div class="t2" style="color:#D9736B">Wymaga ${n.need} pkt w gałęzi ${esc(branch.label)}</div>`}
          </div>
          <button class="btn" data-act="tree" data-node="${n.id}" ${n.canRaise ? '' : 'disabled'}>${pelny ? 'MAX' : '+'}</button>
        </div>
      </div>`;
    }
  }

  h += `<div class="sec">Reset</div><div class="card">
    <div class="t2" style="margin-bottom:9px">Zwraca wszystkie ${total} wydanych punktów.
      Koszt rośnie z poziomem postaci.</div>
    <button class="btn wide" data-act="treereset" ${total && S.gold >= S.treeRespec ? '' : 'disabled'}>
      Zresetuj za ${nf(S.treeRespec)} zł</button>
  </div>`;

  return h;
}

function renderEq() {
  let h = `<div class="scr-head">Ekwipunek <span>${S.backpack.length} / ${S.backpackMax}</span></div>`;

  h += `<div class="sec">Założone</div>`;
  const order = Object.keys(S.slots);
  let any = false;
  for (const slot of order) {
    const it = S.equipped[slot];
    if (!it) continue;
    any = true;
    h += itemRow(it, { equipped: true });
  }
  if (!any) h += `<div class="card"><div class="t2">Nic nie masz na sobie. Zacznij walczyć.</div></div>`;

  const empty = order.filter(s => !S.equipped[s]);
  if (empty.length) {
    h += `<div class="card"><div class="t2">Puste sloty: ${empty.map(s => S.slots[s].label).join(', ')}</div></div>`;
  }

  const full = S.backpack.length >= S.backpackMax;
  h += `<div class="sec">Plecak</div>`;
  if (full) {
    h += `<div class="card bad"><div class="t1">Plecak pełny</div>
      <div class="t2">Nowy łup przepada. Sprzedaj coś, zanim ruszysz dalej.</div></div>`;
  }
  if (S.backpack.length) {
    h += `<button class="btn ghost wide" data-act="selljunk" style="margin-bottom:9px">
      Sprzedaj wszystko gorsze od noszonego</button>`;
  }
  h += S.backpack.length
    ? [...S.backpack].reverse().map(it => itemRow(it)).join('')
    : `<div class="card"><div class="t2">Pusto.</div></div>`;
  return h;
}

function render() {
  header();
  // W trakcie walki arena i log mają własny cykl rysowania — nie ruszamy ich,
  // inaczej animacja pasków znika, a ekran skacze pod palcem.
  if (FIGHT) drawFightView();
  else $('#s-wieza').innerHTML = renderWieza();
  $('#s-postac').innerHTML = renderPostac();
  $('#s-drzewko').innerHTML = renderDrzewko();
  $('#s-eq').innerHTML     = renderEq();
}

// ---------------------------------------------------------------- akcje

document.addEventListener('click', async (ev) => {
  const tab = ev.target.closest('.tabs button');
  if (tab) { openTab(tab.dataset.tab); return; }

  const btn = ev.target.closest('[data-act]');
  if (!btn || btn.disabled) return;
  const act = btn.dataset.act;
  btn.disabled = true;

  try {
    if (act === 'fight') {
      const d = await api('fight', {});
      if (d.error) return;
      FIGHT = {
        mode: S.mode,
        party: [{ name: S.name, hp: S.stats.maxHp, maxHp: S.stats.maxHp, alive: true }],
        enemies: [{ name: S.nextEnemy.name, hp: S.nextEnemy.maxHp, maxHp: S.nextEnemy.maxHp, alive: true }],
        charge: 0, cooldowns: {},
        log: [], idx: 0, playing: false, result: null,
      };
      if (d.awaiting) {
        FIGHT.log = d.fight.log; FIGHT.idx = d.fight.log.length;
        FIGHT.cooldowns = d.fight.cooldowns;
        syncFightHp(); drawFightView();
      } else startPlayback(d);

    } else if (act === 'strike' || act === 'strikepotion' || act === 'ability' || act === 'ultimate') {
      const action =
        act === 'strikepotion' ? { type: 'potion' } :
        act === 'ability'      ? { type: 'ability', id: btn.dataset.id } :
        act === 'ultimate'     ? { type: 'ultimate' } :
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
      FIGHT = null;
      render();

    } else if (act === 'mode') {
      const d = await api('mode', { mode: btn.dataset.m });
      if (!d.error) render();

    } else if (act === 'advance') {
      FIGHT = null;
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
      dollSlot = dollSlot === btn.dataset.slot ? null : btn.dataset.slot;
      render();
    } else if (act === 'equip') {
      const d = await api('equip', { itemId: btn.dataset.id });
      if (!d.error) { toast('Założone'); render(); }
    } else if (act === 'sell') {
      const d = await api('sell', { itemId: btn.dataset.id });
      if (!d.error) { toast(`+${nf(d.gold)} zł`); render(); }
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
