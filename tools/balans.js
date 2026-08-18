// NARZĘDZIE DO SKALOWANIA WIEŻY
//
// Odpowiada na jedno pytanie: czy gracz z TAKIM sprzętem przejdzie TO piętro.
// Nie zgaduje — buduje prawdziwą postać, bierze prawdziwe statystyki
// z game/character.js i puszcza prawdziwą symulację z game/combat.js.
// Jeśli coś tu wyjdzie inaczej niż w grze, to znaczy, że gra się zmieniła.
//
//   node tools/balans.js                       tabela pięter 1–50, wszystkie buildy
//   node tools/balans.js --floor 10            samo piętro 10
//   node tools/balans.js --floor 10 --prob 200 więcej prób = mniejszy szum
//   node tools/balans.js --build heroik3       jeden build
//   node tools/balans.js --cel                 sprawdza cele balansu i wychodzi
//                                              kodem 1, gdy któryś nie jest trafiony
//
// BUILD = zestaw sprzętu. Nazwy poniżej w BUILDY.

import CONFIG from '../game/config.js';
import { floorInfo, makeEnemies, rollItem } from '../game/content.js';
import { createFight, runToEnd } from '../game/combat.js';
import { newCharacter, computeStats, bojowe, heroUnit, migrate } from '../game/character.js';
import { mulberry32 } from '../game/content.js';

const C = CONFIG;

// ---------------------------------------------------------------- buildy

// Każdy build to: rzadkość sprzętu, poziom ulepszenia (+N) i ewentualne
// wyjątki na wybranych slotach. ilvl bierze się z piętra, bo tyle wypada
// z wyprawy na tym etapie gry.
const SLOTY = ['bron', 'offhand', 'helm', 'napiersnik', 'buty', 'rekawice', 'pierscien', 'amulet'];

const BUILDY = {
  golo:       { label: 'wyprawka',            rar: null,        plus: 0 },
  common:     { label: 'commony',             rar: 'common',    plus: 0 },
  unique:     { label: 'unique',              rar: 'unique',    plus: 0 },
  heroik:     { label: 'heroiki',             rar: 'heroic',    plus: 0 },
  heroik3:    { label: 'heroiki +3',          rar: 'heroic',    plus: 3 },
  heroik5:    { label: 'heroiki +5',          rar: 'heroic',    plus: 5 },
  legenda2:   { label: '2 legendy + heroiki', rar: 'heroic',    plus: 3, legendy: ['bron', 'napiersnik'] },
  legenda:    { label: 'legendy',             rar: 'legendary', plus: 3 },
};

// Rozdanie punktów. „Dobrze rozdane staty" znaczy: połowa w atrybut, którym
// bijesz, połowa w Wytrzymałość. Skrajne buildy (wszystko w obrażenia)
// giną — i tak ma być.
function rozdajPunkty(ch, pkt) {
  // 55% w Siłę (obrażenia mele), reszta w przeżywalność: Witalność (HP)
  // i Twarda Skóra (pula pancerza). Skrajne buildy w sam atak giną — tak ma być.
  const doAtaku = Math.round(pkt * 0.55);
  const przezyj = pkt - doAtaku;
  const doSkory = Math.round(przezyj * 0.3);
  ch.attrs.sila += doAtaku;
  ch.attrs.twardaskora += doSkory;
  ch.attrs.witalnosc += przezyj - doSkory;
  ch.unspentAttr = 0;
}

function zrobPostac(floor, buildId, ziarno = 991) {
  const B = BUILDY[buildId];
  const ch = migrate(newCharacter('Wzorzec'));
  ch.floor = floor; ch.maxFloor = floor; ch.fight = 0;

  // SKILLE BOJOWE I ICH DRZEWKA. Postać, która doszła na piętro F, ma za sobą
  // mniej więcej tyle walk, że jej skill broni stoi na F, a Ekwipunek defensywny
  // niżej (dostaje ułamek expa). Punkty idą w pierwszy węzeł każdego drzewka —
  // to najlepszy możliwy rozkład, więc mierzymy GÓRNĄ granicę tego, co dają.
  // Poziom skilla mniej więcej równy piętru — tyle walk ma za sobą ktoś, kto tu doszedł.
  const poziomBroni = Math.max(1, floor);
  for (const [id, wezly] of Object.entries(C.combatSkills.drzewka)) {
    const lvl = id === 'obrona' ? Math.max(1, Math.round(poziomBroni * 0.6)) : poziomBroni;
    ch.cskills[id] = { lvl, xp: 0 };
    let pkt = (lvl - 1) * C.combatSkills.punktyNaPoziom;
    for (const n of wezly) {
      const ile = Math.min(C.combatSkills.rangaMax, pkt);
      if (ile > 0) { ch.ctree[n.id] = ile; pkt -= ile; }
    }
  }

  // Punkty: 10 na start + 3 za każde zdobyte piętro.
  rozdajPunkty(ch, C.character.startingAttrPoints + C.character.attrPointsPerFloor * (floor - 1));

  if (B.rar) {
    const rng = mulberry32(floor * 7919 + ziarno * 131);
    for (const slot of SLOTY) {
      const rar = B.legendy?.includes(slot) ? 'legendary' : B.rar;
      const it = rollItem(rng, { ilvl: floor, weights: { [rar]: 1 }, slot });
      it.id = 'b_' + slot;
      it.plus = B.plus;
      ch.equipped[slot] = it;
    }
    // Dwuręczna broń blokuje drugą rękę — trzymamy się reguły gry.
    if (ch.equipped.bron?.hands === 2) delete ch.equipped.offhand;
  }
  return ch;
}

// ---------------------------------------------------------------- symulacja

// Jedno podejście do piętra: fale po kolei, ZDROWIE NIE WRACA między nimi.
// Zwraca { ok, fala, hpPct } — dokładnie to, co gracz zobaczy.
function jednoPodejscie(ch, floor, seed) {
  ch.hpLost = 0;
  const info = floorInfo(floor);
  for (let w = 0; w < info.fights; w++) {
    const st = computeStats(ch);
    const F = createFight({
      party: [heroUnit(ch, st)],
      enemies: makeEnemies(floor, w),
      potions: C.healing.carryTower,
      wtype: st.wtype,
      abilities: bojowe(ch),
      maxMana: st.maxMana, manaRegen: st.manaRegen, poziom: floor,
    }, (seed + w * 7919) >>> 0, 'auto');
    runToEnd(F);
    if (!F.win) return { ok: false, fala: w + 1, hpPct: 0 };
    ch.hpLost = Math.max(0, st.maxHp - F.party[0].hp);
  }
  const st = computeStats(ch);
  return { ok: true, fala: info.fights, hpPct: st.hp / st.maxHp };
}

// KAŻDA próba to INNY zestaw sprzętu tej samej klasy. Bez tego wynik mówił
// o jednym konkretnym losowaniu (dwuręczna czy nie, jakie afiksy) i skakał
// z 0% na 100% przy najmniejszej zmianie liczb.
export function zmierz(floor, buildId, prob = 60) {
  let wygrane = 0, sumaFal = 0, sumaHp = 0;
  let moc = 0, dmg = 0, hp = 0, armor = 0;
  for (let i = 0; i < prob; i++) {
    const ch = zrobPostac(floor, buildId, i + 1);
    const st = computeStats(ch);
    moc += st.power; dmg += st.damage; hp += st.maxHp; armor += st.armor;
    const r = jednoPodejscie(ch, floor, (floor * 104729 + i * 1327 + 7) >>> 0);
    if (r.ok) { wygrane++; sumaHp += r.hpPct; }
    sumaFal += r.fala;
  }
  return {
    floor, build: buildId,
    szansa: wygrane / prob,
    sredniaFala: sumaFal / prob,
    hpNaKoniec: wygrane ? sumaHp / wygrane : 0,
    moc: Math.round(moc / prob), dmg: Math.round(dmg / prob),
    hp: Math.round(hp / prob), armor: Math.round(armor / prob),
  };
}

// ---------------------------------------------------------------- cele balansu

// To są liczby z rozmowy z autorem, zapisane wprost, żeby dało się je sprawdzić
// jedną komendą zamiast klikać przez godzinę.
const CELE = [
  { floor: 10, build: 'heroik3',  min: 0.45, max: 0.85, opis: 'boss 10 w ulepszonych heroikach — do przejścia, ale nie za darmo' },
  { floor: 10, build: 'legenda2', min: 0.90, max: 1.00, opis: 'boss 10 z dwiema legendami — pewność' },
  { floor: 10, build: 'golo',     min: 0.00, max: 0.15, opis: 'boss 10 w wyprawce — nie ma szans' },
  { floor: 5,  build: 'common',   min: 0.55, max: 1.00, opis: 'piętro 5 w commonach — przejściowe' },
  // Piętro 25 nie jest bossem, a heroiki +5 to sprzęt POD to piętro — ma być
  // wygrywalne z zapasem. Górna granica luźniejsza niż u bossów.
  { floor: 25, build: 'heroik5',  min: 0.25, max: 1.00, opis: 'mini-elita 25 w heroikach +5' },
  { floor: 20, build: 'heroik3',  min: 0.35, max: 0.85, opis: 'boss 20 (10k HP) w heroikach +3' },
  { floor: 50, build: 'legenda',  min: 0.20, max: 0.90, opis: 'piętro 50 w legendach — szczyt skali' },
];

// ---------------------------------------------------------------- druk

const pct = (x) => (x * 100).toFixed(0).padStart(3) + '%';

function tabela(pietra, buildy, prob) {
  const naglowek = ['piętro', ...buildy.map(b => BUILDY[b].label.padStart(12))];
  console.log(naglowek.join(' │ '));
  console.log('─'.repeat(naglowek.join(' │ ').length));
  for (const f of pietra) {
    const info = floorInfo(f);
    const znak = info.isBoss ? 'BOSS' : info.isElita ? 'ELIT' : info.isPlus ? '  + ' : '    ';
    const kom = [`${String(f).padStart(3)} ${znak}`];
    for (const b of buildy) kom.push(pct(zmierz(f, b, prob).szansa).padStart(12));
    console.log(kom.join(' │ '));
  }
}

function sprawdzCele(prob) {
  let zle = 0;
  console.log('CELE BALANSU\n');
  for (const c of CELE) {
    const r = zmierz(c.floor, c.build, prob);
    const ok = r.szansa >= c.min && r.szansa <= c.max;
    if (!ok) zle++;
    console.log(`${ok ? '  OK  ' : ' ŹLE  '} piętro ${String(c.floor).padStart(2)} · ${BUILDY[c.build].label.padEnd(20)}`
      + ` ${pct(r.szansa)}  (cel ${pct(c.min)}–${pct(c.max)})   ${c.opis}`);
  }
  console.log(zle ? `\n${zle} cel(e) nietrafione.` : '\nWszystkie cele trafione.');
  return zle;
}

function szczegol(floor, buildy, prob) {
  const info = floorInfo(floor);
  console.log(`PIĘTRO ${floor} · ${info.actName} · ${info.fights} fal`
    + `${info.isBoss ? ' · BOSS' : info.isElita ? ' · MINI-ELITA' : info.isPlus ? ' · wariant +' : ''}`);
  const wrogowie = makeEnemies(floor, info.fights - 1);
  console.log('ostatnia fala: ' + wrogowie.map(w => `${w.name} ${w.maxHp}hp/${w.damage}dmg`).join(' · '));
  console.log('');
  for (const b of buildy) {
    const r = zmierz(floor, b, prob);
    console.log(`${BUILDY[b].label.padEnd(22)} szansa ${pct(r.szansa)}`
      + `   HP na koniec ${pct(r.hpNaKoniec)}`
      + `   średnio dochodzi do fali ${r.sredniaFala.toFixed(1)}`
      + `   [atak ${r.dmg} · hp ${r.hp} · panc ${r.armor} · moc ${r.moc}]`);
  }
}

// ---------------------------------------------------------------- wejście

const arg = (n, d = null) => {
  const i = process.argv.indexOf('--' + n);
  return i > 0 ? (process.argv[i + 1] ?? true) : d;
};

if (process.argv[1] && process.argv[1].endsWith('balans.js')) {
  const prob = Number(arg('prob', 60));
  const build = arg('build');
  const buildy = build ? [build] : Object.keys(BUILDY);

  if (arg('cel')) {
    process.exit(sprawdzCele(Number(arg('prob', 120))) ? 1 : 0);
  } else if (arg('floor')) {
    szczegol(Number(arg('floor')), buildy, prob);
  } else {
    const doPietra = Number(arg('do', 50));
    console.log(`Szansa na CZYSTE przejście piętra (wszystkie fale, HP nie wraca), ${prob} prób\n`);
    tabela([...Array(doPietra).keys()].map(i => i + 1), buildy, prob);
    console.log('');
    sprawdzCele(prob);
  }
}
