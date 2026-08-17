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

const CLASS_ICON = { wojownik: '🗡', lucznik: '🏹', mag: '✨', obronca: '🛡' };
let chosenClass = 'wojownik';

async function boot() {
  if (TOKEN) {
    const d = await fetch('/api/state?token=' + TOKEN).then(r => r.json()).catch(() => ({}));
    if (d.state) { S = d.state; enterGame(); return; }
    localStorage.removeItem('rf_token'); TOKEN = null;
  }
  const meta = await fetch('/api/classes').then(r => r.json());
  $('#classes').innerHTML = meta.classes.map(c => `
    <button class="card row klass ${c.id === chosenClass ? 'hi' : ''}" data-k="${c.id}">
      <div class="icon lg">${CLASS_ICON[c.id]}</div>
      <div class="grow">
        <div class="t1">${esc(c.label)}</div>
        <div class="t2">+${c.expBonus * 100}% expa do skilla „${c.skill}"</div>
      </div>
    </button>`).join('');

  $$('.klass').forEach(b => b.onclick = () => {
    chosenClass = b.dataset.k;
    $$('.klass').forEach(x => x.classList.toggle('hi', x === b));
  });

  const r = await fetch('/api/roster').then(r => r.json());
  $('#roster').innerHTML = r.roster.length
    ? r.roster.slice(0, 8).map(p => `<div class="card row">
        <div class="icon">${CLASS_ICON[p.klasa] ?? '·'}</div>
        <div class="grow"><div class="t1">${esc(p.name)}</div>
        <div class="t2 num">piętro ${p.floor}</div></div></div>`).join('')
    : `<div class="card"><div class="t2">Nikt jeszcze nie wszedł. Będziesz pierwszy.</div></div>`;

  $('#create').onclick = async () => {
    const name = $('#name').value.trim();
    if (!name) return toast('Podaj imię', true);
    const d = await api('new', { name, klasa: chosenClass });
    if (d.token) { TOKEN = d.token; localStorage.setItem('rf_token', TOKEN); enterGame(); }
  };
  $('#name').addEventListener('keydown', e => { if (e.key === 'Enter') $('#create').click(); });
}

function enterGame() {
  $('#start').hidden = true;
  $('#app').hidden = false;
  render();
}

// ---------------------------------------------------------------- render

function header() {
  $('#hdrName').textContent = `${S.name} · ${S.klasaLabel}`;
  $('#hdrMeta').textContent = `PIĘTRO ${S.maxFloor} · MOC ${nf(S.stats.power)} · ${S.actName.toUpperCase()}`;
  $('#hdrGold').textContent = `${nf(S.gold)} zł`;
  $('#hdrPot').textContent = `${S.potions} mikstur`;
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
                    kill: 'win', down: 'lose' };

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
      icon: i === 0 ? CLASS_ICON[S.klasa] : SLOT_ICON_PARTY[i],
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

  let h = `<div class="sec">${esc(S.name)}</div><div class="strikes">`;
  for (const [k, v] of Object.entries(S.strengths)) {
    h += `<button class="btn strike" data-act="strike" data-s="${k}">
      <b>${esc(v.label)}</b>
      <span>×${v.dmg.toFixed(2)} · ładuje ${v.charge}</span>
      <span class="ch">${Math.round(v.chance * 100)}% trafienia</span></button>`;
  }
  h += `</div>`;

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
      ${f.levelUps.map(u => `<div class="stat"><span class="k">${u.skill}</span><span class="v up">poziom ${u.level}</span></div>`).join('')}
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

  const entry = F.log[F.idx++];
  if (!entry) return finishPlayback();

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
      <div class="unit me"><div class="png">${CLASS_ICON[S.klasa]}</div>
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

const SLOT_ICON = { bron:'🗡', offhand:'🛡', helm:'🪖', napiersnik:'🥋', spodnie:'👖',
                    buty:'👢', rekawice:'🧤', pas:'🎗', pierscien:'💍', amulet:'📿' };

function canEquipLocal(it) {
  if (it.reqLevel > S.maxFloor) return { ok: false, reason: `Wymaga poziomu ${it.reqLevel} — masz ${S.maxFloor}` };
  const WT = { mele: 'atak', dystans: 'dystansowy', magia: 'magia' };
  const def = S.slots[it.slot];
  let gate = def.gate;
  if (gate === 'weapon') gate = WT[it.wtype] ?? 'atak';
  if (gate === 'offhand') gate = it.wtype === 'tarcza' ? 'obrona' : 'atak';
  if (gate === 'any') {
    const best = Math.max(...['atak','dystansowy','magia','obrona'].map(s => S.skills[s].level));
    return best >= it.reqSkill ? { ok: true } : { ok: false, reason: `Wymaga dowolnego skilla ${it.reqSkill}` };
  }
  return S.skills[gate].level >= it.reqSkill
    ? { ok: true }
    : { ok: false, reason: `Wymaga ${gate} ${it.reqSkill} — masz ${S.skills[gate].level}` };
}

const ATTR_LABEL = { sila: 'Siła', intelekt: 'Intelekt', zrecznosc: 'Zręczność', wytrzymalosc: 'Wytrzymałość' };
const ATTR_DESC = {
  sila: 'obrażenia bronią · trochę HP',
  intelekt: 'obrażenia magiczne · mana',
  zrecznosc: 'prędkość ataku · celność · kryt',
  wytrzymalosc: 'zdrowie · pancerz',
};

function renderPostac() {
  const st = S.stats;
  let h = `<div class="scr-head">${esc(S.name)} <span>${S.klasaLabel.toUpperCase()}</span></div>`;

  h += `<div class="card ${S.unspentAttr ? 'hi' : ''}">
    <div class="row"><div class="grow"><div class="t1">Punkty do rozdania</div>
      <div class="t2">3 za każde zdobyte piętro</div></div>
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

  h += `<div class="sec">Wynikowe</div><div class="card">
    <div class="stat"><span class="k">Zdrowie</span><span class="v">${nf(st.maxHp)}</span></div>
    <div class="stat"><span class="k">Obrażenia</span><span class="v">${nf(st.damage)}</span></div>
    <div class="stat"><span class="k">Prędkość ataku</span><span class="v">${st.speed}</span></div>
    <div class="stat"><span class="k">Pancerz</span><span class="v">${st.armor}</span></div>
    <div class="stat"><span class="k">Celność</span><span class="v">${Math.round(st.accuracy * 100)}%</span></div>
    <div class="stat"><span class="k">Kryt</span><span class="v">${(st.crit * 100).toFixed(1)}% × ${st.critMult.toFixed(2)}</span></div>
    <div class="stat"><span class="k">Moc</span><span class="v" style="color:var(--brass)">${nf(st.power)}</span></div>
  </div>`;

  h += `<div class="sec">Skille bojowe · exp idzie tam, czego używasz</div>`;
  const GATE = { atak: 'bronie mele', dystansowy: 'łuki i kusze', magia: 'różdżki i orby',
                 obrona: 'pancerz i tarcze', zdrowie: 'nic — daje życie' };
  for (const [k, v] of Object.entries(S.skills)) {
    const pct = Math.round(v.exp / v.next * 100);
    const active = k === S.mainSkill || k === 'zdrowie' || (S.shield && k === 'obrona');
    h += `<div class="card">
      <div class="row" style="margin-bottom:6px">
        <div class="grow"><div class="t1">${k} <span class="num" style="color:var(--brass)">${v.level}</span></div>
          <div class="t2">otwiera: ${GATE[k]}</div></div>
        ${active ? '<span class="badge on">ROŚNIE</span>' : ''}
      </div>
      <div class="bar xp"><i style="width:${pct}%"></i></div>
    </div>`;
  }

  h += `<div class="card" style="margin-top:12px">
    <div class="t2">${S.shield
      ? 'Masz tarczę w drugiej ręce — exp dzieli się po połowie między <b>' + S.mainSkill + '</b> i <b>obronę</b>.'
      : 'Bez tarczy cały exp idzie w <b>' + S.mainSkill + '</b>. Załóż tarczę, żeby rosła też Obrona.'}</div>
  </div>`;

  h += `<div class="sec">Do wydania później</div><div class="card">
    <div class="stat"><span class="k">Punkty drzewka</span><span class="v">${S.treePoints}</span></div>
    <div class="stat"><span class="k">Waluta specjalna</span><span class="v">${S.currency}</span></div>
    <div class="stat"><span class="k mut">Drzewko dojdzie w kolejnym kawałku</span><span class="v mut">—</span></div>
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
  $('#s-eq').innerHTML     = renderEq();
}

// ---------------------------------------------------------------- akcje

document.addEventListener('click', async (ev) => {
  const tab = ev.target.closest('.tabs button');
  if (tab) {
    $$('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b === tab)));
    $$('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + tab.dataset.tab));
    $('.screens').scrollTop = 0;
    return;
  }

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
