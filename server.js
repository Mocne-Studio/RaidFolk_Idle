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
  addCombatXp, skillSplit, cskillNeed, canSummon, slotOpen, petSlotOpen,
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
    expedition: ch.expedition
      ? { ...ch.expedition, sakwaCount: ch.expedition.sakwa.length,
          riskLabel: C.expedition.risks[ch.expedition.risk]?.label,
          enemy: makeEnemy(Math.max(1, ch.maxFloor + (C.expedition.risks[ch.expedition.risk]?.floorOffset ?? 0)),
                           ch.expedition.fight) }
      : null,
    expRisks: Object.entries(C.expedition.risks).map(([id, r]) => ({ id, ...r })),
    expFights: C.expedition.fights,
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

function expEnemy(ch) {
  const E = C.expedition;
  const r = E.risks[ch.expedition.risk] ?? E.risks.rowne;
  const pietro = Math.max(1, ch.maxFloor + r.floorOffset);
  const e = makeEnemy(pietro, ch.expedition.fight);
  e.hp = Math.round(e.hp * r.mob); e.maxHp = e.hp;
  e.damage = Math.round(e.damage * r.mob);
  e.gold = Math.round(e.gold * E.goldMult);
  e.expFloor = pietro;
  return e;
}

function doExpStart(ch, risk) {
  if (ch.activeFight && !ch.activeFight.over) return { error: 'Najpierw dokończ albo porzuć walkę' };
  if (ch.expedition) return { error: 'Wyprawa już trwa' };
  if (!C.expedition.risks[risk]) return { error: 'Nieznane ryzyko' };
  ch.expedition = { risk, fight: 0, fights: C.expedition.fights, sakwa: [], gold: 0 };
  ch.hpLost = 0;                 // wyprawa zaczyna się od pełnego zdrowia
  return { ok: true };
}

// Porzucenie wyprawy w trakcie: sakwa przepada, tak samo jak przy śmierci.
function doExpLeave(ch) {
  if (!ch.expedition) return { error: 'Nie jesteś na wyprawie' };
  const stracone = ch.expedition.sakwa.length;
  ch.expedition = null;
  ch.activeFight = null;
  ch.hpLost = 0;
  return { ok: true, stracone };
}

// Ukończona wyprawa oddaje sakwę do plecaka.
function expFinish(ch, out) {
  const sakwa = ch.expedition.sakwa;
  out.expDone = true;
  out.expLoot = [];
  for (const d of sakwa) {
    if (ch.backpack.length >= C.gear.backpackSize) { out.backpackFull = true; break; }
    ch.backpack.push(d); out.expLoot.push(d);
  }
  ch.expedition = null;
  ch.hpLost = 0;
  return out;
}

// Boss aktu zawsze idzie turowo — to jest cały eksperyment: zwykłe fale grają się
// same, ważna walka wraca w ręce gracza. Przełącznik trybu bossa nie dotyczy.
function fightMode(ch) {
  return floorInfo(ch.floor).isBoss ? 'turowa' : (ch.mode ?? 'auto');
}

// Rozpoczyna walkę. W trybie auto od razu ją rozgrywa,
// w turowym zapisuje stan i oddaje sterowanie graczowi.
function startFight(ch) {
  const naWyprawie = !!ch.expedition;
  const info = floorInfo(ch.floor);
  if (!naWyprawie && ch.fight >= info.fights) return { error: 'Piętro zdobyte — idź wyżej' };
  if (naWyprawie && ch.expedition.fight >= ch.expedition.fights) return { error: 'Wyprawa skończona' };

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
    potions: ch.potions,
    wtype: st.wtype,
    abilities: ch.abilities ?? Object.keys(ABILITIES),
  }, seed, fightMode(ch));
  F.enemyMeta = { variant: enemy.variant,
                  gold: wrogowie.reduce((s, w) => s + w.gold, 0),
                  floor: naWyprawie ? enemy.expFloor : ch.floor,
                  fightIdx: naWyprawie ? ch.expedition.fight : ch.fight,
                  family: enemy.family,
                  families: wrogowie.map(w => w.family),
                  wyprawa: naWyprawie };
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

  ch.potions = res.potionsLeft;
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
      const r = C.expedition.risks[ch.expedition.risk] ?? C.expedition.risks.rowne;
      const ile = Math.random() < (C.loot.dropChance * r.lootMult) ? 1 : 0;
      const drops = ile
        ? rollDrops((F.seed ^ 31337) >>> 0, { floor: meta.floor, variant: 'plus' })
        : [];
      for (const d of drops) { giveId(d); ch.expedition.sakwa.push(d); out.loot.push(d); }
      ch.expedition.gold += meta.gold;
      ch.expedition.fight++;
      out.expWave = ch.expedition.fight;
      out.expWaves = ch.expedition.fights;
      out.sakwa = ch.expedition.sakwa.length;
      if (ch.expedition.fight >= ch.expedition.fights) expFinish(ch, out);
    } else {
      ch.fight++;
      if (ch.fight >= info.fights) out.floorCleared = true;
    }
  } else if (meta.wyprawa) {
    // Śmierć na wyprawie zabiera CAŁĄ sakwę. To jest ta prawdziwa stawka,
    // której wieża nie ma.
    out.expLost = ch.expedition.sakwa.length;
    out.expFailed = true;
    ch.expedition = null;
    ch.hpLost = 0;
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

function doMineTick(ch) {
  const a = ch.activity;
  if (!a) return { error: 'Nic nie kopiesz' };
  const check = canGather(ch, a.skill, a.res);
  if (!check.ok) { ch.activity = null; return { error: check.reason }; }

  const res = check.res;
  const minelo = Date.now() - a.since;
  if (minelo < res.ms - 250) return { error: 'Jeszcze nie teraz' };   // 250 ms luzu na drogę

  ch.materials[res.id] = (ch.materials[res.id] ?? 0) + 1;
  const awans = addSkillXp(ch, a.skill, res.xp);
  a.since = Date.now();

  return { ok: true, gained: { res: res.id, label: res.label, xp: res.xp }, awans };
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
        case '/api/expstart':result = doExpStart(ch, String(body.risk)); break;
        case '/api/expleave':result = doExpLeave(ch); break;
        case '/api/equip':   result = equip(ch, String(body.itemId)); break;
        case '/api/potion': {
          if (ch.potions <= 0) { result = { error: 'Brak mikstur' }; break; }
          const st = computeStats(ch);
          ch.potions--;
          ch.hpLost = Math.max(0, ch.hpLost - Math.round(st.maxHp * C.healing.potionHealPct * (1 + st.potionPct)));
          result = { ok: true };
          break;
        }
        case '/api/buypotion': {
          const cost = 40 + ch.maxFloor * 6;
          if (ch.gold < cost) { result = { error: `Brakuje złota (${cost})` }; break; }
          ch.gold -= cost; ch.potions++;
          result = { ok: true, cost };
          break;
        }
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
