// RaidFolk_idle — serwer. Node 22+, zero zależności.
//   node server.js            → http://localhost:8080
//   PORT=3000 node server.js

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

import CONFIG from './game/config.js';
import { floorInfo, makeEnemy, makeEnemies, rollDrops, actForFloor, ACTS,
         rollTrophy, dropsOf, mulberry32 } from './game/content.js';
import { createFight, step, beginTurn, runToEnd, summary, hitChance,
         STRENGTHS, ABILITIES, ULTIMATES } from './game/combat.js';
import * as DB from './game/db.js';
import {
  newCharacter, computeStats, equip, canEquip,
  classOf, migrate, poziom,
  treeOf, nodeState, spendTreePoint, resetTree, respecCost,
  xpNeed, profOf, addSkillXp, canGather, teamUnits, allyStats,
  addCombatXp, skillSplit, cskillNeed, canSummon, slotOpen, petSlotOpen, baseOf,
} from './game/character.js';

const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(here, 'public');
const PORT = Number(process.env.PORT ?? 8080);
const C = CONFIG;

// ---------------------------------------------------------------- regeneracja

const REGEN_PCT_PER_MIN = 0.02;

function applyRegen(ch) {
  const now = Date.now();
  if (!ch.lastSeen) { ch.lastSeen = now; return; }
  const mins = (now - ch.lastSeen) / 60000;
  ch.lastSeen = now;
  if (mins <= 0 || !ch.hpLost) return;
  const st = computeStats(ch);
  const back = Math.floor(st.maxHp * REGEN_PCT_PER_MIN * mins);
  if (back > 0) ch.hpLost = Math.max(0, ch.hpLost - back);
}

// ---------------------------------------------------------------- widok dla klienta

let nextItemId = Date.now();
const giveId = (it) => { it.id = String(nextItemId++); return it; };

// Drzewko wysyłamy policzone: klient nie musi znać reguł odblokowania,
// bo i tak sprawdza je serwer przy wydawaniu punktu.
function treeView(ch) {
  return treeOf(ch.klasa).map(branch => ({
    id: branch.id, label: branch.label,
    spent: branch.nodes.reduce((s, n) => s + (ch.tree?.[n.id] ?? 0), 0),
    nodes: branch.nodes.map((n, i) => {
      const st = nodeState(ch, branch, i);
      return { id: n.id, label: n.label, eff: n.eff, rank: st.rank, max: st.max,
               need: st.need, unlocked: st.unlocked, canRaise: st.canRaise };
    }),
  }));
}

// Lista pięter aktu, w którym gracz stoi. Odblokowanie jest sekwencyjne:
// na piętro N wchodzisz dopiero, gdy N-1 padło.
function floorList(ch) {
  const act = actForFloor(ch.floor);
  const first = (act.id - 1) * C.tower.floorsPerAct + 1;
  const out = [];
  for (let f = first; f < first + C.tower.floorsPerAct; f++) {
    const i = floorInfo(f);
    out.push({ floor: f, isBoss: i.isBoss, isPlus: i.isPlus, fights: i.fights,
               bossName: i.bossName, unlocked: f <= ch.maxFloor, cleared: f < ch.maxFloor,
               here: f === ch.floor });
  }
  return out;
}

// Kronika w postaci gotowej do wyświetlenia — klient nie musi znać tabel trofeów.
function bestiaryView(ch) {
  const znane = new Set();
  for (const a of ACTS) for (const f of a.families) znane.add(f);
  znane.add('Strażnik Puszczy');
  return [...znane].map(family => {
    const w = ch.bestiary?.[family];
    return {
      family, kills: w?.kills ?? 0, seen: !!w,
      drops: dropsOf(family).map(d => (w?.drops ?? []).includes(d) ? d : null),
    };
  }).sort((a, b) => Number(b.seen) - Number(a.seen));
}

// Profesje policzone dla klienta: poziom, exp, próg awansu i to, co już wolno kopać.
function skillsView(ch) {
  return Object.fromEntries(Object.entries(C.skills).map(([id, s]) => {
    const p = profOf(ch, id);
    return [id, {
      label: s.label, ic: s.ic, daje: s.daje, zasila: s.zasila,
      grywalne: !!s.grywalne,
      lvl: p.lvl, xp: p.xp, xpNeed: xpNeed(id, p.lvl),
      resources: (s.resources ?? []).map(r => ({ ...r, unlocked: p.lvl >= r.lvl })),
      ladder: s.ladder ?? null,
    }];
  }));
}

// Surowce w plecaku, z nazwami. Klient nie musi znać tabel z config.
function materialsView(ch) {
  const nazwy = {};
  for (const s of Object.values(C.skills)) for (const r of s.resources ?? []) nazwy[r.id] = r.label;
  return Object.entries(ch.materials ?? {})
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ id, label: nazwy[id] ?? id, count: n }));
}

// Widok wyprawy: gdzie stoisz, co masz w sakwie, czy run czeka na decyzję.
function expView(ch) {
  const X = ch.expedition;
  const w = expNode(ch);
  const pula = w?.typ === 'rozdroze' ? C.expedition.rozdroza
             : w?.typ === 'event' ? C.expedition.eventy : null;
  const def = pula?.find(x => x.id === w.ref) ?? null;

  return {
    risk: X.risk,
    riskLabel: C.expedition.risks[X.risk]?.label,
    at: X.at,
    total: X.nodes.length,
    // Ścieżka runu do narysowania paska postępu.
    nodes: X.nodes.map((n, i) => ({ typ: n.typ, done: i < X.at, here: i === X.at })),
    node: w ? { typ: w.typ } : null,
    // Czekamy na gracza? Wtedy nic samo nie ruszy.
    decyzja: def ? { pytanie: def.pytanie, opcje: def.opcje.map(o => ({ id: o.id, label: o.label, desc: o.desc })) } : null,
    safepoint: w?.typ === 'safepoint' && !X.safepointDone,
    sakwa: X.sakwa,
    sakwaCount: X.sakwa.length,
    mats: Object.entries(X.mats).map(([id, n]) => ({ id, count: n })),
    gold: X.gold,
    efekty: X.efekty,
    lootMult: Math.round(X.lootMult * 100) / 100,
    potionsLeft: Math.max(0, C.expedition.potionCap - X.potionsUsed),
    enemy: ['walka', 'elita', 'boss'].includes(w?.typ) ? expEnemy(ch) : null,
  };
}

// Lista wypraw z tabelą dropów. Przedmiot jest ZNANY, jeśli gracz kiedykolwiek
// go miał albo ma go teraz przy sobie — reszta stoi pod znakiem zapytania.
function expLista(ch) {
  const maByc = new Set(Object.keys(ch.discovered ?? {}));
  for (const it of [...ch.backpack, ...Object.values(ch.equipped)]) {
    const b = baseOf(it); if (b) maByc.add(b);
  }
  return Object.entries(C.expedition.lista).map(([id, def]) => ({
    id, label: def.label, ic: def.ic, opis: def.opis,
    unlockFloor: def.unlockFloor,
    otwarta: poziom(ch) >= def.unlockFloor,
    dlugosc: expDlugosc(def, poziom(ch)),
    dlugoscMax: def.dlugosc[def.dlugosc.length - 1].nodes,
    // Ile w ogóle jest do odkrycia i co z tego już znasz.
    dropsTotal: def.drops.length,
    dropsZnane: def.drops.filter(d => maByc.has(d.base)).length,
    drops: def.drops.map(d => ({
      base: maByc.has(d.base) ? d.base : null,
      slot: d.slot,
      hands: d.hands ?? null,
    })),
  }));
}

function view(ch) {
  const st = computeStats(ch);
  const info = floorInfo(ch.floor);
  const act = actForFloor(ch.floor);
  const isShield = ch.equipped.offhand?.wtype === 'tarcza';

  return {
    floors: floorList(ch),
    bestiary: bestiaryView(ch),
    collection: ch.collection ?? { companions: [], pets: [] },
    team: ch.team,
    // Statystyki towarzyszy policzone tak, jak wejdą do walki — ekran Drużyny
    // nie musi znać wzoru.
    teamStats: {
      allies: (ch.team?.allies ?? []).map(i => {
        const w = ch.collection?.companions?.[i];
        return w ? { idx: i, ...allyStats(st, w, 'ally') } : null;
      }),
      pet: ch.collection?.pets?.[ch.team?.pet]
        ? { idx: ch.team.pet, ...allyStats(st, ch.collection.pets[ch.team.pet], 'pet') } : null,
    },
    allySlots: C.allies.slots,
    slotOpen: Array.from({ length: C.allies.slots }, (_, i) => slotOpen(ch, i)),
    petOpen: petSlotOpen(ch),
    unlockAt: C.allies.unlock,
    formation: C.formation,
    // Wyprawa — jedyne źródło przedmiotów.
    expedition: ch.expedition ? expView(ch) : null,
    expRisks: Object.entries(C.expedition.risks).map(([id, r]) => ({ id, ...r })),
    expLista: expLista(ch),
    expMods: Object.entries(C.expedition.modyfikatory).map(([id, m]) => ({
      id, ...m, otwarty: poziom(ch) >= m.unlockFloor,
    })),
    potionCarry: { wieza: C.healing.carryTower, wyprawa: C.expedition.potionCap },
    alwaysAuto: !!ch.alwaysAuto,
    summonOdds: C.summon.weights,
    lastDefeat: ch.lastDefeat ?? null,
    // Skille bojowe policzone dla klienta: poziom, exp, próg i aktualny udział
    // w podziale expa. Udział bierze się z tego, co masz w rękach.
    cskills: Object.entries(C.combatSkills.list).map(([id, def]) => {
      const s = ch.cskills[id] ?? { lvl: 1, xp: 0 };
      return { id, ...def, lvl: s.lvl, xp: s.xp, need: cskillNeed(s.lvl),
               udzial: id === 'witalnosc' ? 1 : (skillSplit(ch)[id] ?? 0) };
    }),
    hands: {
      bron: ch.equipped.bron?.hands ?? 1,
      offBlocked: (ch.equipped.bron?.hands ?? 1) === 2,
    },
    skills: skillsView(ch),
    materials: materialsView(ch),
    // Nazwy WSZYSTKICH surowców, nie tylko posiadanych — inaczej koszt
    // ulepszenia pokazywał surowe id, gdy gracz nie miał ani jednej sztaby.
    matNames: Object.fromEntries(Object.values(C.skills)
      .flatMap(sk => sk.resources ?? []).map(r => [r.id, r.label])),
    buff: ch.buff ?? null,
    upgrade: C.upgrade,
    activity: ch.activity ?? null,
    keys: ch.currency,
    keyCost: C.summon.keyCost,
    forcedTurn: info.isBoss,
    name: ch.name, klasa: ch.klasa, klasaLabel: classOf(ch.klasa).label, crest: ch.crest,
    floor: ch.floor, maxFloor: ch.maxFloor, fight: ch.fight,
    fightsOnFloor: info.fights, isBoss: info.isBoss, isPlus: info.isPlus,
    actName: act.name, actId: act.id, bossName: info.bossName,
    stats: st, poziom: poziom(ch), shield: isShield,
    tree: treeView(ch), treeRespec: respecCost(ch),
    attrs: ch.attrs, unspentAttr: ch.unspentAttr, treePoints: ch.treePoints,
    gold: ch.gold, currency: ch.currency, potions: ch.potions,
    equipped: ch.equipped, backpack: ch.backpack,
    backpackMax: C.gear.backpackSize,
    nextEnemy: makeEnemy(ch.floor, ch.fight),
    nextEnemies: makeEnemies(ch.floor, ch.fight),
    canSummon: { companions: canSummon(ch, 'companions'), pets: canSummon(ch, 'pets') },
    rarities: C.rarities,
    slots: C.gear.slots,
    mode: ch.mode ?? 'auto',
    strengths: Object.fromEntries(Object.entries(STRENGTHS).map(([k, v]) => [k, {
      ...v, chance: hitChance(st.accuracy, k, makeEnemy(ch.floor, ch.fight).evasion ?? 0),
    }])),
    abilities: (ch.abilities ?? Object.keys(C.abilities)).map(id => ({ id, ...C.abilities[id] })),
    ultimate: { ...(ULTIMATES[st.wtype] ?? ULTIMATES.mele), wtype: st.wtype },
    chargeMax: C.combat.chargeMax,
    activeFight: ch.activeFight && !ch.activeFight.over ? summary(ch.activeFight) : null,
  };
}

// ---------------------------------------------------------------- akcje

// ---------------------------------------------------------------- wyprawa
// Osobne wyjście poza wieżę i JEDYNE źródło przedmiotów. Łup zbiera się
// do sakwy i wpada do plecaka dopiero po ukończeniu — śmierć zabiera wszystko.

// Węzeł, na którym stoi run. Rozdroże i event ZATRZYMUJĄ postęp — dopóki gracz
// nie zdecyduje, nic się nie dzieje. Automat nie wybiera drogi za niego.
const expNode = (ch) => ch.expedition?.nodes?.[ch.expedition.at] ?? null;

function expEnemy(ch) {
  const E = C.expedition;
  const X = ch.expedition;
  const r = E.risks[X.risk] ?? E.risks.rowne;
  const wezel = expNode(ch);
  const pietro = Math.max(1, ch.maxFloor + r.floorOffset);
  const e = makeEnemy(pietro, X.at);

  const M = modSuma(X.mods ?? []);
  let m = r.mob;
  if (wezel?.typ === 'elita') m *= E.elitaMult;
  if (wezel?.typ === 'boss') m *= E.bossMult;
  // Klątwy z eventów podbijają obrażenia wroga na resztę runu.
  const klatwaDmg = (X.efekty ?? []).reduce((a, e2) => a * (e2.mobDmg ?? 1), 1);

  e.hp = Math.max(1, Math.round(e.hp * m * M.hp)); e.maxHp = e.hp;
  e.damage = Math.max(1, Math.round(e.damage * m * klatwaDmg * M.dmg));
  e.gold = Math.round(e.gold * E.goldMult);
  e.expFloor = pietro;
  if (wezel?.typ === 'elita') e.name = `${e.name} — Elita`;
  if (wezel?.typ === 'boss') { e.name = `Pan ${actForFloor(pietro).name}`; e.variant = 'boss'; }
  return e;
}

// Buduje węzły runu z szkieletu i ziarna. Ten sam seed = ten sam run.
function expNodes(seed, dlugosc = null, M = null) {
  const rng = mulberry32(seed);
  const E = C.expedition;

  // Szkielet rozciąga się albo skraca do zadanej długości: boss zawsze na końcu,
  // brakujące miejsca dosypują się zwykłymi walkami przed elitą.
  let szk = [...E.szkielet];
  if (dlugosc && dlugosc !== szk.length) {
    const ogon = szk.slice(-2);                 // elita, boss
    let srodek = szk.slice(0, -2);
    while (srodek.length + 2 < dlugosc) srodek.splice(srodek.length - 1, 0, 'walka');
    while (srodek.length + 2 > dlugosc && srodek.length > 3) {
      const i = srodek.lastIndexOf('walka');
      if (i < 0) break;
      srodek.splice(i, 1);
    }
    szk = [...srodek, ...ogon];
  }
  if (M?.bezPostoju) szk = szk.filter(t => t !== 'safepoint');
  // Łowy na elity zamieniają zwykłe walki w elity.
  for (let n = M?.elity ?? 0; n > 0; n--) {
    const i = szk.indexOf('walka', 2);
    if (i < 0) break;
    szk[i] = 'elita';
  }

  return szk.map((typ, i) => {
    if (typ === 'rozdroze') {
      const r = E.rozdroza[Math.floor(rng() * E.rozdroza.length)];
      return { typ, i, ref: r.id };
    }
    if (typ === 'event') {
      const ev = E.eventy[Math.floor(rng() * E.eventy.length)];
      return { typ, i, ref: ev.id };
    }
    return { typ, i };
  });
}

// Ile etapów ma run tej wyprawy przy obecnym poziomie. Dalej w wieży —
// dłuższa droga, więcej łupu i więcej okazji, żeby zginąć z pełną sakwą.
function expDlugosc(def, poziomGracza) {
  let n = def.dlugosc[0].nodes;
  for (const prog of def.dlugosc) if (poziomGracza >= prog.floor) n = prog.nodes;
  return n;
}

// Suma efektów wybranych modyfikatorów.
function modSuma(mods = []) {
  const out = { hp: 1, dmg: 1, heal: 1, elity: 0, bezPostoju: false, reward: 1 };
  for (const id of mods) {
    const m = C.expedition.modyfikatory[id];
    if (!m) continue;
    out.hp *= m.hp ?? 1;
    out.dmg *= m.dmg ?? 1;
    out.heal *= m.heal ?? 1;
    out.elity += m.elity ?? 0;
    out.bezPostoju = out.bezPostoju || !!m.bezPostoju;
    out.reward += m.reward ?? 0;
  }
  return out;
}

function doExpStart(ch, id, risk, mods) {
  if (ch.activeFight && !ch.activeFight.over) return { error: 'Najpierw dokończ albo porzuć walkę' };
  if (ch.expedition) return { error: 'Wyprawa już trwa' };
  const def = C.expedition.lista[id];
  if (!def) return { error: 'Nie ma takiej wyprawy' };
  if (poziom(ch) < def.unlockFloor) return { error: `Otwiera się na piętrze ${def.unlockFloor}` };
  if (!C.expedition.risks[risk]) return { error: 'Nieznane ryzyko' };

  // Modyfikatory ponad poziom gracza odpadają po cichu — nie da się ich wybrać w UI.
  const wybrane = (Array.isArray(mods) ? mods : []).filter(m => {
    const d = C.expedition.modyfikatory[m];
    return d && poziom(ch) >= d.unlockFloor;
  });

  const seed = (Date.now() ^ (ch.maxFloor * 7919) ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const M = modSuma(wybrane);
  ch.expedition = {
    id, risk, mods: wybrane, seed,
    nodes: expNodes(seed, expDlugosc(def, poziom(ch)), M),
    at: 0,
    sakwa: [], mats: {}, gold: 0,
    efekty: [],            // klątwy i błogosławieństwa na ten run
    lootMult: M.reward,    // modyfikatory od razu podbijają nagrodę
    potionsUsed: 0,
    safepointDone: false,
    // ZDROWIE NIE WRACA. Wchodzisz z tym, co masz — lecz się przed wyjściem.
  };
  return { ok: true };
}

// Porzucenie wyprawy: sakwa przepada, tak samo jak przy śmierci.
// To NIE jest darmowa ekstrakcja i nie leczy.
function doExpLeave(ch) {
  if (!ch.expedition) return { error: 'Nie jesteś na wyprawie' };
  const stracone = ch.expedition.sakwa.length;
  const matStracone = Object.values(ch.expedition.mats).reduce((a, b) => a + b, 0);
  ch.expedition = null;
  ch.activeFight = null;
  return { ok: true, stracone, matStracone };
}

// Decyzja na rozdrożu albo w evencie. Dopiero ona przesuwa run dalej.
function doExpChoose(ch, opcjaId) {
  const X = ch.expedition;
  if (!X) return { error: 'Nie jesteś na wyprawie' };
  const w = expNode(ch);
  if (!w || (w.typ !== 'rozdroze' && w.typ !== 'event')) return { error: 'Nie ma teraz wyboru' };

  const pula = w.typ === 'rozdroze' ? C.expedition.rozdroza : C.expedition.eventy;
  const def = pula.find(x => x.id === w.ref);
  const opcja = def?.opcje.find(o => o.id === opcjaId);
  if (!opcja) return { error: 'Nie ma takiej opcji' };

  const s = opcja.skutek ?? {};
  const out = { ok: true, wybor: opcja.label, efekty: [] };

  if (s.heal) {
    const st = computeStats(ch);
    const ile = Math.round(st.maxHp * s.heal * modSuma(X.mods ?? []).heal);
    ch.hpLost = Math.max(0, (ch.hpLost ?? 0) - ile);
    out.efekty.push(`+${ile} zdrowia`);
  }
  if (s.potion) {
    ch.potions = Math.max(0, ch.potions + s.potion);
    out.efekty.push(s.potion > 0 ? '+1 mikstura' : '−1 mikstura');
  }
  if (s.material) {
    const rng = mulberry32((X.seed ^ (X.at * 7919)) >>> 0);
    const ile = s.ile[0] + Math.floor(rng() * (s.ile[1] - s.ile[0] + 1));
    X.mats[s.material] = (X.mats[s.material] ?? 0) + ile;
    out.efekty.push(`+${ile} surowca do sakwy`);
  }
  if (s.lootMult) { X.lootMult *= s.lootMult; out.efekty.push(`łup ×${s.lootMult}`); }
  if (s.klatwa) { X.efekty.push(s.klatwa); out.efekty.push(s.klatwa.label); }
  if (s.blogo) {
    X.efekty.push(s.blogo);
    if (s.blogo.lootMult) X.lootMult *= s.blogo.lootMult;
    out.efekty.push(s.blogo.label);
  }
  // Rozdroże może narzucić, czym jest NASTĘPNY węzeł.
  if (s.nastepny && X.nodes[X.at + 1]) X.nodes[X.at + 1].typ = s.nastepny;

  X.at++;
  return out;
}

// SAFEPOINT — jedyne wcześniejsze wyjście dla łupu i celowo wąskie:
// jeden przedmiot i jeden rodzaj surowca (cały stos).
function doExpSafepoint(ch, itemId, matId) {
  const X = ch.expedition;
  if (!X) return { error: 'Nie jesteś na wyprawie' };
  if (expNode(ch)?.typ !== 'safepoint') return { error: 'Nie stoisz w bezpiecznym miejscu' };
  if (X.safepointDone) return { error: 'Ten postój już wykorzystany' };

  const out = { ok: true, wyniesione: [] };

  if (itemId) {
    const i = X.sakwa.findIndex(x => x.id === String(itemId));
    if (i < 0) return { error: 'Nie ma tego w sakwie' };
    if (ch.backpack.length >= C.gear.backpackSize) return { error: 'Plecak pełny' };
    const it = X.sakwa.splice(i, 1)[0];
    ch.backpack.push(it);
    const b = baseOf(it); if (b) ch.discovered[b] = true;
    out.wyniesione.push(it.name);
  }
  if (matId) {
    const ile = X.mats[matId] ?? 0;
    if (!ile) return { error: 'Nie masz tego surowca' };
    ch.materials[matId] = (ch.materials[matId] ?? 0) + ile;
    delete X.mats[matId];
    out.wyniesione.push(`${matId} ×${ile}`);
  }

  X.safepointDone = true;
  X.at++;
  return out;
}

// Ukończona wyprawa oddaje sakwę i surowce do plecaka.
function expFinish(ch, out) {
  const X = ch.expedition;
  out.expDone = true;
  out.expLoot = [];
  out.expMats = { ...X.mats };
  for (const d of X.sakwa) {
    if (ch.backpack.length >= C.gear.backpackSize) { out.backpackFull = true; break; }
    ch.backpack.push(d); out.expLoot.push(d);
    const b = baseOf(d); if (b) ch.discovered[b] = true;   // odkryte na zawsze
  }
  for (const [k, v] of Object.entries(X.mats)) ch.materials[k] = (ch.materials[k] ?? 0) + v;
  ch.gold += X.gold;
  out.expGold = X.gold;
  ch.expedition = null;
  return out;
}

// Boss aktu zawsze idzie turowo — to jest cały eksperyment: zwykłe fale grają się
// same, ważna walka wraca w ręce gracza. Przełącznik trybu bossa nie dotyczy.
function fightMode(ch) {
  // Gracz może w ustawieniach wymusić, żeby WSZYSTKO grało się samo.
  if (ch.alwaysAuto) return 'auto';
  const bossWiezy = !ch.expedition && floorInfo(ch.floor).isBoss;
  const bossWyprawy = expNode(ch)?.typ === 'boss';
  return (bossWiezy || bossWyprawy) ? 'turowa' : (ch.mode ?? 'auto');
}

// Rozpoczyna walkę. W trybie auto od razu ją rozgrywa,
// w turowym zapisuje stan i oddaje sterowanie graczowi.
function startFight(ch) {
  const naWyprawie = !!ch.expedition;
  const info = floorInfo(ch.floor);
  if (!naWyprawie && ch.fight >= info.fights) return { error: 'Piętro zdobyte — idź wyżej' };
  if (naWyprawie) {
    const w = expNode(ch);
    if (!w) return { error: 'Wyprawa skończona' };
    // Rozdroże i postój zatrzymują run. Automat nie decyduje za gracza.
    if (w.typ === 'rozdroze') return { error: 'Najpierw wybierz drogę' };
    if (w.typ === 'event') return { error: 'Najpierw zdecyduj' };
    if (w.typ === 'safepoint') return { error: 'Najpierw rozstrzygnij postój' };
  }

  // Niedokończona walka turowa nie może być ślepym zaułkiem. Wcześniej zwracała
  // „Walka już trwa" i gracz zostawał z nią na zawsze, bo ekran jej nie pokazywał.
  // Teraz „Walcz" po prostu do niej WRACA.
  if (ch.activeFight && !ch.activeFight.over) {
    return { fight: summary(ch.activeFight), enemy: ch.activeFight.enemies[0], awaiting: true, resumed: true };
  }

  // Od piętra 3 wychodzą we dwóch — dopiero wtedy szyk ma sens.
  const wrogowie = naWyprawie ? [expEnemy(ch)] : makeEnemies(ch.floor, ch.fight);
  const enemy = wrogowie[0];
  const st = computeStats(ch);
  const seed = (Date.now() ^ (ch.floor * 7919) ^ (ch.fight * 104729)) >>> 0;

  // HP NIE wraca między falami. Wchodzisz w falę drugą z tym, co zostało po pierwszej —
  // na tym wyczerpaniu stoi całe napięcie piętra. Pełne HP oddaje dopiero wejście
  // na nowe piętro albo przegrana (bo inaczej nie dałoby się powtórzyć).
  const F = createFight({
    party: [{
      name: ch.name, kind: 'gracz', hp: Math.max(1, st.hp), maxHp: st.maxHp,
      damage: st.damage, speed: st.speed, armor: st.armor,
      crit: st.crit, critMult: st.critMult, accuracy: st.accuracy, evasion: st.evasion,
      block: st.block, blockCut: st.blockCut, potionPct: st.potionPct,
      // Rodzaj obrażeń bierze się z broni w ręce. Log walki koloruje po tym.
      dtype: st.wtype === 'magia' ? 'mag' : 'fiz',
      // Szyk: bohater stoi z przodu, ale zasięg ma z broni.
      row: st.row, reach: st.reach,
    },
    // Sojusznicy i pet wchodzą do walki na tych samych prawach co bohater.
    // Ich HP nie przenosi się między falami — wyczerpanie dotyczy gracza.
    ...teamUnits(ch, st)],
    enemies: wrogowie,
    // Ile mikstur masz PRZY SOBIE. Wieża to wypad na chwilę (3), wyprawa
    // wyjście na długo (10 na cały run, nie na walkę).
    potions: naWyprawie
      ? Math.min(ch.potions, Math.max(0, C.expedition.potionCap - ch.expedition.potionsUsed))
      : Math.min(ch.potions, C.healing.carryTower),
    wtype: st.wtype,
    abilities: ch.abilities ?? Object.keys(ABILITIES),
  }, seed, fightMode(ch));
  F.enemyMeta = { variant: enemy.variant,
                  gold: wrogowie.reduce((s, w) => s + w.gold, 0),
                  floor: naWyprawie ? enemy.expFloor : ch.floor,
                  fightIdx: naWyprawie ? ch.expedition.at : ch.fight,
                  family: enemy.family,
                  families: wrogowie.map(w => w.family),
                  wyprawa: naWyprawie,
                  wezel: naWyprawie ? expNode(ch).typ : null };
  ch.activeFight = F;

  if ((naWyprawie ? (ch.mode ?? 'auto') : fightMode(ch)) === 'auto') { runToEnd(F); return resolveFight(ch); }

  beginTurn(F);           // przewiń wrogie ciosy do pierwszej decyzji gracza
  if (F.over) return resolveFight(ch);
  return { fight: summary(F), enemy, awaiting: true };
}

// Jedna akcja gracza w trybie turowym.
function actFight(ch, action) {
  const F = ch.activeFight;
  if (!F || F.over) return { error: 'Nie ma trwającej walki' };
  step(F, action);
  if (F.over) return resolveFight(ch);
  return { fight: summary(F), enemy: F.enemies[0], awaiting: true };
}

// Rozliczenie zakończonej walki: exp, złoto, łup, postęp piętra.
function resolveFight(ch) {
  const F = ch.activeFight;
  const res = summary(F);
  const meta = F.enemyMeta;
  const info = floorInfo(ch.floor);

  // Buff z jedzenia zużywa się walkami, nie czasem — dzięki temu nie ucieka,
  // gdy gracz odejdzie od telefonu.
  if (ch.buff) {
    ch.buff.walki--;
    if (ch.buff.walki <= 0) { out.buffKoniec = ch.buff.label; ch.buff = null; }
  }

  // Zużyte mikstury schodzą ze stanu; na wyprawie liczy się też limit noszenia.
  const wypite = res.potionsUsed ?? 0;
  ch.potions = Math.max(0, ch.potions - wypite);
  if (ch.expedition) ch.expedition.potionsUsed += wypite;
  ch.activeFight = null;

  const out = { ...res, enemy: F.enemies[0], loot: [], gold: 0,
                floorCleared: false, awaiting: false, trophy: null };

  if (res.win) {
    // HP zostaje takie, jakie wyszło z walki — następna fala zaczyna się stąd.
    const me = res.party[0];
    ch.hpLost = Math.max(0, me.maxHp - me.hp);

    out.gold = meta.gold;
    ch.gold += meta.gold;

    // Skille bojowe rosną z tego, CZYM bijesz. Podział rąk siedzi w skillSplit().
    const pula = C.combatSkills.xpPerFloor * meta.floor
      * (meta.variant === 'boss' ? 6 : meta.variant === 'plus' ? 2 : 1);
    out.skillXp = pula;
    out.skillAwans = addCombatXp(ch, pula);

    // Kronika: licznik zabić i odsłanianie trofeów. Liczy się KAŻDY ubity,
    // nie tylko pierwszy — od piętra 3 wychodzą we dwóch.
    for (const fam of meta.families ?? [meta.family]) {
      const wpis = ch.bestiary[fam] ??= { kills: 0, drops: [] };
      wpis.kills++;
      const trofeum = rollTrophy((F.seed ^ 0x5EED ^ fam.length) >>> 0, fam, wpis.drops, meta.variant);
      if (trofeum) { wpis.drops.push(trofeum); out.trophy = trofeum; }
    }

    // ŁUP TYLKO Z WYPRAWY. Wieża daje złoto, exp skilli i wpisy w Kronice,
    // ale przedmiotów nie daje — to są dwie różne decyzje, nie jedna pętla.
    if (meta.wyprawa) {
      const X = ch.expedition;
      const r = C.expedition.risks[X.risk] ?? C.expedition.risks.rowne;
      const mnoznik = r.lootMult * X.lootMult
        * (meta.wezel === 'elita' ? 1.6 : meta.wezel === 'boss' ? 3 : 1);
      const szansa = Math.min(0.95, C.loot.dropChance * mnoznik);
      const def = C.expedition.lista[X.id] ?? C.expedition.lista.puszcza;
      const drops = Math.random() < szansa
        ? rollDrops((F.seed ^ 31337) >>> 0,
            { floor: meta.floor, variant: meta.wezel === 'boss' ? 'boss' : 'plus',
              pool: def.drops })
        : [];
      for (const d of drops) { giveId(d); X.sakwa.push(d); out.loot.push(d); }

      // Materiały też lecą do sakwy — i też przepadają razem z nią.
      if (Math.random() < 0.5) {
        const ile = 1 + Math.floor(Math.random() * 3);
        X.mats.miedz = (X.mats.miedz ?? 0) + ile;
        out.mats = { miedz: ile };
      }

      X.gold += meta.gold;
      X.at++;
      out.expWave = X.at;
      out.expWaves = X.nodes.length;
      out.sakwa = X.sakwa.length;
      out.sakwaMats = Object.values(X.mats).reduce((a, b) => a + b, 0);
      // Dopiero BOSS oddaje sakwę. Wcześniej nie ma wyjścia poza safepointem.
      if (meta.wezel === 'boss') expFinish(ch, out);
    } else {
      ch.fight++;
      if (ch.fight >= info.fights) out.floorCleared = true;
    }
  } else if (meta.wyprawa) {
    // Śmierć na wyprawie zabiera CAŁĄ sakwę — przedmioty i surowce zdobyte
    // w tym runie. Twój noszony sprzęt i plecak sprzed wyprawy są nietknięte.
    out.expFailed = true;
    out.expLost = ch.expedition.sakwa.map(i => i.name);
    out.expLostMats = { ...ch.expedition.mats };
    out.expReached = ch.expedition.at;
    out.expTotal = ch.expedition.nodes.length;
    ch.expedition = null;
    // Zdrowie NIE wraca. Lecz się miksturami przed kolejnym wyjściem.
  } else {
    // Porażka cofa na początek piętra i oddaje pełne HP. Bez tego wyczerpanie
    // zamyka gracza w pętli, z której nie da się wyjść — a nic nie tracisz
    // poza czasem i wypitymi miksturami.
    //
    // Zapamiętujemy, GDZIE się wywaliło. Bez tego gracz wraca po godzinie
    // i nie wie, na czym utknął — a to jest jedyna informacja, która mówi mu,
    // ile jeszcze brakuje.
    ch.lastDefeat = {
      floor: meta.floor,
      wave: meta.fightIdx + 1,
      waves: info.fights,
      enemy: F.enemies[0].name,
      at: Date.now(),
    };
    // ZDROWIE NIE WRACA PO PORAŻCE. Wcześniej wracało, żeby nie dało się utknąć —
    // teraz utknięcie jest właśnie tym, co ma boleć. Wyjścia są dwa: mikstury
    // (docelowo z Alchemii) albo czekanie na regenerację 2%/min.
    ch.fight = 0;
  }

  return out;
}

function doAdvance(ch) {
  const info = floorInfo(ch.floor);
  if (ch.fight < info.fights) return { error: 'Piętro jeszcze niezdobyte' };

  const gained = { tree: info.isBoss ? C.tower.treePointsPerBoss : C.tower.treePointsPerFloor,
                   attr: C.character.attrPointsPerFloor,
                   currency: info.isBoss ? C.summon.keysPerBoss : C.summon.keysPerFloor };

  ch.treePoints += gained.tree;
  ch.unspentAttr += gained.attr;
  ch.currency += gained.currency;

  ch.floor++;
  ch.fight = 0;
  ch.hpLost = 0;              // nowe piętro to czysta karta — wyczerpanie liczy się w obrębie piętra
  ch.maxFloor = Math.max(ch.maxFloor, ch.floor);
  return { ok: true, gained, floor: ch.floor };
}

// Skok na zdobyte piętro. Wieża jest liniowa tylko w górę — w dół można wracać,
// bo cofnięcie się po sprzęt to zaplanowana część pętli.
function doGoto(ch, floor) {
  const f = Math.floor(Number(floor));
  if (!Number.isFinite(f) || f < 1) return { error: 'Nie ma takiego piętra' };
  if (f > ch.maxFloor) return { error: `Piętro ${f} jeszcze zamknięte` };
  if (ch.activeFight && !ch.activeFight.over) return { error: 'Najpierw dokończ walkę' };
  ch.floor = f;
  ch.fight = 0;
  ch.hpLost = 0;
  return { ok: true, floor: f };
}

// ---------------------------------------------------------------- profesje
// Górnictwo. Klient trzyma zegar i po każdym cyklu woła /api/minetick.
// Serwer sprawdza czas i wydaje DOKŁADNIE JEDEN cykl — dzięki temu nie ma
// postępu offline (którego świadomie jeszcze nie chcemy), a przełączenie
// zakładki niczego nie gubi, bo timer klienta chodzi dalej.

function doMine(ch, skill, resId) {
  const s = C.skills[skill];
  if (!s?.grywalne) return { error: 'Ta profesja jeszcze nie działa' };
  const check = canGather(ch, skill, resId);
  if (!check.ok) return { error: check.reason };
  ch.activity = { skill, res: resId, since: Date.now() };
  return { ok: true, activity: ch.activity };
}

// Obsada slotu drużyny. idx === null zdejmuje towarzysza ze slotu.
function doTeam(ch, slot, idx) {
  const i = idx === null || idx === undefined || idx === '' ? null : Number(idx);
  if (ch.activeFight && !ch.activeFight.over) return { error: 'Najpierw dokończ albo porzuć walkę' };

  if (slot === 'pet') {
    if (i !== null && !ch.collection.pets[i]) return { error: 'Nie ma takiego peta' };
    ch.team.pet = i;
    return { ok: true };
  }

  const n = Number(slot);
  if (!Number.isInteger(n) || n < 0 || n >= C.allies.slots) return { error: 'Nie ma takiego slotu' };
  if (i !== null && !ch.collection.companions[i]) return { error: 'Nie ma takiego sojusznika' };
  // Ten sam sojusznik nie może stać w dwóch slotach naraz.
  if (i !== null) ch.team.allies = ch.team.allies.map(x => (x === i ? null : x));
  ch.team.allies[n] = i;
  return { ok: true };
}

function doMineStop(ch) {
  ch.activity = null;
  return { ok: true };
}

// Czy stać nas na jeden cykl przetwarzania.
function maNaKoszt(ch, koszt) {
  for (const [id, ile] of Object.entries(koszt ?? {})) {
    if ((ch.materials[id] ?? 0) < ile) return false;
  }
  return true;
}

function doMineTick(ch) {
  const a = ch.activity;
  if (!a) return { error: 'Nic nie robisz' };
  const check = canGather(ch, a.skill, a.res);
  if (!check.ok) { ch.activity = null; return { error: check.reason }; }

  const res = check.res;
  const minelo = Date.now() - a.since;
  if (minelo < res.ms - 250) return { error: 'Jeszcze nie teraz' };   // 250 ms luzu na drogę

  // Profesje przetwarzające zjadają surowce. Brak wsadu zatrzymuje pracę —
  // to nie błąd, tylko koniec zapasów.
  if (res.koszt) {
    if (!maNaKoszt(ch, res.koszt)) {
      ch.activity = null;
      return { error: 'Skończyły się surowce' };
    }
    for (const [id, ile] of Object.entries(res.koszt)) {
      ch.materials[id] = (ch.materials[id] ?? 0) - ile;
      if (ch.materials[id] <= 0) delete ch.materials[id];
    }
  }

  const out = { ok: true, gained: { res: res.id, label: res.label, xp: res.xp } };

  // daje.potion — Alchemia. Mikstury nie są surowcem, tylko osobną liczbą.
  if (res.daje?.potion) {
    ch.potions += res.daje.potion;
    out.gained.potions = res.daje.potion;
  } else {
    ch.materials[res.id] = (ch.materials[res.id] ?? 0) + 1;
  }

  out.awans = addSkillXp(ch, a.skill, res.xp);
  a.since = Date.now();
  return out;
}

// Zjedzenie jedzenia z Gotowania. Buff trzyma się przez kilka walk.
function doEat(ch, id) {
  let def = null;
  for (const s of Object.values(C.skills)) {
    const r = (s.resources ?? []).find(x => x.id === id && x.buff);
    if (r) { def = r; break; }
  }
  if (!def) return { error: 'Tego nie da się zjeść' };
  if ((ch.materials[id] ?? 0) < 1) return { error: 'Nie masz tego' };

  ch.materials[id]--;
  if (ch.materials[id] <= 0) delete ch.materials[id];
  ch.buff = { ...def.buff, id };
  return { ok: true, buff: ch.buff };
}

// Ulepszanie sprzętu sztabami z Kowalstwa. Każdy plus to stały przyrost
// obrażeń albo pancerza — proste, przewidywalne, bez ryzyka spalenia.
function doUpgrade(ch, itemId) {
  const it = ch.equipped[Object.keys(ch.equipped).find(s => ch.equipped[s]?.id === String(itemId))]
    ?? ch.backpack.find(i => i.id === String(itemId));
  if (!it) return { error: 'Nie ma takiego przedmiotu' };

  const plus = it.plus ?? 0;
  if (plus >= C.upgrade.maxPlus) return { error: 'Przedmiot jest już maksymalnie ulepszony' };

  const koszt = { ...C.upgrade.koszt };
  for (const k of Object.keys(koszt)) koszt[k] = koszt[k] * (plus + 1);
  if (!maNaKoszt(ch, koszt)) {
    return { error: `Potrzeba ${Object.entries(koszt).map(([k, v]) => `${k} ×${v}`).join(', ')}` };
  }
  for (const [id, ile] of Object.entries(koszt)) {
    ch.materials[id] -= ile;
    if (ch.materials[id] <= 0) delete ch.materials[id];
  }

  it.plus = plus + 1;
  if (it.damage) it.damage = Math.round(it.damage * (1 + C.upgrade.perPlus));
  if (it.armor) it.armor = Math.round(it.armor * (1 + C.upgrade.perPlus));
  return { ok: true, plus: it.plus, name: it.name };
}

// Przywołanie. Prototyp odczucia: jeden klucz, jedno losowanie, żadnej litości
// ani pity. Wynik ląduje w kolekcji, którą czyta Drużyna i Kronika.
function doSummon(ch, rodzaj) {
  const kind = rodzaj === 'pets' ? 'pets' : 'companions';
  if (!canSummon(ch, kind)) {
    return { error: kind === 'pets'
      ? `Pety otwierają się na piętrze ${C.allies.unlock.pet}`
      : `Sojusznicy otwierają się na piętrze ${C.allies.unlock.ally1}` };
  }
  if (ch.currency < C.summon.keyCost) return { error: 'Brak kluczy' };
  ch.currency -= C.summon.keyCost;

  const rng = mulberry32((Date.now() ^ (ch.currency * 7919) ^ Math.floor(Math.random() * 1e9)) >>> 0);
  const wagi = Object.entries(C.summon.weights);
  const suma = wagi.reduce((s, [, w]) => s + w, 0);
  let r = rng() * suma, rarity = 'common';
  for (const [k, w] of wagi) { if ((r -= w) <= 0) { rarity = k; break; } }

  const pula = C.summon[kind][rarity];
  const wpis = pula[Math.floor(rng() * pula.length)];
  // Sojusznicy mają klasę (decyduje o rzędzie w szyku), pety nie — pet zawsze
  // leci przodem.
  const [name, klasa] = Array.isArray(wpis) ? wpis : [wpis, null];
  const wynik = { name, rarity, kind, klasa };
  ch.collection[kind].push(wynik);
  return { ok: true, summon: wynik };
}

// ---------------------------------------------------------------- HTTP

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
               '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
               '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const json = (res, code, body) => {
  const s = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(s);
};

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    // ---------------- API ----------------
    if (path.startsWith('/api/')) {
      const body = req.method === 'POST' ? await readBody(req) : {};
      const token = body.token || url.searchParams.get('token');

      if (path === '/api/roster') return json(res, 200, { roster: DB.roster() });

      // /api/classes skasowane razem z ekranem wyboru klasy.
      // Główna postać nie ma klasy — klasy należą do Sojuszników.

      if (path === '/api/new') {
        const name = String(body.name ?? '').trim().slice(0, 20);
        if (!name) return json(res, 400, { error: 'Podaj imię' });
        const cr = body.crest && typeof body.crest === 'object'
          ? { shape: String(body.crest.shape ?? 'tarcza').slice(0, 20),
              symbol: String(body.crest.symbol ?? 'miecz').slice(0, 20),
              color: String(body.crest.color ?? 'mosiadz').slice(0, 20),
              border: String(body.crest.border ?? 'smola').slice(0, 20),
              ink: String(body.crest.ink ?? 'smola').slice(0, 20) }
          : null;
        const ch = newCharacter(name, cr);
        const t = DB.newToken();
        DB.save(t, name, ch);
        return json(res, 200, { token: t, state: view(ch) });
      }

      // dalej wymagany token
      const ch = token ? DB.load(token) : null;
      if (!ch) return json(res, 401, { error: 'Nie znaleziono postaci' });
      migrate(ch);   // stara klasa i skasowane sloty doprowadzone do obecnej gry
      applyRegen(ch);

      let result = {};
      switch (path) {
        case '/api/state':   break;
        case '/api/fight':   result = startFight(ch); break;
        case '/api/act':     result = actFight(ch, body.action ?? { type: 'attack', strength: 'srednio' }); break;
        case '/api/mode': {
          // Zmiana trybu PORZUCA niedokończoną walkę zamiast jej bronić.
          // Porzucenie nic nie kosztuje — przegrana też nic nie kosztuje poza
          // powrotem na pierwszą falę, a blokada robiła z tego pułapkę bez wyjścia.
          const m = body.mode === 'turowa' ? 'turowa' : 'auto';
          const porzucona = !!(ch.activeFight && !ch.activeFight.over);
          ch.activeFight = null;
          ch.mode = m;
          result = { ok: true, mode: m, porzucona };
          break;
        }
        case '/api/abandon': {
          ch.activeFight = null;
          result = { ok: true };
          break;
        }
        case '/api/advance': result = doAdvance(ch); break;
        case '/api/goto':    result = doGoto(ch, body.floor); break;
        case '/api/summon':  result = doSummon(ch, body.kind); break;
        case '/api/mine':    result = doMine(ch, String(body.skill ?? 'gornictwo'), String(body.res)); break;
        case '/api/minestop':result = doMineStop(ch); break;
        case '/api/minetick':result = doMineTick(ch); break;
        case '/api/team':    result = doTeam(ch, body.slot, body.idx); break;
        case '/api/eat':     result = doEat(ch, String(body.id)); break;
        case '/api/upgrade': result = doUpgrade(ch, body.itemId); break;
        case '/api/expstart':  result = doExpStart(ch, String(body.id ?? 'puszcza'), String(body.risk), body.mods); break;
        case '/api/expleave':  result = doExpLeave(ch); break;
        case '/api/expchoose': result = doExpChoose(ch, String(body.opcja)); break;
        case '/api/expsafe':   result = doExpSafepoint(ch, body.itemId ?? null, body.matId ?? null); break;
        case '/api/autoboss': {
          ch.alwaysAuto = !!body.on;
          result = { ok: true, alwaysAuto: ch.alwaysAuto };
          break;
        }
        case '/api/equip':   result = equip(ch, String(body.itemId)); break;
        case '/api/potion': {
          if (ch.potions <= 0) { result = { error: 'Brak mikstur' }; break; }
          const st = computeStats(ch);
          ch.potions--;
          ch.hpLost = Math.max(0, ch.hpLost - Math.round(st.maxHp * C.healing.potionHealPct * (1 + st.potionPct)));
          result = { ok: true };
          break;
        }
        // Kupowanie mikstur SKASOWANE. Mikstury robi się Alchemią — złoto
        // nie może być skrótem omijającym profesję.
        case '/api/attr': {
          const a = String(body.attr);
          if (!(a in ch.attrs)) { result = { error: 'Nieznany atrybut' }; break; }
          if (ch.unspentAttr <= 0) { result = { error: 'Brak punktów' }; break; }
          ch.attrs[a]++; ch.unspentAttr--;
          result = { ok: true };
          break;
        }
        case '/api/tree': {
          const r = spendTreePoint(ch, String(body.node));
          result = r.ok ? { ok: true, rank: r.rank } : { error: r.reason };
          break;
        }
        case '/api/treereset': {
          const r = resetTree(ch);
          result = r.ok ? { ok: true, cost: r.cost, punkty: r.punkty } : { error: r.reason };
          break;
        }
        case '/api/sell': {
          const idx = ch.backpack.findIndex(i => i.id === String(body.itemId));
          if (idx < 0) { result = { error: 'Nie ma takiego przedmiotu' }; break; }
          const it = ch.backpack[idx];
          const val = Math.round(it.ilvl * 4 * C.rarities[it.rarity].mult);
          ch.gold += val; ch.backpack.splice(idx, 1);
          result = { ok: true, gold: val };
          break;
        }
        case '/api/selljunk': {
          // sprzedaje wszystko, co jest gorsze od noszonego na tym samym slocie
          const scoreOf = (it) => (it.damage ?? 0) * 3 + (it.armor ?? 0) * 1.5
            + (it.affixes ?? []).reduce((n, a) => n + a.value * (a.pct ? 3 : 1.2), 0);
          let gold = 0, n = 0;
          ch.backpack = ch.backpack.filter(it => {
            const worn = ch.equipped[it.slot];
            if (worn && scoreOf(worn) >= scoreOf(it)) {
              gold += Math.round(it.ilvl * 4 * C.rarities[it.rarity].mult); n++;
              return false;
            }
            return true;
          });
          ch.gold += gold;
          result = { ok: true, gold, count: n };
          break;
        }
        default: return json(res, 404, { error: 'Nieznany endpoint' });
      }

      DB.save(token, ch.name, ch);
      return json(res, 200, { ...result, state: view(ch) });
    }

    // APK leży w katalogu projektu, nie w public/ — inaczej pakowałby sam siebie do siebie
    if (path === '/RaidFolk.apk') {
      const apk = await readFile(join(here, 'RaidFolk.apk'));
      res.writeHead(200, {
        'content-type': 'application/vnd.android.package-archive',
        'content-disposition': 'attachment; filename="RaidFolk.apk"',
        'cache-control': 'no-store',
      });
      return res.end(apk);
    }

    // ---------------- pliki ----------------
    let file = path === '/' ? '/index.html' : path;
    const safe = normalize(file).replace(/^(\.\.[/\\])+/, '');
    const full = join(PUBLIC, safe);
    if (!full.startsWith(PUBLIC)) { res.writeHead(403); return res.end('nie'); }

    const data = await readFile(full);
    res.writeHead(200, { 'content-type': MIME[extname(full)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);

  } catch (err) {
    if (err.code === 'ENOENT') { res.writeHead(404); return res.end('404'); }
    console.error(err);
    json(res, 500, { error: String(err.message ?? err) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`RaidFolk_idle — http://localhost:${PORT}`);
  console.log(`w sieci lokalnej: http://<adres-laptopa>:${PORT}`);
});
