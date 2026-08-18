// RaidFolk_idle — serwer. Node 22+, zero zależności.
//   node server.js            → http://localhost:8080
//   PORT=3000 node server.js

import http from 'node:http';
import * as childProcess from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

import CONFIG from './game/config.js';
import { floorInfo, makeEnemy, makeEnemies, rollDrops, actForFloor, expeditionEnemyLevel,
         ACTS, WEAPON_TYPES, nowyWtype, classDamageType,
         rollTrophy, dropsOf, mulberry32 } from './game/content.js';
import { createFight, step, beginTurn, runToEnd, autoRound, summary, hitChance, armorK, playerArmorEffect, attackSpeed,
         STRENGTHS, ABILITIES } from './game/combat.js';
import { miningBonuses, miningCycleMs, mineOutcome, qualityChances,
         craftProduct, equipMining, furnaceCoal, transferFurnaceCoal,
         consumeFurnaceFuel, professionBonuses, professionCycleMs,
         fishingOutcome, farmingOutcome, foodEffects, cleanupFoodBuffs,
         eatFood } from './game/professions.js';
import * as DB from './game/db.js';
import {
  newCharacter, computeStats, equip, canEquip,
  classOf, migrate, poziom, heroUnit, kluczWyprawy,
  treeOf, nodeState, spendTreePoint, resetTree, respecCost,
  xpNeed, profOf, addSkillXp, canGather, teamUnits, allyStats, pveGear, switchPveLoadout,
  addCombatXp, skillSplit, cskillNeed, canSummon, slotOpen, petSlotOpen, baseOf,
  ilePotek, zabierzMikstury, zuzyjMikstury,
  punktySkilla, wolnePunkty, wydajPunktSkilla, resetDrzewkaSkilla,
  zaklecia, bojowe,
} from './game/character.js';

const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(here, 'public');
const PORT = Number(process.env.PORT ?? 8080);

// ZNACZNIK WERSJI SERWERA.
// Pliki z `public/` idą do przeglądarki Z DYSKU przy każdym żądaniu, ale
// `server.js` i `game/*` ładują się RAZ, przy starcie procesu. Po aktualizacji
// bez restartu gracz widzi nowe ekrany i stare liczby — i słusznie uznaje,
// że nic nie działa. Klient porównuje ten znacznik ze swoim i mówi wprost,
// że trzeba zrestartować serwer.
// ZMIENIAJ RAZEM z WERSJA_GRY w public/app.js.
// Wersja plików leżących na dysku — czytana z public/app.js, bo to jedyne
// miejsce, w którym klient trzyma swój znacznik.
async function wersjaZDysku() {
  try {
    const txt = await readFile(join(here, 'public', 'app.js'), 'utf8');
    return txt.match(/const WERSJA_GRY = '([^']+)'/)?.[1] ?? null;
  } catch { return null; }
}

export const WERSJA = '2026-08-19.0210';
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
  const regenFood = Math.max(0, foodEffects(ch).hpRegenPct ?? 0);
  const back = Math.floor(st.maxHp * REGEN_PCT_PER_MIN * (1 + regenFood) * mins);
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
      grywalne: !!s.grywalne, domain: s.domain ?? null,
      categories: s.categories ?? null,
      mastery: p.lvl >= 100 ? s.mastery ?? null : null,
      lvl: p.lvl, xp: p.xp, xpNeed: xpNeed(id, p.lvl),
      resources: [...(s.resources ?? [])]
        .sort((a, b) => s.domain ? a.lvl - b.lvl || a.label.localeCompare(b.label, 'pl') : 0)
        .map(r => ({
        ...r, unlocked: p.lvl >= r.lvl,
        catchTable: r.catchTable?.map(x => ({ ...x, unlocked: p.lvl >= x.lvl })),
        effectiveMs: professionCycleMs(ch, id, r),
        qualityChances: id === 'kowalstwo' && r.output && r.output.type !== 'material' && !r.special
          ? qualityChances(p.lvl, r.lvl) : null,
      })),
      ladder: s.ladder ?? null,
    }];
  }));
}

// Surowce w plecaku, z nazwami. Klient nie musi znać tabel z config.
function materialsView(ch) {
  const nazwy = {};
  for (const s of Object.values(C.skills)) for (const r of s.resources ?? []) {
    nazwy[r.id] = r.label;
    for (const x of r.catchTable ?? []) nazwy[x.id] = x.label;
    for (const x of r.outputs ?? []) nazwy[x.id] = x.label;
  }
  for (const [id, m] of Object.entries(C.materialy)) nazwy[id] = m.label;
  for (const [id, m] of Object.entries(C.mining.gems)) nazwy[id] = m.label;
  return Object.entries(ch.materials ?? {})
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ id, label: nazwy[id] ?? id, count: n }));
}

// Widok wyprawy: gdzie stoisz, co masz w sakwie, czy run czeka na decyzję.
function expView(ch) {
  const X = ch.expedition;
  ensureDungeonNodes(ch);
  const dungeon = X.kind === 'dungeon';
  const runCfg = dungeon ? C.dungeons : C.expedition;
  const runDef = dungeon ? C.dungeons.lista[X.id] : C.expedition.lista[X.id];
  const w = expNode(ch);
  const pula = !dungeon && w?.typ === 'rozdroze' ? C.expedition.rozdroza
             : w?.typ === 'event' ? C.expedition.eventy : null;
  const def = pula?.find(x => x.id === w.ref) ?? null;
  const przeciwnicy = ['walka', 'elita', 'boss'].includes(w?.typ ?? '') ? expEnemies(ch) : [];
  const dungeonRoom = dungeon && w ? {
    label: w.label ?? `Komnata ${X.at + 1}`,
    enemies: w.enemies ?? przeciwnicy.length,
    active: Math.min(w.active ?? przeciwnicy.length, w.enemies ?? przeciwnicy.length),
    queued: Math.max(0, (w.enemies ?? przeciwnicy.length) - (w.active ?? przeciwnicy.length)),
    hazard: w.hazard ? { id: w.hazard.id, label: w.hazard.label, desc: w.hazard.desc } : null,
    resists: runDef?.resists ? { ...runDef.resists } : null,
    damageTypes: C.combat.damageTypes,
  } : null;

  return {
    kind: dungeon ? 'dungeon' : 'expedition',
    id: X.id,
    runLabel: runDef?.label ?? (dungeon ? 'Dungeon' : 'Wyprawa'),
    risk: X.risk,
    riskLabel: dungeon ? '5 komnat' : C.expedition.risks[X.risk]?.label,
    // Co da się zjeść przy ognisku — leczy do pełna i zostawia buff.
    jedzenie: Object.entries(ch.materials ?? {})
      .filter(([id, n]) => n > 0 && JADALNE[id])
      .map(([id, n]) => ({ id, label: JADALNE[id].label, count: n, buff: JADALNE[id].buff })),
    postojLeczy: !dungeon && !!C.expedition.postojLeczy,
    at: X.at,
    total: X.nodes.length,
    // Ścieżka runu do narysowania paska postępu.
    nodes: X.nodes.map((n, i) => ({ typ: n.typ, done: i < X.at, here: i === X.at })),
    node: w ? { typ: w.typ } : null,
    // Czekamy na gracza? Wtedy nic samo nie ruszy.
    decyzja: def ? { pytanie: def.pytanie, opcje: def.opcje.map(o => ({ id: o.id, label: o.label, desc: o.desc })) } : null,
    // `safepointDone` jest LISTĄ wykorzystanych ognisk, nie flagą. Puste `[]`
    // jest prawdziwe, więc dawne `!X.safepointDone` zawsze dawało false —
    // klient nie pokazywał postoju, a serwer nie puszczał dalej. Zakleszczenie.
    safepoint: w?.typ === 'safepoint'
      && !(Array.isArray(X.safepointDone) ? X.safepointDone : []).includes(X.at),
    // Podgląd przeciwnika ma sens TYLKO na węźle, na którym się bije.
    enemy: przeciwnicy[0] ?? null,
    enemies: przeciwnicy,
    encounter: dungeonRoom,
    sakwa: X.sakwa,
    sakwaCount: X.sakwa.length,
    mats: Object.entries(X.mats).map(([id, n]) => ({ id, label: C.materialy[id]?.label ?? id, count: n })),
    gold: X.gold,
    efekty: X.efekty,
    lootMult: Math.round(X.lootMult * 100) / 100,
    mobDropChance: dungeon ? C.dungeons.mobDropChance : null,
    eliteMobDropChance: dungeon ? C.dungeons.eliteMobDropChance : null,
    potionsLeft: Math.max(0, runCfg.potionCap - X.potionsUsed),
    potionCap: runCfg.potionCap,
    healAfterWinPct: runCfg.healAfterWinPct,
  };
}

// Lista wypraw z tabelą dropów. Przedmiot jest ZNANY, jeśli gracz kiedykolwiek
// go miał albo ma go teraz przy sobie — reszta stoi pod znakiem zapytania.
// Co w ogóle da się zjeść. Zbierane raz z config, bo definicje jedzenia siedzą
// rozsypane po profesjach (Gotowanie), a postój i tak musi je znać.
const JADALNE = Object.fromEntries((C.skills.gotowanie.resources ?? [])
  .filter(r => r.food)
  .map(r => [r.id, { ...r, buff: { ...r.food.effects, walki: r.food.walki,
                                    buffSlot: r.food.buffSlot } }]));

function expLista(ch) {
  return Object.entries(C.expedition.lista).map(([id, def]) => ({
    id, label: def.label, ic: def.ic, opis: def.opis,
    unlockFloor: def.unlockFloor,
    otwarta: poziom(ch) >= def.unlockFloor,
    // Widełki poziomu łupu dla KAŻDEGO ryzyka — gracz ma wiedzieć, po co tu wchodzi,
    // zanim wybierze. Nazwy ryzyk już raz się zmieniły, więc nie wpisujemy ich tu na sztywno.
    ilvl: def.ilvl ?? null,
    ilvlRyzyka: Object.fromEntries(Object.keys(C.expedition.risks).map(k => [k, widelkiIlvl(def, k)])),
    // Przeciwnicy mają zakres wyprawy, a nie aktualny poziom gracza. Ryzyko
    // przesuwa poziom trasy swoim offsetem; mnożnik statystyk nakłada się osobno.
    poziomyWrogow: Object.fromEntries(Object.entries(C.expedition.risks).map(([k, r]) => [k, [
      expeditionEnemyLevel(def.ilvl, 0, 2, r.floorOffset),
      expeditionEnemyLevel(def.ilvl, 1, 2, r.floorOffset),
    ]])),
    // Długość runu ustawia RYZYKO — lista podaje ją dla każdego progu naraz.
    dlugosci: Object.fromEntries(Object.entries(C.expedition.risks).map(([k, r]) => [k, r.tury])),
    // Wyprawy są źródłem materiałów, których nie da się wydobyć ani wytworzyć.
    materials: (def.mats ?? []).map(m => ({ ...m, label: C.materialy[m.id]?.label ?? m.id,
      ic: C.materialy[m.id]?.ic ?? '🪨', boss: false })),
    bossMaterials: (def.bossMats ?? []).map(m => ({ ...m, label: C.materialy[m.id]?.label ?? m.id,
      ic: C.materialy[m.id]?.ic ?? '🏆', boss: true })),
  }));
}

function dungeonLista(ch) {
  const wagi = C.loot.weightsBoss;
  return Object.entries(C.dungeons.lista).map(([id, def]) => ({
    id, label: def.label, ic: def.ic, opis: def.opis, ilvl: def.ilvl,
    unlockFloor: def.unlockFloor, otwarty: poziom(ch) >= def.unlockFloor,
    ukonczony: ch.dungeonyZrobione?.[id] ?? 0,
    rooms: (def.rooms ?? C.dungeons.nodes.map(typ => ({ typ }))).map(r => r.typ),
    encounters: (def.rooms ?? []).map(r => ({
      typ: r.typ, label: r.label, enemies: r.enemies, active: r.active,
      hazard: r.hazard ? { id: r.hazard.id, label: r.hazard.label, desc: r.hazard.desc } : null,
    })),
    enemyTotal: (def.rooms ?? []).reduce((n, r) => n + (r.enemies ?? 0), 0) || null,
    resists: def.resists ? { ...def.resists } : null,
    prototype: !!def.prototype,
    damageTypes: C.combat.damageTypes,
    normalChance: C.dungeons.normalDropChance,
    eliteChance: C.dungeons.eliteDropChance,
    mobChance: C.dungeons.mobDropChance,
    eliteMobChance: C.dungeons.eliteMobDropChance,
    partyScaling: {
      hp: C.dungeons.partyHpPerExtra,
      damage: C.dungeons.partyDmgPerExtra,
    },
    bossCount: [...C.loot.bossDropCount],
    rarity: Object.fromEntries(Object.entries(wagi).map(([k, v]) => [k, v / 1000])),
    drops: def.drops.map(d => ({ base: d.base, slot: d.slot, hands: d.hands ?? null })),
  }));
}

// Efekt węzła po ludzku. Generowany Z LICZB, więc zmiana balansu nie wymaga
// poprawiania tekstu w drugim miejscu.
const PROCENTOWE = new Set(['dmgPct', 'armorPct', 'hpPct', 'bizuPct', 'critChance',
                            'critPower', 'accuracy', 'evasion', 'block']);
const NAZWA_EFEKTU = {
  dmgPct: 'obrażenia', armorPct: 'pancerz', hpPct: 'zdrowie', bizuPct: 'wartość biżuterii',
  critChance: 'szansa na kryt', critPower: 'siła kryta', accuracy: 'celność',
  evasion: 'unik', block: 'blok', speed: 'prędkość', manaFlat: 'mana',
};
const opisEfektu = (k, v) => `+${PROCENTOWE.has(k) ? (v * 100).toFixed(1) + '%' : v}`
  + ` ${NAZWA_EFEKTU[k] ?? k} za rangę`;

function view(ch) {
  const st = computeStats(ch);
  const teamBase = computeStats(ch, { food: false });
  const pvpStats = computeStats({ ...ch, equipped: ch.pvpEquipment ?? {} });
  const pveA = pveGear(ch, 'a');
  const pveB = pveGear(ch, 'b');
  const pveAStats = ch.pveLoadout === 'a' ? st : computeStats({ ...ch, equipped: pveA });
  const pveBStats = ch.pveLoadout === 'b' ? st : computeStats({ ...ch, equipped: pveB });
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
        return w ? { idx: i, ...allyStats(teamBase, w, 'ally') } : null;
      }),
      pet: ch.collection?.pets?.[ch.team?.pet]
        ? { idx: ch.team.pet, ...allyStats(teamBase, ch.collection.pets[ch.team.pet], 'pet') } : null,
    },
    allySlots: C.allies.slots,
    slotOpen: Array.from({ length: C.allies.slots }, (_, i) => slotOpen(ch, i)),
    petOpen: petSlotOpen(ch),
    unlockAt: C.allies.unlock,
    formation: C.formation,
    damageTypes: C.combat.damageTypes,
    allyRoles: C.allies.roles,
    petRole: C.allies.petRole,
    // Wyprawy dają materiały, Dungeony wyposażenie.
    expedition: ch.expedition ? expView(ch) : null,
    expRisks: Object.entries(C.expedition.risks).map(([id, r]) => ({ id, ...r })),
    expLista: expLista(ch),
    dungeonLista: dungeonLista(ch),
    expMods: Object.entries(C.expedition.modyfikatory).map(([id, m]) => ({
      id, ...m, otwarty: poziom(ch) >= m.unlockFloor,
    })),
    potionCarry: { wieza: C.healing.carryTower, wyprawa: C.expedition.potionCap,
                   dungeon: C.dungeons.potionCap },
    alwaysAuto: !!ch.alwaysAuto,
    kolos: kolosWidok(ch),
    tytan: tytanWidok(ch),
    powtarzaj: !!ch.powtarzaj,
    powtarzanieOd: C.tower.powtarzanieOd,
    powtarzanieOtwarte: poziom(ch) >= C.tower.powtarzanieOd,
    summonOdds: C.summon.weights,
    lastDefeat: ch.lastDefeat ?? null,
    // Skille bojowe policzone dla klienta: poziom, exp, próg i aktualny udział
    // w podziale expa. Udział bierze się z tego, co masz w rękach.
    // Skille bojowe = rodziny broni. Każdy niesie SWOJE drzewko: pulę punktów
    // z poziomów, ile z niej wydane i stan każdego węzła.
    cskills: Object.entries(C.combatSkills.list).map(([id, def]) => {
      const sk = ch.cskills[id] ?? { lvl: 1, xp: 0 };
      const aktywny = id === 'obrona' || id === (nowyWtype(ch.equipped?.bron) ?? 'jednoreczna');
      return {
        id, ...def, lvl: sk.lvl, xp: sk.xp, need: cskillNeed(sk.lvl),
        udzial: skillSplit(ch)[id] ?? 0,
        aktywny,
        punkty: punktySkilla(ch, id),
        wolne: wolnePunkty(ch, id),
        rangaMax: C.combatSkills.rangaMax,
        wezly: (C.combatSkills.drzewka[id] ?? []).map(n => ({
          id: n.id, label: n.label, opis: n.opis,
          ranga: ch.ctree?.[n.id] ?? 0,
          // Opis efektu generuje się z liczb — nie ma drugiego miejsca do poprawiania.
          efekt: Object.entries(n.eff).map(([k, v]) => opisEfektu(k, v)).join(' · '),
        })),
      };
    }),
    weaponTypes: Object.fromEntries(Object.entries(WEAPON_TYPES)
      .map(([k, v]) => [k, { label: v.label, names: v.names.map(n => n[0]) }])),
    hands: {
      bron: ch.equipped.bron?.hands ?? 1,
      offBlocked: (ch.equipped.bron?.hands ?? 1) === 2,
    },
    pvpHands: {
      bron: ch.pvpEquipment?.bron?.hands ?? 1,
      offBlocked: (ch.pvpEquipment?.bron?.hands ?? 1) === 2,
    },
    pveHands: {
      a: { bron: pveA?.bron?.hands ?? 1, offBlocked: (pveA?.bron?.hands ?? 1) === 2 },
      b: { bron: pveB?.bron?.hands ?? 1, offBlocked: (pveB?.bron?.hands ?? 1) === 2 },
    },
    skills: skillsView(ch),
    materials: materialsView(ch),
    mining: {
      slots: C.mining.slots,
      categories: C.mining.categories,
      bonusLabels: C.mining.bonusLabels,
      bonuses: miningBonuses(ch),
      equipment: ch.miningEquipment,
      inventory: ch.miningInventory,
      inventoryMax: C.mining.inventorySize,
      baseGemChance: C.mining.baseGemChance,
    },
    smithing: {
      categories: C.smithing.categories,
      qualities: C.smithing.qualities,
      furnace: { coal: furnaceCoal(ch), looseCoal: Math.max(0, Math.floor(ch.materials?.wegiel ?? 0)) },
    },
    // Nazwy WSZYSTKICH surowców, nie tylko posiadanych — inaczej koszt
    // ulepszenia pokazywał surowe id, gdy gracz nie miał ani jednej sztaby.
    matNames: {
      ...Object.fromEntries(Object.values(C.skills)
        .flatMap(sk => sk.resources ?? []).map(r => [r.id, r.label])),
      ...Object.fromEntries(Object.values(C.skills)
        .flatMap(sk => sk.resources ?? []).flatMap(r => r.catchTable ?? []).map(x => [x.id, x.label])),
      ...Object.fromEntries(Object.values(C.skills)
        .flatMap(sk => sk.resources ?? []).flatMap(r => r.outputs ?? []).map(x => [x.id, x.label])),
      ...Object.fromEntries(Object.entries(C.materialy).map(([id, m]) => [id, m.label])),
      ...Object.fromEntries(Object.entries(C.mining.gems).map(([id, m]) => [id, m.label])),
    },
    buff: ch.buff ?? null,
    foodBuffs: cleanupFoodBuffs(ch),
    upgrade: C.upgrade,
    activity: ch.activity ?? null,
    keys: ch.currency,
    keyCost: C.summon.keyCost,
    forcedTurn: info.isBoss,
    bossOdkrywaOd: C.tower.bossOdkrywaOd,
    name: ch.name, klasa: ch.klasa, klasaLabel: classOf(ch.klasa).label, crest: ch.crest,
    // Karta gracza i ustawienia. Motyw i jakość niesie serwer, żeby przetrwały
    // zmianę urządzenia — localStorage trzyma je tylko po to, żeby nie mrugały
    // przy starcie, zanim wróci stan.
    wersja: WERSJA,
    armorModel: C.combat.armorModel,
    ranking: (() => { const R = ranking(); return { pietro: R.pietro, moc: R.moc, ilu: R.ilu }; })(),
    mojeMiejsce: mojeMiejsce(ch, st),
    createdAt: ch.createdAt ?? null,
    bio: ch.bio ?? '',
    guild: ch.guild ?? null,
    settings: ch.settings ?? C.ui.domyslne,
    ui: { themes: C.ui.themes, quality: C.ui.quality, bioMax: C.ui.bioMax },
    floor: ch.floor, maxFloor: ch.maxFloor, fight: ch.fight,
    fightsOnFloor: info.fights, isBoss: info.isBoss, isPlus: info.isPlus,
    actName: act.name, actId: act.id, bossName: info.bossName,
    stats: st, poziom: poziom(ch), shield: isShield,
    tree: treeView(ch), treeRespec: respecCost(ch),
    attrs: ch.attrs, unspentAttr: ch.unspentAttr, treePoints: ch.treePoints,
    gold: ch.gold, currency: ch.currency,
    // `potions` zostaje jako SUMA — na niej stoi pół UI. Rozbicie na rodzaje
    // idzie obok, bo dopiero ono mówi, czym gracz się właściwie leczy.
    potions: ilePotek(ch),
    mikstury: C.healing.mikstury.map(m => ({
      ...m, count: ch.mikstury?.[m.id] ?? 0,
      // Ile uleczy TĘ postać — procent i liczba punktów w jednym miejscu.
      heal: Math.round(m.pct ? st.maxHp * m.pct : m.flat),
    })).filter(m => m.count > 0),
    // Pełna tabela mikstur (bez filtra na posiadane) — dla ekranu Alchemii,
    // gdzie gracz robi to, czego jeszcze nie ma.
    miksturyInfo: C.healing.mikstury.map(m => ({
      id: m.id, label: m.label, pct: m.pct ?? null, flat: m.flat ?? null,
      heal: Math.round(m.pct ? st.maxHp * m.pct : m.flat),
    })),
    equipped: ch.equipped,
    pveEquipment: { a: pveA, b: pveB }, pveStats: { a: pveAStats, b: pveBStats },
    pveLoadout: ch.pveLoadout ?? 'a',
    pvpEquipment: ch.pvpEquipment, pvpStats, backpack: ch.backpack,
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
    abilities: bojowe(ch).filter(id => C.abilities[id]).map(id => ({ id, ...C.abilities[id] })),
    // Runy: co masz w zapasach, co podpięte, co by to dało.
    runa: ch.runa,
    runy: Object.entries(C.abilities).filter(([, a]) => a.czar)
      .reduce((acc, [id, a]) => {
        (acc[a.czar.runa] ??= []).push({ id, label: a.label, magia: a.czar.magia, desc: a.desc });
        return acc;
      }, {}),
    magiaLvl: ch.cskills?.magia?.lvl ?? 1,
    activeFight: ch.activeFight && !ch.activeFight.over ? summary(ch.activeFight) : null,
    combatRunStats: combatRunView(ch.combatRunStats),
  };
}

// ---------------------------------------------------------------- RANKING
// Top 3 po piętrze i top 3 po mocy. Liczone ze wszystkich zapisów, więc
// wymaga policzenia statystyk każdej postaci — stąd krótki cache. Bez niego
// ranking przeliczałby się przy KAŻDYM zapytaniu do API.
const RANK_CACHE_MS = 15000;
let rankCache = { t: 0, data: null };

function ranking() {
  if (rankCache.data && Date.now() - rankCache.t < RANK_CACHE_MS) return rankCache.data;
  const lista = [];
  for (const r of DB.all()) {
    // Zapis, którego nie da się wczytać, nie ma prawa wywalić rankingu wszystkim.
    try {
      const ch = migrate(r.ch);
      lista.push({ name: ch.name, crest: ch.crest, floor: ch.maxFloor ?? 1, power: computeStats(ch).power });
    } catch { /* pomijamy */ }
  }
  const posortowane = (klucz) => [...lista].sort((a, b) => b[klucz] - a[klucz]);
  const wPietrach = posortowane('floor');
  const wMocy = posortowane('power');
  const top = (arr, klucz) => arr.slice(0, 3)
    .map((w, i) => ({ miejsce: i + 1, name: w.name, crest: w.crest, wynik: w[klucz] }));

  rankCache = { t: Date.now(), data: {
    pietro: top(wPietrach, 'floor'),
    moc: top(wMocy, 'power'),
    ilu: lista.length,
    // Pełne listy zostają w cache — na nich liczy się miejsce gracza także wtedy,
    // gdy jest sto dwudziesty, a nie w pierwszej trójce.
    _pietro: wPietrach.map(w => w.floor),
    _moc: wMocy.map(w => w.power),
  } };
  return rankCache.data;
}

// Które miejsce zajmuje TA postać — także poza podium. Liczone z jej ŻYWEGO
// stanu, nie z zapisu: inaczej własny awans byłby widoczny dopiero po
// piętnastu sekundach, a gracz uznałby, że ranking nie działa.
function mojeMiejsce(ch, st) {
  const R = ranking();
  // Miejsce = ilu ma WIĘCEJ, plus jeden. Remisy dzielą to samo miejsce.
  const gdzie = (wyniki, moj) => wyniki.filter(w => w > moj).length + 1;
  return {
    pietro: gdzie(R._pietro ?? [], ch.maxFloor),
    moc: gdzie(R._moc ?? [], st.power),
    ilu: R.ilu ?? 0,
  };
}

// Podgląd „co da mi ten przedmiot": realne staty PRZED i PO założeniu, liczone
// tym samym computeStats co walka. Nie mutuje postaci — symuluje na klonie.
function wearPreview(ch, id) {
  const it = ch.backpack?.find(x => x.id === id);
  if (!it) return { error: 'Nie ma takiego przedmiotu' };
  const pick = s => ({ damage: s.damage, maxHp: s.maxHp, armor: s.armor,
    armorPool: s.armorPool ?? s.armor,
    power: s.power, attackSpeed: s.attackSpeed, crit: s.crit, critMult: s.critMult,
    block: s.block });
  const before = computeStats(ch);
  const eq = { ...(ch.equipped ?? {}) };
  eq[it.slot] = it;
  // Dwuręczna zdejmuje drugą rękę — podgląd musi to pokazać, inaczej kłamie.
  if (it.slot === 'bron' && (it.hands ?? 1) === 2) delete eq.offhand;
  const after = computeStats({ ...ch, equipped: eq });
  return { preview: { id, before: pick(before), after: pick(after) } };
}

// ---------------------------------------------------------------- akcje

// ---------------------------------------------------------------- wyprawa
// Osobne wyjście poza wieżę i JEDYNE źródło przedmiotów. Łup zbiera się
// do sakwy i wpada do plecaka dopiero po ukończeniu — śmierć zabiera wszystko.

// Węzeł, na którym stoi run. Rozdroże i event ZATRZYMUJĄ postęp — dopóki gracz
// nie zdecyduje, nic się nie dzieje. Automat nie wybiera drogi za niego.
const expNode = (ch) => ch.expedition?.nodes?.[ch.expedition.at] ?? null;

// Trwający run ze starej wersji miał tylko `{typ,i}` i po patchu nadal
// pokazywał dwóch przeciwników. Uzupełniamy go w miejscu, zachowując numer
// osiągniętej komnaty, skrzynię, HP i zużyte mikstury.
function ensureDungeonNodes(ch) {
  const X = ch.expedition;
  if (X?.kind !== 'dungeon') return;
  const def = C.dungeons.lista[X.id];
  if (!def?.rooms?.length) return;
  const targetBalance = def.balanceVersion ?? 1;
  const balanceChanged = X.balanceVersion !== targetBalance;
  if (!X.nodes?.some(n => n.enemies) || balanceChanged) {
    X.nodes = def.rooms.map((room, i) => ({ ...room, i, hazard: room.hazard ? { ...room.hazard,
      reflectByType: { ...(room.hazard.reflectByType ?? {}) } } : null }));
    X.at = Math.min(X.at ?? 0, X.nodes.length - 1);
    X.balanceVersion = targetBalance;
    // Nie przenosimy starej paczki przeciwników w połowie walki. Postęp runu,
    // HP, mikstury i skrzynia zostają; odświeża się tylko bieżąca komnata.
    if (balanceChanged && ch.activeFight && !ch.activeFight.over) ch.activeFight = null;
  }
  // Walka zapisana przed patchem niesie dwóch starych przeciwników. Nie da się
  // dopisać jej kolejki w połowie bez zmiany wyniku, więc bezpiecznie wracamy
  // do początku tej samej komnaty (HP, skrzynia i mikstury zostają).
  const expected = X.nodes?.[X.at]?.enemies;
  if (expected && ch.activeFight && !ch.activeFight.over && ch.activeFight.enemyTotal !== expected) {
    ch.activeFight = null;
  }
}

function expEnemy(ch) {
  const X = ch.expedition;
  const dungeon = X.kind === 'dungeon';
  const E = dungeon ? C.dungeons : C.expedition;
  const r = dungeon ? { mob: 1, floorOffset: 0 } : (E.risks[X.risk] ?? E.risks.bezryzyka);
  const wezel = expNode(ch);
  const def = E.lista[X.id] ?? Object.values(E.lista)[0];
  const pietro = expeditionEnemyLevel(def.ilvl, X.at, X.nodes.length, r.floorOffset);
  // Wyprawa sama nadaje wariant węzła. Bez wymuszenia `normal` poziom 10, 20...
  // przypadkiem wnosił mnożnik bossa Wieży do zwykłego spotkania Wyprawy.
  const e = makeEnemy(pietro, X.at, 'normal');

  const M = dungeon ? { hp: 1, dmg: 1 } : modSuma(X.mods ?? []);
  let hpMult = r.mob;
  let dmgMult = r.mob;
  if (wezel?.typ === 'elita') { hpMult *= E.elitaMult; dmgMult *= E.elitaMult; }
  if (wezel?.typ === 'boss') {
    hpMult *= E.bossHpMult;
    dmgMult *= E.bossDmgMult;
  }
  // Klątwy z eventów podbijają obrażenia wroga na resztę runu.
  const klatwaDmg = (X.efekty ?? []).reduce((a, e2) => a * (e2.mobDmg ?? 1), 1);

  e.hp = Math.max(1, Math.round(e.hp * hpMult * M.hp)); e.maxHp = e.hp;
  e.damage = Math.max(1, Math.round(e.damage * dmgMult * klatwaDmg * M.dmg));
  e.gold = Math.round(e.gold * E.goldMult);
  e.expFloor = pietro;
  if (wezel?.typ === 'elita') e.name = `${e.name} — Elita`;
  if (wezel?.typ === 'boss') { e.name = `Strażnik — ${def.label}`; e.variant = 'boss'; }
  return e;
}

// Pełna grupa w komnacie Dungeonu. Wyprawy pozostają pojedynczymi spotkaniami
// materiałowymi; tylko Dungeon ma być próbą ustawienia całej drużyny.
function expEnemies(ch, all = false) {
  const main = expEnemy(ch);
  if (ch.expedition?.kind !== 'dungeon') return [main];
  const typ = expNode(ch)?.typ ?? 'walka';
  const def = C.dungeons.lista[ch.expedition.id];
  const room = expNode(ch);

  // Pionowy prototyp Dungeonu: generator tworzy CAŁĄ kolejkę spotkania, ale
  // podgląd przed walką pokazuje tylko pięciu aktywnych. Silnik dostaje pełną
  // listę i sam uzupełnia zwolnione miejsca bez tworzenia kolejnych ekranów fal.
  if (def?.prototype && room?.enemies) {
    const templates = C.dungeons.reinforcementTemplates;
    const partySize = 1
      + (ch.team?.allies ?? []).filter(x => x !== null && x !== undefined).length
      + (ch.team?.pet !== null && ch.team?.pet !== undefined ? 1 : 0);
    const extraParty = Math.max(0, partySize - 1);
    const partyHpScale = 1 + extraParty * C.dungeons.partyHpPerExtra;
    const partyDmgScale = 1 + extraParty * C.dungeons.partyDmgPerExtra;
    const hazardReflect = room.hazard?.reflectByType ?? {};
    const reflectCapPct = room.hazard?.reflectCapPct ?? 0.12;
    const makeAdd = (i) => {
      if (typ === 'boss' && i === 0) {
        return {
          ...main, name: room.label ?? main.name, ic: '👑',
          damageType: 'pierce', resists: { ...def.resists }, reflectByType: { ...hazardReflect }, reflectCapPct,
        };
      }
      const t = templates[(typ === 'boss' ? i - 1 : i) % templates.length];
      const hpBase = typ === 'boss' ? room.addHp : room.unitHp;
      const dmgBase = typ === 'boss' ? room.addDmg : room.unitDmg;
      const armorBase = typ === 'boss' ? room.addArmor : room.unitArmor;
      const hp = Math.max(1, Math.round(main.maxHp * hpBase * t.hp * partyHpScale));
      const speed = Math.max(1, Math.round(main.speed + t.speed));
      return {
        ...main,
        name: t.label,
        family: main.family,
        variant: typ === 'elita' ? 'elita' : 'normal',
        klasa: t.klasa, row: t.row,
        reach: t.row === 1 ? C.formation.reach.jednoreczna : C.formation.maxRow,
        dtype: t.damageType === 'magic' ? 'mag' : 'fiz',
        damageType: t.damageType ?? classDamageType(t.klasa),
        resists: { ...def.resists }, reflectByType: { ...hazardReflect }, reflectCapPct,
        hp, maxHp: hp,
        damage: Math.max(1, Math.round(main.damage * dmgBase * t.dmg * partyDmgScale)),
        armor: Math.max(0, Math.round(main.armor * armorBase * t.armor)),
        speed, attackSpeed: attackSpeed(speed),
        gold: Math.max(0, Math.round(main.gold * hpBase * 0.5)),
        ic: t.ic,
        packIndex: i,
      };
    };
    const wszyscy = Array.from({ length: room.enemies }, (_, i) => makeAdd(i));
    return all ? wszyscy : wszyscy.slice(0, room.active ?? C.dungeons.activeEnemyCap);
  }

  const pack = C.dungeons.packs?.[typ] ?? [];
  const support = pack.map((p, i) => ({
    ...main,
    name: p.label,
    // Rodzina zostaje wspólna z komnatą, żeby obstawa nie tworzyła sztucznych
    // wpisów w Kronice. Każda zabita jednostka nadal liczy się jako zabicie.
    family: main.family,
    variant: 'normal',
    klasa: p.klasa,
    row: p.row,
    reach: p.row === 1 ? C.formation.reach.jednoreczna : C.formation.maxRow,
    dtype: p.klasa === 'mag' ? 'mag' : 'fiz',
    hp: Math.max(1, Math.round(main.maxHp * p.hp)),
    maxHp: Math.max(1, Math.round(main.maxHp * p.hp)),
    damage: Math.max(1, Math.round(main.damage * p.dmg)),
    armor: Math.max(0, Math.round(main.armor * p.armor)),
    speed: Math.max(1, Math.round(main.speed + p.speed)),
    attackSpeed: attackSpeed(Math.max(1, Math.round(main.speed + p.speed))),
    gold: 0,
    packIndex: i,
  }));
  return [main, ...support];
}

// Buduje węzły runu z szkieletu i ziarna. Ten sam seed = ten sam run.
function expNodes(seed, dlugosc = null, M = null, namioty = 1) {
  const rng = mulberry32(seed);
  const E = C.expedition;

  // Szkielet rozciąga się albo skraca do zadanej długości. Boss zawsze na końcu,
  // elita tuż przed nim, a ŚRODEK POWTARZA WZÓR ZE SZKIELETU — nie dosypuje
  // czterdziestu walk pod rząd. Przy 48 etapach dostajesz kilka rozdroży,
  // zdarzeń i ognisk rozłożonych równo, a nie jeden ogon walk.
  let szk = [...E.szkielet];
  if (dlugosc && dlugosc !== szk.length) {
    const ogon = szk.slice(-2);                 // elita, boss
    const wzor = szk.slice(0, -2);
    const ile = Math.max(1, dlugosc - ogon.length);
    const srodek = [];
    for (let i = 0; i < ile; i++) srodek.push(wzor[i % wzor.length]);
    szk = [...srodek, ...ogon];
  }
  // NAMIOTY LICZY RYZYKO, nie wzór szkieletu. Wyrzucamy wszystkie, które
  // przyszły z powtarzania wzoru, i wstawiamy dokładnie tyle, ile trzeba —
  // rozłożone równo po drodze. Trudniejszy run ma ich MNIEJ, nie więcej.
  const ile = M?.bezPostoju ? 0 : Math.max(0, namioty);
  szk = szk.map(t => (t === 'safepoint' ? 'walka' : t));
  const ogonOd = szk.length - 2;                 // elita i boss zostają na końcu
  for (let n = 1; n <= ile; n++) {
    const poz = Math.round((ogonOd * n) / (ile + 1));
    // Nie nadpisujemy rozdroża ani zdarzenia — szukamy najbliższej zwykłej walki.
    let i = poz;
    while (i < ogonOd && szk[i] !== 'walka') i++;
    if (i >= ogonOd) { i = poz; while (i > 0 && szk[i] !== 'walka') i--; }
    if (szk[i] === 'walka') szk[i] = 'safepoint';
  }
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
// DŁUGOŚĆ RUNU BIERZE SIĘ Z RYZYKA, nie z wyprawy i nie z poziomu gracza.
// Wybierasz, jak długo chcesz siedzieć, i tyle dostajesz z powrotem.
function expDlugosc(risk) {
  return C.expedition.risks[risk]?.tury ?? 12;
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
    kind: 'expedition', id, risk, mods: wybrane, seed,
    nodes: expNodes(seed, expDlugosc(risk), M, C.expedition.risks[risk]?.namioty ?? 1),
    at: 0,
    sakwa: [], mats: {}, gold: 0,
    efekty: [],            // klątwy i błogosławieństwa na ten run
    // Nagrodę mnoży ryzyko RAZY modyfikatory — jedno i drugie od razu.
    lootMult: M.reward * (C.expedition.risks[risk]?.reward ?? 1),
    potionsUsed: 0,
    safepointDone: [],     // indeksy wykorzystanych ognisk
    // ZDROWIE NIE WRACA. Wchodzisz z tym, co masz — lecz się przed wyjściem.
  };
  ch.combatRunStats = null;
  return { ok: true };
}

function doDungeonStart(ch, id) {
  if (ch.activeFight && !ch.activeFight.over) return { error: 'Najpierw dokończ albo porzuć walkę' };
  if (ch.expedition) return { error: 'Inna przygoda już trwa' };
  const def = C.dungeons.lista[id];
  if (!def) return { error: 'Nie ma takiego Dungeonu' };
  if (poziom(ch) < def.unlockFloor) return { error: `Otwiera się na piętrze ${def.unlockFloor}` };
  const seed = (Date.now() ^ (ch.maxFloor * 3571) ^ Math.floor(Math.random() * 1e9)) >>> 0;
  ch.expedition = {
    kind: 'dungeon', id, risk: null, mods: [], seed,
    balanceVersion: def.balanceVersion ?? 1,
    nodes: (def.rooms ?? C.dungeons.nodes.map(typ => ({ typ })))
      .map((room, i) => ({ ...room, i, hazard: room.hazard ? { ...room.hazard,
        reflectByType: { ...(room.hazard.reflectByType ?? {}) } } : null })), at: 0,
    sakwa: [], mats: {}, gold: 0, efekty: [], lootMult: 1,
    potionsUsed: 0, safepointDone: [],
  };
  ch.combatRunStats = null;
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
  ch.combatRunStats = null;
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
    ch.mikstury[C.healing.startowa] = (ch.mikstury[C.healing.startowa] ?? 0) + s.potion;
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
function doExpSafepoint(ch, itemId, matId, jedzenie) {
  const X = ch.expedition;
  if (!X) return { error: 'Nie jesteś na wyprawie' };
  if (expNode(ch)?.typ !== 'safepoint') return { error: 'Nie stoisz w bezpiecznym miejscu' };
  // Długi run ma kilka ognisk. Każde da się wykorzystać RAZ — stąd lista indeksów
  // zamiast jednej flagi na cały run.
  X.safepointDone = Array.isArray(X.safepointDone) ? X.safepointDone : [];
  if (X.safepointDone.includes(X.at)) return { error: 'Ten postój już wykorzystany' };

  const out = { ok: true, wyniesione: [] };

  // NAMIOT ODNAWIA ZAPAS MIKSTUR. Limit `potionCap` liczy się na CAŁĄ wyprawę,
  // nie na walkę — bez tego długi run kończył się na sucho w połowie drogi,
  // a namiot jest jedynym miejscem, w którym da się go zresetować.
  if (X.potionsUsed > 0) {
    out.odnowione = X.potionsUsed;
    X.potionsUsed = 0;
  }

  // PRZY OGNISKU MOŻNA ZJEŚĆ. Jedzenie z Gotowania leczy DO PEŁNA i zostawia
  // swój buff na kolejne walki. To jedyny PEŁNY odpoczynek w środku runu;
  // zwycięska walka oddaje tylko 8%, mikstury liczą się z limitu wyprawy.
  if (jedzenie && C.expedition.postojLeczy) {
    const r = doEat(ch, String(jedzenie));
    if (r.error) return r;
    ch.hpLost = 0;
    out.zjedzone = r.buff.label;
    out.uleczony = true;
  }

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

  X.safepointDone.push(X.at);
  X.at++;
  return out;
}

// Widełki poziomu przedmiotów tej wyprawy przy tym ryzyku.
// Wysokie ryzyko MNOŻY cały przedział — z Puszczy da się wtedy wynieść ilvl 20.
export function widelkiIlvl(def, risk) {
  const z = def.ilvl ?? [1, 10];
  const m = C.expedition.risks[risk]?.ilvlMult ?? 1;
  return [Math.max(1, Math.round(z[0] * m)), Math.max(1, Math.round(z[1] * m))];
}

// Wagi rzadkości dla skrzyni bossa TEJ wyprawy. Bez ryzyka nie ma legend —
// trzy górne progi lecą do zera, zamiast pilnować tego warunkiem w kodzie.
function wagiBossa(risk) {
  if (C.expedition.risks[risk]?.legendy) return C.loot.weightsBoss;
  const w = { ...C.loot.weightsBoss };
  const oddane = w.legendary + w.mystic + w.god;
  w.legendary = 0; w.mystic = 0; w.god = 0;
  w.uncommon += oddane;                  // pula musi dalej sumować się do 100%
  return w;
}

// Ukończona wyprawa oddaje sakwę i surowce do plecaka.
function expFinish(ch, out) {
  const X = ch.expedition;
  const dungeon = X.kind === 'dungeon';
  out.expDone = true;
  out.runKind = dungeon ? 'dungeon' : 'expedition';
  out.runLabel = (dungeon ? C.dungeons.lista[X.id] : C.expedition.lista[X.id])?.label;
  // Ukończona wyprawa zostaje zapisana razem z ryzykiem — na tym stoi
  // odblokowanie drugiego slotu drużyny (Puszcza na wysokim).
  if (dungeon) {
    ch.dungeonyZrobione ??= {};
    ch.dungeonyZrobione[X.id] = (ch.dungeonyZrobione[X.id] ?? 0) + 1;
  } else {
    const klucz = kluczWyprawy(X.id, X.risk);
    ch.wyprawyZrobione ??= {};
    const przed = slotOpen(ch, 1);
    ch.wyprawyZrobione[klucz] = (ch.wyprawyZrobione[klucz] ?? 0) + 1;
    if (!przed && slotOpen(ch, 1)) out.nowySlot = 'Drugi slot sojusznika otwarty';
  }
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

// Exp do samej Magii, poza normalnym podziałem według rąk.
function addSkillXpDoMagii(ch, xp) {
  const s = ch.cskills.magia ??= { lvl: 1, xp: 0 };
  s.xp += xp;
  while (s.xp >= cskillNeed(s.lvl)) { s.xp -= cskillNeed(s.lvl); s.lvl++; }
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

function combatRunKey(ch) {
  if (ch.expedition) return `${ch.expedition.kind === 'dungeon' ? 'dungeon' : 'expedition'}:${ch.expedition.id}`;
  return `tower:${ch.floor}`;
}

function ensureCombatRunStats(ch, forcedKey = null) {
  const key = forcedKey ?? combatRunKey(ch);
  if (ch.combatRunStats?.key === key) return ch.combatRunStats;
  ch.combatRunStats = {
    key, waves: 0,
    totals: { damageDone: 0, damageTaken: 0, healingDone: 0 },
    party: {},
  };
  return ch.combatRunStats;
}

function combatRunView(run) {
  if (!run) return null;
  return {
    key: run.key, waves: run.waves, totals: { ...run.totals },
    party: Object.values(run.party ?? {}).sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99)),
  };
}

function addCombatRunStats(ch, fightStats, forcedKey = null) {
  const run = ensureCombatRunStats(ch, forcedKey);
  run.waves++;
  for (const key of ['damageDone', 'damageTaken', 'healingDone']) {
    run.totals[key] += fightStats?.totals?.[key] ?? 0;
  }
  for (const u of fightStats?.party ?? []) {
    const id = String(u.slot ?? u.idx ?? u.name);
    const dst = run.party[id] ??= {
      name: u.name, slot: u.slot, role: u.role,
      damageDone: 0, damageTaken: 0, healingDone: 0,
    };
    dst.name = u.name; dst.role = u.role;
    dst.damageDone += u.damageDone ?? 0;
    dst.damageTaken += u.damageTaken ?? 0;
    dst.healingDone += u.healingDone ?? 0;
  }
  return combatRunView(run);
}

// Rozpoczyna walkę. W trybie auto od razu ją rozgrywa,
// w turowym zapisuje stan i oddaje sterowanie graczowi.
function startFight(ch) {
  const naWyprawie = !!ch.expedition;
  ensureDungeonNodes(ch);
  ensureCombatRunStats(ch);
  const runCfg = ch.expedition?.kind === 'dungeon' ? C.dungeons : C.expedition;
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
    const aktywna = ch.activeFight;
    // Auto dogrywa się po stronie serwera i oddaje pełny log — bez tego resume
    // wracał do klienta pusty log i ekran zamarzał.
    if (aktywna.mode === 'auto') { runToEnd(aktywna); return resolveFight(ch); }
    return { fight: summary(aktywna), enemy: aktywna.enemies[0], awaiting: true, resumed: true };
  }

  // Od piętra 3 wychodzą we dwóch — dopiero wtedy szyk ma sens.
  const wrogowie = naWyprawie ? expEnemies(ch, true) : makeEnemies(ch.floor, ch.fight);
  const enemy = wrogowie[0];
  const st = computeStats(ch);
  const seed = (Date.now() ^ (ch.floor * 7919) ^ (ch.fight * 104729)) >>> 0;

  // Wieża nie leczy między falami. Wyprawa po zwycięstwie odda 8% maksymalnego
  // HP w resolveFight — tutaj zawsze wchodzimy z faktycznym zapisanym stanem.
  const F = createFight({
    // Sojusznicy i pet wchodzą do walki na tych samych prawach co bohater.
    // Ich HP nie przenosi się między falami — wyczerpanie dotyczy gracza.
    party: [heroUnit(ch, st), ...teamUnits(ch, computeStats(ch, { food: false }))],
    enemies: wrogowie,
    // Ile mikstur masz PRZY SOBIE. Wieża to wypad na chwilę (3), wyprawa
    // wyjście na długo (10 na cały run, nie na walkę).
    potions: zabierzMikstury(ch, naWyprawie
      ? Math.max(0, runCfg.potionCap - ch.expedition.potionsUsed)
      : C.healing.carryTower),
    wtype: st.wtype,
    abilities: bojowe(ch),
    maxMana: st.maxMana,
    manaRegen: st.manaRegen,
    activeEnemyCap: ch.expedition?.kind === 'dungeon'
      ? (expNode(ch)?.active ?? Math.min(C.dungeons.activeEnemyCap, wrogowie.length)) : null,
    hazard: ch.expedition?.kind === 'dungeon' ? (expNode(ch)?.hazard ?? null) : null,
    // Skala pancerza rośnie z piętrem — patrz armorK() w combat.js.
    poziom: naWyprawie ? (enemy.expFloor ?? ch.maxFloor) : ch.floor,
  }, seed, fightMode(ch));
  // Co poszło do walki — po niej odejmujemy dokładnie tę różnicę.
  F.potionsWziete = { ...F.potions };
  F.enemyMeta = { variant: enemy.variant,
                  gold: wrogowie.reduce((s, w) => s + w.gold, 0),
                  floor: naWyprawie ? enemy.expFloor : ch.floor,
                  fightIdx: naWyprawie ? ch.expedition.at : ch.fight,
                  family: enemy.family,
                  families: wrogowie.map(w => w.family),
                  wyprawa: naWyprawie,
                  runKind: ch.expedition?.kind ?? null,
                  wezel: naWyprawie ? expNode(ch).typ : null };
  F.enemyMeta.enemyCount = wrogowie.length;
  ch.activeFight = F;

  // Automat rozgrywa całe piętro po stronie serwera i oddaje pełny log do
  // animacji. Klient odtwarza log przez startPlayback — bez tego (porcje przez
  // /api/autotick) startFight zwracał pusty log i walka się nie zaczynała.
  if (fightMode(ch) === 'auto') { runToEnd(F); return resolveFight(ch); }

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

// Następny krótki obieg walki automatycznej.
function tickAutoFight(ch) {
  const F = ch.activeFight;
  if (!F || F.over) return { error: 'Nie ma trwającej walki automatycznej' };
  if (F.mode !== 'auto') return { error: 'Ta walka nie jest automatyczna' };
  autoRound(F);
  if (F.over) return resolveFight(ch);
  return { fight: summary(F), enemy: F.enemies[0], auto: true };
}

// Wspólny priorytet celu dla bohatera, sojuszników i peta. `idx` jest trwałym
// numerem przeciwnika, a nie pozycją karty — posiłek nie odziedziczy znacznika.
function setFightTarget(ch, idx) {
  const F = ch.activeFight;
  if (!F || F.over) return { error: 'Nie ma trwającej walki' };
  const n = idx === null || idx === undefined || idx === '' ? null : Number(idx);
  if (n !== null && !F.enemies.some(e => e.alive && e.idx === n)) {
    return { error: 'Tego przeciwnika nie ma już na polu walki' };
  }
  F.priorityTarget = n;
  for (const u of F.party) u.preferredTarget = n;
  return { ok: true, fight: summary(F) };
}

// ---------------------------------------------------------------- KOLOS
// Przeciwnik spoza wieży. Jedna walka, zawsze turowa, bez fal i bez postępu.
// Nie rusza piętra, nie rusza wyprawy — wchodzisz, bijesz się, wychodzisz.

function kolosWidok(ch) {
  const K = C.kolos;
  const st = computeStats(ch);
  // Ile ciosów potrzeba PRZY TWOIM ATAKU. Liczone tą samą formułą co walka,
  // żeby liczba na ekranie nie kłamała.
  const kA = armorK(K.poziom);
  const naCios = Math.max(1, Math.round(st.damage * (1 - K.armor / (K.armor + kA))));
  const efektywnaObrona = st.armor * playerArmorEffect(K.poziom);
  const jegoCios = Math.max(1, Math.round(K.damage * (1 - efektywnaObrona / (efektywnaObrona + kA))));
  return {
    ...K,
    otwarty: poziom(ch) >= K.unlockFloor,
    pokonany: !!ch.kolosPokonany,
    // Prawda o dystansie, jaki dzieli gracza od tego przeciwnika.
    twojCios: naCios,
    ciosowPotrzeba: Math.ceil(K.hp / naCios),
    jegoCios,
    ciosowNaCiebie: Math.max(1, Math.ceil(st.maxHp / (jegoCios * K.ataki))),
  };
}

// Tytan liczy się dokładnie jak Kolos — te same formuły, inne liczby.
function tytanWidok(ch) {
  const K = C.tytan;
  const st = computeStats(ch);
  const kA = armorK(K.poziom);
  const naCios = Math.max(1, Math.round(st.damage * (1 - K.armor / (K.armor + kA))));
  const efektywnaObrona = st.armor * playerArmorEffect(K.poziom);
  const jegoCios = Math.max(1, Math.round(K.damage * (1 - efektywnaObrona / (efektywnaObrona + kA))));
  return {
    ...K,
    otwarty: poziom(ch) >= K.unlockFloor,
    pokonany: !!ch.tytanPokonany,
    twojCios: naCios,
    ciosowPotrzeba: Math.ceil(K.hp / naCios),
    jegoCios,
    ciosowNaCiebie: Math.max(1, Math.ceil(st.maxHp / (jegoCios * K.ataki))),
  };
}

function startTytan(ch) {
  const K = C.tytan;
  if (poziom(ch) < K.unlockFloor) return { error: `Tytan otwiera się na piętrze ${K.unlockFloor}` };
  if (ch.expedition) return { error: 'Najpierw skończ wyprawę' };
  if (ch.activeFight && !ch.activeFight.over) {
    return { fight: summary(ch.activeFight), enemy: ch.activeFight.enemies[0], awaiting: true, resumed: true };
  }

  const st = computeStats(ch);
  ensureCombatRunStats(ch, `tytan:${K.id}`);
  const F = createFight({
    party: [heroUnit(ch, st), ...teamUnits(ch, st)],
    enemies: [{
      name: K.label, family: K.id, variant: 'kolos', level: K.poziom,
      klasa: 'wojownik', row: 1, reach: 1, dtype: 'fiz', ic: K.ic,
      hp: K.hp, maxHp: K.hp, damage: K.damage, armor: K.armor, speed: K.speed,
      crit: C.combat.critBase, critMult: C.combat.critMultBase,
      accuracy: 0.92, evasion: 0,
      ataki: K.ataki, skills: K.skills,
    }],
    potions: zabierzMikstury(ch, C.expedition.potionCap),
    wtype: st.wtype,
    abilities: bojowe(ch),
    maxMana: st.maxMana, manaRegen: st.manaRegen,
    poziom: K.poziom,
  }, (Date.now() ^ 0x7717) >>> 0, 'turowa');

  F.potionsWziete = { ...F.potions };
  F.enemyMeta = { variant: 'kolos', tytan: true, gold: 0, floor: K.poziom,
                  fightIdx: 0, family: K.id, families: [K.id], wyprawa: false, wezel: null };
  ch.activeFight = F;

  beginTurn(F);
  if (F.over) return resolveFight(ch);
  return { fight: summary(F), enemy: F.enemies[0], awaiting: true, tytan: true };
}

// Rozliczenie Tytana. Pierwsze zwycięstwo oddaje Aegis Tytana, kolejne złoto.
function tytanNagroda(ch, out) {
  const K = C.tytan;
  if (!ch.tytanPokonany) {
    ch.tytanPokonany = Date.now();
    const n = K.nagroda;
    const it = {
      id: null, slot: n.slot, wtype: n.wtype, hands: n.hands,
      base: n.base, name: n.base, obraz: n.obraz ?? null,
      rarity: n.rarity, ilvl: n.ilvl, plus: 0, energy: 0,
      reqLevel: n.ilvl, damage: 0, armor: 0,
      // Afiksy z configu — wpisane wprost, nie rolowane.
      affixes: (n.affixes ?? []).map(a => ({ ...a })),
    };
    const def = C.gear.slots[it.slot];
    const rar = C.rarities[it.rarity];
    it.armor = Math.round((C.gear.armorBase + C.gear.armorPerIlvl * it.ilvl) * def.mult * rar.mult);
    giveId(it);
    if (ch.backpack.length < C.gear.backpackSize) {
      ch.backpack.push(it);
      ch.discovered[it.base] = true;
      out.loot.push(it);
      out.tytanNagroda = it.name;
    } else {
      out.backpackFull = true;
    }
  } else {
    ch.gold += K.zlotoZaPowtorke;
    out.gold = K.zlotoZaPowtorke;
    out.tytanZloto = K.zlotoZaPowtorke;
  }
  out.tytan = true;
  return out;
}

function startKolos(ch) {
  const K = C.kolos;
  if (poziom(ch) < K.unlockFloor) return { error: `Kolos otwiera się na piętrze ${K.unlockFloor}` };
  if (ch.expedition) return { error: 'Najpierw skończ wyprawę' };
  if (ch.activeFight && !ch.activeFight.over) {
    return { fight: summary(ch.activeFight), enemy: ch.activeFight.enemies[0], awaiting: true, resumed: true };
  }

  const st = computeStats(ch);
  ensureCombatRunStats(ch, `kolos:${K.id}`);
  const F = createFight({
    party: [heroUnit(ch, st), ...teamUnits(ch, st)],
    enemies: [{
      name: K.label, family: K.id, variant: 'kolos', level: K.poziom,
      klasa: 'wojownik', row: 1, reach: 1, dtype: 'fiz', ic: K.ic,
      hp: K.hp, maxHp: K.hp, damage: K.damage, armor: K.armor, speed: K.speed,
      crit: C.combat.critBase, critMult: C.combat.critMultBase,
      accuracy: 0.92, evasion: 0,
      ataki: K.ataki, skills: K.skills,
    }],
    potions: zabierzMikstury(ch, C.expedition.potionCap),
    wtype: st.wtype,
    abilities: bojowe(ch),
    maxMana: st.maxMana, manaRegen: st.manaRegen,
    poziom: K.poziom,
  }, (Date.now() ^ 0x5EED) >>> 0, 'turowa');

  // Kolos NIE jest falą piętra ani węzłem wyprawy — rozliczenie idzie własną drogą.
  F.potionsWziete = { ...F.potions };
  F.enemyMeta = { variant: 'kolos', kolos: true, gold: 0, floor: K.poziom,
                  fightIdx: 0, family: K.id, families: [K.id], wyprawa: false, wezel: null };
  ch.activeFight = F;

  beginTurn(F);
  if (F.over) return resolveFight(ch);
  return { fight: summary(F), enemy: F.enemies[0], awaiting: true, kolos: true };
}

// Rozliczenie Kolosa. Pierwsze zwycięstwo oddaje Różdżkę Lodową, kolejne złoto.
function kolosNagroda(ch, out) {
  const K = C.kolos;
  if (!ch.kolosPokonany) {
    ch.kolosPokonany = Date.now();
    const it = {
      id: null, slot: K.nagroda.slot, wtype: K.nagroda.wtype, hands: K.nagroda.hands,
      base: K.nagroda.base, name: K.nagroda.base,
      rarity: K.nagroda.rarity, ilvl: K.nagroda.ilvl, plus: 0, energy: 0,
      reqLevel: K.nagroda.ilvl, damage: 0, armor: 0, affixes: [],
    };
    const def = C.gear.slots[it.slot];
    const rar = C.rarities[it.rarity];
    it.damage = Math.round((C.gear.weaponDamageBase + C.gear.weaponDamagePerIlvl * it.ilvl)
      * def.mult * rar.mult);
    giveId(it);
    if (ch.backpack.length < C.gear.backpackSize) {
      ch.backpack.push(it);
      ch.discovered[it.base] = true;
      out.loot.push(it);
      out.kolosNagroda = it.name;
    } else {
      out.backpackFull = true;
    }
  } else {
    ch.gold += K.zlotoZaPowtorke;
    out.gold = K.zlotoZaPowtorke;
    out.kolosZloto = K.zlotoZaPowtorke;
  }
  out.kolos = true;
  return out;
}

// Rozliczenie zakończonej walki: exp, złoto, łup, postęp piętra.
function resolveFight(ch) {
  const F = ch.activeFight;
  const res = summary(F);
  const meta = F.enemyMeta;
  const info = floorInfo(ch.floor);

  // Zużyte mikstury schodzą ze stanu; na wyprawie liczy się też limit noszenia.
  const wypite = res.potionsUsed ?? 0;
  zuzyjMikstury(ch, F.potionsWziete ?? {}, res.potions ?? {});
  if (ch.expedition) ch.expedition.potionsUsed += wypite;
  ch.activeFight = null;

  const out = { ...res, enemy: F.enemies[0], loot: [], gold: 0,
                floorCleared: false, awaiting: false, trophy: null };
  out.runStats = addCombatRunStats(ch, res.combatStats,
    meta.tytan ? `tytan:${C.tytan.id}` : meta.kolos ? `kolos:${C.kolos.id}` : null);

  // Jedzenie schodzi tylko jednostkom, które rzeczywiście weszły do tej walki.
  // Każda ma własne trzy sloty, więc posiłek sojusznika nie wzmacnia bohatera.
  const uczestnicy = new Set((F.party ?? []).map(u => u.slot));
  const zuzyjJedzenie = (unit) => {
    if (!unit) return;
    for (const slot of ['main_meal', 'drink', 'dessert']) {
      const b = unit.foodBuffs?.[slot];
      if (!b) continue;
      b.walki = Math.max(0, (b.walki ?? 1) - 1);
      if (b.walki <= 0) unit.foodBuffs[slot] = null;
    }
  };
  if (uczestnicy.has(0)) zuzyjJedzenie(ch);
  for (let i = 0; i < (ch.team?.allies?.length ?? 0); i++) {
    if (uczestnicy.has(i + 1)) zuzyjJedzenie(ch.collection?.companions?.[ch.team.allies[i]]);
  }
  if (uczestnicy.has(4)) zuzyjJedzenie(ch.collection?.pets?.[ch.team?.pet]);

  if (res.win) {
    // HP zostaje takie, jakie wyszło z walki — następna fala zaczyna się stąd.
    const me = res.party[0];
    ch.hpLost = Math.max(0, me.maxHp - me.hp);

    // Wyprawa oddaje 8% maksymalnego HP po KAŻDEJ wygranej walce. Leczymy
    // dopiero po zapisaniu faktycznych obrażeń, a wynik walki aktualizujemy,
    // żeby ekran pokazał dokładnie tyle HP, z iloma ruszy następny etap.
    const runCfg = meta.runKind === 'dungeon' ? C.dungeons : C.expedition;
    if (meta.wyprawa && runCfg.healAfterWinPct > 0) {
      const brakPrzed = ch.hpLost;
      const porcja = Math.round(me.maxHp * runCfg.healAfterWinPct);
      ch.hpLost = Math.max(0, ch.hpLost - porcja);
      out.expHeal = brakPrzed - ch.hpLost;
      me.hp = me.maxHp - ch.hpLost;
    }

    out.gold = meta.gold;
    ch.gold += meta.gold;

    // Skille bojowe rosną z tego, CZYM bijesz. Podział rąk siedzi w skillSplit().
    // Jedna komnata z 20 posiłkami nie może płacić jak pojedynczy mob, ale też
    // nie mnoży XP 1:1 (loot nadal wypada za komnatę). Pięciu zabitych to jeden
    // pełny mnożnik treningu — długi Dungeon jest uczciwym miejscem grindu.
    const enemyXpMult = meta.runKind === 'dungeon'
      ? Math.max(1, (meta.enemyCount ?? 1) / C.dungeons.activeEnemyCap) : 1;
    const pula = C.combatSkills.xpPerFloor * meta.floor
      * (meta.variant === 'boss' ? 6 : meta.variant === 'plus' ? 2 : 1) * enemyXpMult;
    out.skillXp = pula;
    out.skillAwans = addCombatXp(ch, pula);

    // RZUCANIE CZARÓW ĆWICZY MAGIĘ. Bez tego Magia rosłaby tylko od bicia
    // różdżką, czyli odwrotnie, niż podpowiada intuicja.
    const czarow = res.spellsCast ?? 0;
    if (czarow) {
      out.magiaXp = czarow * C.combatSkills.xpPerSpell;
      addSkillXpDoMagii(ch, out.magiaXp);
    }

    // Kronika: licznik zabić i odsłanianie trofeów. Liczy się KAŻDY ubity,
    // nie tylko pierwszy — od piętra 3 wychodzą we dwóch.
    for (const fam of meta.families ?? [meta.family]) {
      const wpis = ch.bestiary[fam] ??= { kills: 0, drops: [] };
      wpis.kills++;
      const trofeum = rollTrophy((F.seed ^ 0x5EED ^ fam.length) >>> 0, fam, wpis.drops, meta.variant);
      if (trofeum) { wpis.drops.push(trofeum); out.trophy = trofeum; }
    }

    // Wyprawy dają wyłącznie materiały; Dungeony wyłącznie sprzęt.
    if (meta.wyprawa) {
      const X = ch.expedition;
      const dungeon = X.kind === 'dungeon';
      if (dungeon) {
        const def = C.dungeons.lista[X.id] ?? Object.values(C.dungeons.lista)[0];
        const variant = meta.wezel === 'boss' ? 'boss' : 'plus';
        const chance = meta.wezel === 'elita' ? C.dungeons.eliteDropChance : C.dungeons.normalDropChance;
        // Każdy zwykły przeciwnik ma własną, deterministyczną szansę na sprzęt.
        // Boss jest pomijany w tej pętli, bo otwiera osobną skrzynię 3–6 sztuk;
        // jego obstawa nadal może coś upuścić. Rzut kończy się na Unique.
        const mobCount = Math.max(0, (meta.enemyCount ?? 1) - (meta.wezel === 'boss' ? 1 : 0));
        const mobChance = (meta.wezel === 'elita'
          ? C.dungeons.eliteMobDropChance : C.dungeons.mobDropChance) * X.lootMult;
        let mobLoot = 0;
        for (let i = 0; i < mobCount; i++) {
          const mobDrops = rollDrops((F.seed ^ 0x0D06E000 ^ Math.imul(i + 1, 0x9E3779B1)) >>> 0, {
            floor: meta.floor, variant: 'normal', pool: def.drops, zakres: def.ilvl,
            customWeights: C.dungeons.weightsMob, dropChance: Math.min(1, mobChance),
            wezel: meta.wezel === 'elita' ? 'elita' : 'walka',
          });
          for (const d of mobDrops) { giveId(d); X.sakwa.push(d); out.loot.push(d); mobLoot++; }
        }
        out.mobLoot = mobLoot;

        // Osobny bonus za oczyszczenie komnaty zostaje bez zmian: 30% dla
        // zwykłej, gwarancja dla elity, a boss otwiera pełną skrzynię.
        const drops = rollDrops((F.seed ^ 31337) >>> 0, {
          floor: meta.floor, variant, pool: def.drops, zakres: def.ilvl,
          wagiBoss: C.loot.weightsBoss, dropChance: chance,
          wezel: meta.wezel === 'boss' ? 'boss' : meta.wezel === 'elita' ? 'elita' : 'walka',
        });
        for (const d of drops) { giveId(d); X.sakwa.push(d); out.loot.push(d); }
      } else {
        const r = C.expedition.risks[X.risk] ?? C.expedition.risks.bezryzyka;
        const mnoznik = r.lootMult * X.lootMult
          * (meta.wezel === 'elita' ? 1.6 : meta.wezel === 'boss' ? 3 : 1);
        const def = C.expedition.lista[X.id] ?? C.expedition.lista.puszcza;
        out.mats = {};
        const materialPool = [...(def.mats ?? []), ...(meta.wezel === 'boss' ? (def.bossMats ?? []) : [])];
        for (const m of materialPool) {
          if (Math.random() >= Math.min(1, m.szansa * (1 + (mnoznik - 1) * 0.4))) continue;
          const ile = m.ile[0] + Math.floor(Math.random() * (m.ile[1] - m.ile[0] + 1));
          X.mats[m.id] = (X.mats[m.id] ?? 0) + ile;
          out.mats[m.id] = ile;
        }
        if (!Object.keys(out.mats).length) delete out.mats;
      }

      X.gold += meta.gold;
      X.at++;
      out.expWave = X.at;
      out.expWaves = X.nodes.length;
      out.sakwa = X.sakwa.length;
      out.sakwaMats = Object.values(X.mats).reduce((a, b) => a + b, 0);
      // Dopiero BOSS oddaje sakwę. Wcześniej nie ma wyjścia poza safepointem.
      if (meta.wezel === 'boss') expFinish(ch, out);
    } else if (meta.tytan) {
      tytanNagroda(ch, out);
    } else if (meta.kolos) {
      // Kolos nie jest falą piętra — nie rusza postępu, ma własną nagrodę.
      kolosNagroda(ch, out);
    } else {
      ch.fight++;
      if (ch.fight >= info.fights) {
        out.floorCleared = true;
        // Nagroda leci OD RAZU po ostatnim mobie, nie przy wejściu wyżej.
        // ch.nagrodzone pilnuje, żeby powtórne czyszczenie piętra nie płaciło
        // drugi raz — inaczej dałoby się farmić punkty na jednym piętrze.
        ch.nagrodzone ??= {};
        if (!ch.nagrodzone[meta.floor]) {
          ch.nagrodzone[meta.floor] = true;
          const g = {
            tree: info.isBoss ? C.tower.treePointsPerBoss : C.tower.treePointsPerFloor,
            attr: C.character.attrPointsPerFloor,
            currency: info.isBoss ? C.summon.keysPerBoss : C.summon.keysPerFloor,
          };
          ch.treePoints += g.tree;
          ch.unspentAttr += g.attr;
          ch.currency += g.currency;
          out.nagroda = g;
        }

        // POWTARZANIE PIĘTRA. Zdobyte piętro nie wypuszcza wyżej, tylko startuje
        // od pierwszej fali z pełnym zdrowiem — automat leci dalej bez pytania.
        // To jest cały tryb farmienia: złoto, exp skilli i Kronika w kółko.
        if (ch.powtarzaj && poziom(ch) >= C.tower.powtarzanieOd) {
          ch.fight = 0;
          ch.hpLost = 0;
          out.floorCleared = false;
          out.powtorka = meta.floor;
        }
      }
    }
  } else if (meta.tytan) {
    out.tytan = true;
  } else if (meta.kolos) {
    // Przegrana z Kolosem nie kosztuje nic poza zdrowiem — nie ma piętra,
    // które można by cofnąć.
    out.kolos = true;
  } else if (meta.wyprawa) {
    // Śmierć na wyprawie zabiera CAŁĄ sakwę — przedmioty i surowce zdobyte
    // w tym runie. Twój noszony sprzęt i plecak sprzed wyprawy są nietknięte.
    out.expFailed = true;
    out.runKind = ch.expedition.kind === 'dungeon' ? 'dungeon' : 'expedition';
    out.runLabel = (out.runKind === 'dungeon' ? C.dungeons.lista[ch.expedition.id]
      : C.expedition.lista[ch.expedition.id])?.label;
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

  if (!res.win || out.floorCleared || out.expDone || out.expFailed || out.kolos || out.tytan || out.powtorka) {
    ch.combatRunStats = null;
  }
  return out;
}

function doAdvance(ch) {
  const info = floorInfo(ch.floor);
  if (ch.fight < info.fights) return { error: 'Piętro jeszcze niezdobyte' };

  // Nagrody NIE lecą tutaj — wypłaca je resolveFight, zaraz po ostatnim mobie.
  const trzeciSlotPrzed = slotOpen(ch, 2);
  ch.floor++;
  ch.fight = 0;
  ch.hpLost = 0;              // nowe piętro to czysta karta — wyczerpanie liczy się w obrębie piętra
  ch.maxFloor = Math.max(ch.maxFloor, ch.floor);
  return { ok: true, floor: ch.floor,
    nowySlot: !trzeciSlotPrzed && slotOpen(ch, 2) ? 'Trzeci slot sojusznika otwarty' : null };
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

function doMine(ch, skill, resId, mode = 'all') {
  const s = C.skills[skill];
  if (!s?.grywalne) return { error: 'Ta profesja jeszcze nie działa' };
  const check = canGather(ch, skill, resId);
  if (!check.ok) return { error: check.reason };
  if (check.res.koszt && !maNaKoszt(ch, check.res.koszt)) {
    const brak = Object.entries(check.res.koszt)
      .filter(([id, n]) => (ch.materials[id] ?? 0) < n)
      .map(([id, n]) => `${C.materialy[id]?.label ?? C.mining.gems[id]?.label ?? id} ×${n}`);
    return { error: `Brak materiałów: ${brak.join(', ')}` };
  }
  if (skill === 'kowalstwo' && check.res.fuel && furnaceCoal(ch) < check.res.fuel) {
    return { error: `Brak paliwa w Piecu — potrzeba Węgla ×${check.res.fuel}` };
  }
  const ms = professionCycleMs(ch, skill, check.res);
  const since = Date.now();
  ch.activity = {
    skill, res: resId, since, ms, finishAt: since + ms,
    mode: ['gotowanie', 'kowalstwo'].includes(skill) && mode === 'once' ? 'once' : 'all',
    seed: (Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0,
    cycles: 0,
  };
  return { ok: true, activity: ch.activity };
}

// Obsada slotu drużyny. idx === null zdejmuje towarzysza ze slotu.
function doTeam(ch, slot, idx) {
  const i = idx === null || idx === undefined || idx === '' ? null : Number(idx);
  if (ch.activeFight && !ch.activeFight.over) return { error: 'Najpierw dokończ albo porzuć walkę' };

  if (slot === 'pet') {
    if (i !== null && !petSlotOpen(ch)) return { error: `Slot peta otwiera się na poziomie ${C.allies.unlock.pet}` };
    if (i !== null && !ch.collection.pets[i]) return { error: 'Nie ma takiego peta' };
    ch.team.pet = i;
    return { ok: true };
  }

  const n = Number(slot);
  if (!Number.isInteger(n) || n < 0 || n >= C.allies.slots) return { error: 'Nie ma takiego slotu' };
  if (i !== null && !slotOpen(ch, n)) return { error: 'Ten slot sojusznika nie jest jeszcze otwarty' };
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

function doFurnace(ch, action, amount) {
  const direction = action === 'withdraw' ? 'withdraw' : 'deposit';
  return transferFurnaceCoal(ch, direction, amount === 'all' ? 'all' : amount);
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
  const cycleMs = a.ms ?? professionCycleMs(ch, a.skill, res);
  if (minelo < cycleMs - 250) return { error: 'Jeszcze nie teraz' };   // 250 ms luzu na drogę

  // Pełny magazyn jest sprawdzany przed pobraniem kosztów receptury.
  if (a.skill === 'kowalstwo' && res.output?.type === 'mining'
      && ch.miningInventory.length >= C.mining.inventorySize) {
    ch.activity = null; return { error: 'Magazyn górniczy jest pełny' };
  }
  if (a.skill === 'kowalstwo' && res.output?.type === 'combat'
      && ch.backpack.length >= C.gear.backpackSize) {
    ch.activity = null; return { error: 'Plecak bojowy jest pełny' };
  }

  // Profesje przetwarzające zjadają surowce. Wytapianie ma dodatkowo osobny
  // zasobnik paliwa — oba warunki sprawdzamy przed pobraniem czegokolwiek.
  if (res.koszt && !maNaKoszt(ch, res.koszt)) {
    ch.activity = null;
    return { error: 'Skończyły się surowce' };
  }
  if (a.skill === 'kowalstwo' && res.fuel && furnaceCoal(ch) < res.fuel) {
    ch.activity = null;
    return { error: 'W Piecu skończył się węgiel' };
  }
  if (res.koszt) {
    for (const [id, ile] of Object.entries(res.koszt)) {
      ch.materials[id] = (ch.materials[id] ?? 0) - ile;
      if (ch.materials[id] <= 0) delete ch.materials[id];
    }
  }
  if (a.skill === 'kowalstwo' && res.fuel) consumeFurnaceFuel(ch, res.fuel);

  const rng = mulberry32((a.seed ^ Math.imul((a.cycles ?? 0) + 1, 0x9E3779B1)) >>> 0);
  const out = { ok: true, gained: { res: res.id, label: res.label, xp: res.xp } };

  if (a.skill === 'rybolowstwo') {
    const gear = professionBonuses(ch, a.skill);
    const food = foodEffects(ch);
    const result = fishingOutcome(res, profOf(ch, a.skill).lvl, {
      fishingXp: (gear.fishingXp ?? 0) + (food.professionXpPct ?? 0),
      rareCatchChance: (gear.rareCatchChance ?? 0) + (food.luckPct ?? 0),
      doubleCatchChance: gear.doubleCatchChance ?? 0,
    }, rng);
    if (!result) { ch.activity = null; return { error: 'W tym łowisku nie ma dostępnych ryb' }; }
    ch.materials[result.id] = (ch.materials[result.id] ?? 0) + result.count;
    out.gained = { res: result.id, label: result.label, count: result.count,
                   rarity: result.rarity, xp: result.xp };
    out.awans = addSkillXp(ch, a.skill, result.xp);
    a.cycles = (a.cycles ?? 0) + 1;
    a.since = Date.now(); a.ms = professionCycleMs(ch, a.skill, res); a.finishAt = a.since + a.ms;
    return out;
  }

  if (a.skill === 'rolnictwo') {
    const gear = professionBonuses(ch, a.skill);
    const food = foodEffects(ch);
    const result = farmingOutcome(res, {
      farmingXp: (gear.farmingXp ?? 0) + (food.professionXpPct ?? 0),
      yieldPct: (gear.yieldPct ?? 0) + (food.yieldPct ?? 0)
        + (profOf(ch, a.skill).lvl >= 100 ? 0.05 : 0),
      animalProductYield: gear.animalProductYield ?? 0,
    }, rng);
    for (const item of result.outputs) ch.materials[item.id] = (ch.materials[item.id] ?? 0) + item.count;
    out.gained = { res: res.id, label: res.label, outputs: result.outputs, xp: result.xp,
                   count: result.outputs.reduce((sum, x) => sum + x.count, 0) };
    out.awans = addSkillXp(ch, a.skill, result.xp);
    a.cycles = (a.cycles ?? 0) + 1;
    a.since = Date.now(); a.ms = professionCycleMs(ch, a.skill, res); a.finishAt = a.since + a.ms;
    return out;
  }

  if (a.skill === 'gotowanie' && res.food) {
    ch.materials[res.id] = (ch.materials[res.id] ?? 0) + 1;
    const food = foodEffects(ch);
    const xp = Math.max(1, Math.round(res.xp * (1 + (food.professionXpPct ?? 0))));
    out.gained = { res: res.id, label: res.label, count: 1, xp, food: true };
    out.awans = addSkillXp(ch, a.skill, xp);
    a.cycles = (a.cycles ?? 0) + 1;
    if (a.mode === 'once' || !maNaKoszt(ch, res.koszt)) ch.activity = null;
    else {
      a.since = Date.now(); a.ms = professionCycleMs(ch, a.skill, res); a.finishAt = a.since + a.ms;
    }
    return out;
  }

  if (a.skill === 'gornictwo' && ['ore', 'magic'].includes(res.kind)) {
    const result = mineOutcome(res, miningBonuses(ch), rng);
    ch.materials[res.id] = (ch.materials[res.id] ?? 0) + result.ore;
    if (result.gem) ch.materials[result.gem] = (ch.materials[result.gem] ?? 0) + result.gems;
    out.gained.count = result.ore;
    out.gained.gem = result.gem ? { id: result.gem, label: C.mining.gems[result.gem].label, count: result.gems } : null;
    out.gained.xp = result.xp;
    out.awans = addSkillXp(ch, a.skill, result.xp);
    a.cycles = (a.cycles ?? 0) + 1;
    a.since = Date.now(); a.finishAt = a.since + (a.ms ?? res.ms);
    a.ms = miningCycleMs(ch, res);
    return out;
  }

  if (a.skill === 'kowalstwo' && res.output) {
    if (res.output.type === 'material') {
      ch.materials[res.output.id] = (ch.materials[res.output.id] ?? 0) + 1;
      out.gained.res = res.output.id;
    } else {
      const item = craftProduct(res, profOf(ch, 'kowalstwo').lvl, rng, String(nextItemId++));
      if (item.profession === 'mining') ch.miningInventory.push(item);
      else { ch.backpack.push(item); ch.discovered[item.base] = true; }
      out.gained.item = item;
      out.gained.quality = C.smithing.qualities[item.quality].label;
    }
    out.awans = addSkillXp(ch, a.skill, res.xp);
    a.cycles = (a.cycles ?? 0) + 1;
    const dalej = a.mode !== 'once' && maNaKoszt(ch, res.koszt)
      && (!res.fuel || furnaceCoal(ch) >= res.fuel);
    if (!dalej) ch.activity = null;
    else { a.since = Date.now(); a.finishAt = a.since + (a.ms ?? res.ms); }
    return out;
  }

  // daje.mikstura — Alchemia. Mikstury nie są surowcem, tylko osobnym zapasem
  // z podziałem na dziewięć rodzajów.
  if (res.daje?.mikstura) {
    const id = res.daje.mikstura;
    ch.mikstury[id] = (ch.mikstury[id] ?? 0) + 1;
    out.gained.mikstura = C.healing.mikstury.find(m => m.id === id)?.label ?? id;
    out.gained.potions = 1;

  } else if (res.daje?.potion) {
    // stary kształt przepisu — zostaje, żeby nic nie wybuchło po aktualizacji
    ch.mikstury[C.healing.startowa] = (ch.mikstury[C.healing.startowa] ?? 0) + res.daje.potion;
    out.gained.potions = res.daje.potion;

  } else {
    ch.materials[res.id] = (ch.materials[res.id] ?? 0) + 1;
  }

  // Kopanie run i esencji karmi DWA skille po połowie: to, czym kopiesz,
  // i RuneCrafting, do którego te surowce należą.
  if (res.dzieliXp) {
    out.awans = addSkillXp(ch, a.skill, Math.round(res.xp * 0.5));
    const drugi = addSkillXp(ch, res.dzieliXp, Math.round(res.xp * 0.5));
    if (drugi) out.awansDrugi = { skill: res.dzieliXp, ile: drugi };
    out.gained.xpDzielony = res.dzieliXp;
  } else {
    out.awans = addSkillXp(ch, a.skill, res.xp);
  }

  a.since = Date.now(); a.finishAt = a.since + (a.ms ?? res.ms);
  a.cycles = (a.cycles ?? 0) + 1;
  return out;
}

// Zjedzenie jedzenia z Gotowania. Buff trzyma się przez kilka walk.
function doEat(ch, id, target) {
  return eatFood(ch, id, target);
}

// Ulepszanie sprzętu sztabami z Kowalstwa. Każdy plus to stały przyrost
// obrażeń albo pancerza — proste, przewidywalne, bez ryzyka spalenia.
function doUpgrade(ch, itemId) {
  const it = ch.equipped[Object.keys(ch.equipped).find(s => ch.equipped[s]?.id === String(itemId))]
    ?? ch.pveEquipmentB?.[Object.keys(ch.pveEquipmentB ?? {}).find(s => ch.pveEquipmentB[s]?.id === String(itemId))]
    ?? ch.pvpEquipment?.[Object.keys(ch.pvpEquipment ?? {}).find(s => ch.pvpEquipment[s]?.id === String(itemId))]
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
               '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
               '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

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

      // RESTART Z TELEFONU. Działa TYLKO wtedy, gdy na dysku leżą nowsze pliki
      // niż kod, na którym chodzi ten proces — po restarcie wersje się zgadzają
      // i endpoint sam się zamyka. Dzięki temu nie da się nim ubić serwera
      // w kółko: żeby zadziałał, musi istnieć realna aktualizacja do wgrania.
      // Wymaga też ważnego tokenu, więc nie jest otwarty na świat.
      if (path === '/api/restart') {
        const tok = body.token || url.searchParams.get('token');
        if (!tok || !DB.load(tok)) return json(res, 401, { error: 'Zła sesja' });
        const naDysku = await wersjaZDysku();
        if (!naDysku || naDysku === WERSJA) {
          return json(res, 200, { ok: false, aktualny: true, error: 'Serwer jest już aktualny' });
        }
        json(res, 200, { ok: true, z: WERSJA, na: naDysku });
        // Odpowiedź musi wyjść PRZED wyjściem z procesu. Nowy startuje odłączony,
        // żeby nie zginął razem ze starym.
        setTimeout(() => {
          const { spawn } = childProcess;
          spawn(process.argv[0], process.argv.slice(1), {
            cwd: here, detached: true, stdio: 'ignore', env: process.env,
          }).unref();
          process.exit(0);
        }, 400);
        return;
      }

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
        case '/api/autotick':result = tickAutoFight(ch); break;
        case '/api/fighttarget': result = setFightTarget(ch, body.idx); break;
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
        case '/api/mine':    result = doMine(ch, String(body.skill ?? 'gornictwo'), String(body.res), body.mode); break;
        case '/api/minestop':result = doMineStop(ch); break;
        case '/api/minetick':result = doMineTick(ch); break;
        case '/api/mineequip':result = equipMining(ch, body.itemId ?? null, body.slot ?? null); break;
        case '/api/furnace': result = doFurnace(ch, body.action, body.amount ?? 'all'); break;
        case '/api/team':    result = doTeam(ch, body.slot, body.idx); break;
        case '/api/eat':     result = doEat(ch, String(body.id), body.target); break;
        case '/api/runa': {
          // Podpięcie runy. Runa zostaje w zapasach — nie zużywa się,
          // podpięcie to wybór, nie koszt.
          const id = body.id ? String(body.id) : null;
          if (id && !(ch.materials[id] > 0)) { result = { error: 'Nie masz tej runy' }; break; }
          ch.runa = id;
          result = { ok: true, runa: id, zaklecia: zaklecia(ch) };
          break;
        }
        case '/api/upgrade': result = doUpgrade(ch, body.itemId); break;
        case '/api/expstart':  result = doExpStart(ch, String(body.id ?? 'puszcza'), String(body.risk), body.mods); break;
        case '/api/dungeonstart': result = doDungeonStart(ch, String(body.id ?? 'gniazdocierni')); break;
        case '/api/expleave':  result = doExpLeave(ch); break;
        case '/api/expchoose': result = doExpChoose(ch, String(body.opcja)); break;
        case '/api/expsafe':   result = doExpSafepoint(ch, body.itemId ?? null, body.matId ?? null, body.jedzenie ?? null); break;
        // Karta gracza: herb i opis. Imienia nie ruszamy — na nim stoi kod postaci
        // i wpisy w Kronice.
        case '/api/profil': {
          if (body.crest && typeof body.crest === 'object') {
            const c = body.crest;
            ch.crest = { shape: String(c.shape), symbol: String(c.symbol),
                         color: String(c.color), border: String(c.border), ink: String(c.ink) };
          }
          if (typeof body.bio === 'string') ch.bio = body.bio.slice(0, C.ui.bioMax);
          result = { ok: true };
          break;
        }
        case '/api/settings': {
          const st2 = ch.settings ?? { ...C.ui.domyslne };
          if (typeof body.theme === 'string' && C.ui.themes.some(t => t.id === body.theme)) st2.theme = body.theme;
          if (typeof body.quality === 'string' && C.ui.quality.some(q => q.id === body.quality)) st2.quality = body.quality;
          if (typeof body.sound === 'boolean') st2.sound = body.sound;
          if (typeof body.volume === 'number') st2.volume = Math.min(1, Math.max(0, body.volume));
          ch.settings = st2;
          result = { ok: true, settings: st2 };
          break;
        }
        case '/api/kolos':   result = startKolos(ch); break;
        case '/api/tytan':   result = startTytan(ch); break;
        case '/api/preview': result = wearPreview(ch, body.id); break;
        case '/api/powtarzaj': {
          if (poziom(ch) < C.tower.powtarzanieOd) {
            result = { error: `Powtarzanie otwiera się na piętrze ${C.tower.powtarzanieOd}` };
            break;
          }
          ch.powtarzaj = !!body.on;
          result = { ok: true, powtarzaj: ch.powtarzaj };
          break;
        }
        case '/api/autoboss': {
          ch.alwaysAuto = !!body.on;
          result = { ok: true, alwaysAuto: ch.alwaysAuto };
          break;
        }
        case '/api/equip': {
          const loadout = ['pve_a', 'pve_b', 'pvp'].includes(body.loadout) ? body.loadout : 'pve_a';
          result = equip(ch, String(body.itemId), loadout);
          break;
        }
        case '/api/pveloadout': {
          if (ch.activeFight && !ch.activeFight.over) { result = { error: 'Zestaw zmienisz po zakończeniu walki' }; break; }
          result = switchPveLoadout(ch, body.id);
          break;
        }
        case '/api/potion': {
          const st = computeStats(ch);
          // Bez wskazania rodzaju bierzemy NAJSŁABSZĄ, która domknie brak —
          // ta sama reguła co w walce.
          const brak = st.maxHp - st.hp;
          const maja = C.healing.mikstury.filter(m => (ch.mikstury?.[m.id] ?? 0) > 0);
          // UWAGA NA `??` TUTAJ. Wcześniej stało `(zad && ...) ?? reszta` i przy
          // pustym `zad` całość dawała '' — wartość FAŁSZYWĄ, ale nie null,
          // więc `??` nie przepuszczało dalej i picie bez wskazania rodzaju
          // kończyło się komunikatem „Brak mikstur".
          const zad = String(body.id ?? '');
          const wskazana = zad && (ch.mikstury?.[zad] ?? 0) > 0
            ? C.healing.mikstury.find(m => m.id === zad) : null;
          const wybor = wskazana
            || maja.find(m => Math.round(m.pct ? st.maxHp * m.pct : m.flat) >= brak)
            || maja[maja.length - 1];
          if (!wybor) { result = { error: 'Brak mikstur' }; break; }
          ch.mikstury[wybor.id]--;
          if (ch.mikstury[wybor.id] <= 0) delete ch.mikstury[wybor.id];
          const ile = Math.round((wybor.pct ? st.maxHp * wybor.pct : wybor.flat) * (1 + st.potionPct));
          ch.hpLost = Math.max(0, ch.hpLost - ile);
          result = { ok: true, label: wybor.label, ile };
          break;
        }
        // Kupowanie mikstur SKASOWANE. Mikstury robi się Alchemią — złoto
        // nie może być skrótem omijającym profesję.
        case '/api/attr': {
          const a = String(body.attr);
          if (!(a in ch.attrs)) { result = { error: 'Nieznany atrybut' }; break; }
          if (ch.unspentAttr <= 0) { result = { error: 'Brak punktów' }; break; }
          // Ile na raz — hold-to-repeat i wpisana ilość po stronie klienta.
          const n = Math.min(ch.unspentAttr, Math.max(1, Math.floor(Number(body.n) || 1)));
          ch.attrs[a] += n; ch.unspentAttr -= n;
          result = { ok: true, added: n };
          break;
        }
        // Reset atrybutów — za darmo, jak reset drzewka skilla. Zwraca wszystkie
        // rozdane punkty do puli i zeruje atrybuty.
        case '/api/attrreset': {
          const zwrot = Object.values(ch.attrs).reduce((s, v) => s + (Number(v) || 0), 0);
          for (const k of Object.keys(ch.attrs)) ch.attrs[k] = 0;
          ch.unspentAttr += zwrot;
          result = { ok: true, zwrot };
          break;
        }
        case '/api/cskill': {
          const r = wydajPunktSkilla(ch, String(body.node));
          result = r.ok ? { ok: true, ranga: r.ranga, skill: r.skill } : { error: r.reason };
          break;
        }
        case '/api/cskillreset': {
          const r = resetDrzewkaSkilla(ch, String(body.skill));
          result = r.ok ? { ok: true, wrocilo: r.wrocilo } : { error: r.reason };
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
          const gear = body.loadout === 'pvp' ? ch.pvpEquipment
            : pveGear(ch, body.loadout === 'pve_b' ? 'b' : 'a');
          ch.backpack = ch.backpack.filter(it => {
            const worn = gear[it.slot];
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
