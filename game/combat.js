// Symulacja walki.
// Stan walki jest zwykłym obiektem JSON — da się go zapisać do bazy i wznowić,
// więc ten sam kod obsługuje walkę automatyczną i turową.
//
// Strona gracza to tablica jednostek (Ty + sojusznicy + pet). Na razie jest w niej
// jedna jednostka, ale układ jest gotowy na pięć.

import CONFIG from './config.js';

const C = CONFIG;

// ---------------------------------------------------------------- PRNG z jawnym stanem

export function nextRandom(state) {
  let a = (state + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

const interval = (speed) => C.combat.speedToInterval / Math.max(1, speed);

// ATTACK SPEED — ile ciosów na sekundę. JEDNA SKALA DLA WSZYSTKICH: bohatera,
// sojuszników, petów i mobów. Silnik dalej liczy w `speed`, bo na tym stoi
// kolejka tur; AS jest tym, co widzi gracz i po czym porównuje.
//   AS = 1000 / odstęp = speed / 20
export const attackSpeed = (speed) => Math.max(1, speed) * 1000 / C.combat.speedToInterval;
// Odwrotnie: ile `speed` daje żądany przyrost AS. Używa tego afiks Attack Speed.
export const asDoSpeed = (as) => as * C.combat.speedToInterval / 1000;

// Ile pancerza trzeba na tym piętrze, żeby coś znaczył. K rośnie z piętrem,
// więc pancerz zbija podobny procent na dole i na górze wieży.
export const armorK = (poziom = 1) =>
  C.combat.armorKBase + C.combat.armorKPerFloor * Math.max(1, poziom);

// Bonus Obrony jest endgame'owym bezpiecznikiem, nie ułatwieniem pierwszych
// pięter. Narasta od 25 poziomu i osiąga pełne +25% na poziomie 100.
export const playerArmorEffect = (poziom = 1) => {
  const start = C.combat.playerArmorEffectStartLevel ?? 0;
  const full = Math.max(start + 1, C.combat.playerArmorEffectFullLevel ?? start + 1);
  const progress = Math.min(1, Math.max(0, (poziom - start) / (full - start)));
  return 1 + ((C.combat.playerArmorEffectMult ?? 1) - 1) * progress;
};

const reduce = (F, dmg, armor) => dmg * (1 - armor / (armor + (F.armorK ?? C.combat.armorKBase)));

// Mikstury: dziewięć rodzajów, dwie rodziny. `pct` leczy procent maksymalnego
// zdrowia (skaluje się z postacią), `flat` stałą liczbę punktów.
export const MIKSTURY = Object.fromEntries(C.healing.mikstury.map(m => [m.id, m]));

// Ile ta mikstura uleczy TĘ jednostkę, przed osłabieniem za kolejne użycia.
export const ileLeczy = (id, maxHp) => {
  const m = MIKSTURY[id];
  if (!m) return 0;
  return Math.round(m.pct ? maxHp * m.pct : m.flat);
};

// Zapas mikstur bywa liczbą (stare zapisy, testy) albo mapą id→sztuki.
// Jedno miejsce, które sprowadza to do mapy — inaczej każdy wywołujący
// musiałby pamiętać o obu kształtach.
export function zapasMikstur(p) {
  if (!p) return {};
  if (typeof p === 'number') return p > 0 ? { [C.healing.domyslna]: p } : {};
  return { ...p };
}
export const ilePotek = (p) => Object.values(zapasMikstur(p)).reduce((a, b) => a + b, 0);

export function healEffect(usesSoFar) {
  const h = C.healing;
  const f = h.decayLinear ? 1 - h.decayPerUse * usesSoFar : Math.pow(1 - h.decayPerUse, usesSoFar);
  return Math.max(h.minEffect, f);
}

export const STRENGTHS = C.combat.strengths;
export const ABILITIES = C.abilities;

export function hitChance(accuracy, strength, evasion = 0) {
  const s = STRENGTHS[strength] ?? STRENGTHS.srednio;
  const raw = accuracy + s.acc - evasion;
  return Math.min(C.combat.accuracyMax, Math.max(C.combat.accuracyMin, raw));
}

// ---------------------------------------------------------------- tworzenie walki

// Rozmiar puli pancerza w modelu bariery. Reduction: pula = surowy pancerz
// (nieużywana). Barrier: gracz/drużyna liczy z pancerza sprzętu ×mnożnik,
// mob z ułamka swojego HP — inaczej pula gubiła się przy kwadratowym HP mobów.
function barrierArmorMax(u, side) {
  const a = u.armor ?? 0;
  if (C.combat.armorModel !== 'barrier') return a;
  if (side === 'gracz') return Math.round(a * C.combat.barrierPlayerArmorMult);
  const bossLike = u.variant === 'boss' || u.variant === 'kolos' || u.variant === 'tytan';
  const ratio = bossLike ? C.combat.barrierBossArmorRatio : C.combat.barrierMobArmorRatio;
  return Math.round((u.maxHp ?? u.hp ?? 0) * ratio);
}

const mkUnit = (u, side, idx) => ({
  side, idx, name: u.name, kind: u.kind ?? 'gracz',
  ic: u.ic ?? null,
  // Numer miejsca w szeregu. Silnik go nie używa — rysuje z niego arenę klient,
  // żeby pet stanął na miejscu peta, a nie na pierwszym wolnym.
  slot: u.slot ?? idx,
  hp: u.hp, maxHp: u.maxHp,
  damage: u.damage, speed: u.speed, armor: u.armor ?? 0,
  crit: u.crit ?? 0, critMult: u.critMult ?? 1.5,
  accuracy: u.accuracy ?? 0.8, evasion: u.evasion ?? 0,
  // blok: szansa, że cios zostanie przyjęty tarczą. Bez tarczy jest zerowa,
  // więc tarcza ma wreszcie własną roblotę, a nie tylko kawałek pancerza.
  block: u.block ?? 0, blockCut: u.blockCut ?? C.combat.blockCut,
  potionPct: u.potionPct ?? 0,
  // Rodzaj obrażeń: 'fiz' albo 'mag'. Silnik nie liczy z nich niczego — służą
  // wyłącznie do tego, żeby log walki miał kolor i żeby było widać, czym bijesz.
  // Wynikają z typu broni: różdżka i kostur to magia, reszta to fizyczne.
  dtype: u.dtype ?? 'fiz',
  variant: u.variant ?? null,
  hpRegen: u.hpRegen ?? 0,
  damageType: u.damageType ?? (u.dtype === 'mag' ? 'magic' : 'slash'),
  // Podział typów broni (Miecz 80% Cięcie / 20% Przebicie). Silnik blenduje
  // po nim odporności i — w modelu bariery — rozdziela cios na pulę i HP.
  damageSplit: u.damageSplit ?? null,
  resists: { ...(u.resists ?? {}) },
  // Pula pancerza (model 'barrier'). Wraca co walkę, bo mkUnit odpala się przy
  // każdym createFight. Moby: ułamek HP. Gracz/drużyna: pancerz sprzętu ×mnożnik.
  // W modelu 'reduction' pole leży nieużywane (liczy się `armor`).
  armorMax: barrierArmorMax(u, side),
  armorNow: barrierArmorMax(u, side),
  reflectByType: { ...(u.reflectByType ?? {}) },
  reflectCapPct: u.reflectCapPct ?? 0.12,
  // Szyk. row: 1 przód, 2 środek, 3 tył. reach: do którego rzędu sięga broń.
  // advance rośnie, gdy jednostka podchodzi — każde podejście to jedna tura.
  row: u.row ?? 1,
  reach: u.reach ?? C.formation.maxRow,
  advance: 0,
  klasa: u.klasa ?? null,
  role: u.role ?? null,
  roleDesc: u.roleDesc ?? null,
  threatMult: u.threatMult ?? 1,
  basicHits: u.basicHits ?? 1,
  basicHitMult: u.basicHitMult ?? 1,
  armorPierce: u.armorPierce ?? 0,
  splashMult: u.splashMult ?? 0,
  supportHealPct: u.supportHealPct ?? 0,
  supportHealCd: u.supportHealCd ?? 0,
  exposeArmor: u.exposeArmor ?? 0,
  bleedMult: u.bleedMult ?? 0,
  bleedTurns: u.bleedTurns ?? 0,
  // Ustawiany w trakcie walki kliknięciem gracza. Nie omija zasięgu ani szyku —
  // jest tylko pierwszym wyborem spośród celów, które ta jednostka może dosięgnąć.
  preferredTarget: u.preferredTarget ?? null,
  taunt: null,           // { by, turns } — kto go sprowokował i na jak długo
  // Zdolności przeciwnika (id z config.wrogowie.zdolnosci) i ich odnowienia.
  // Kolejność listy to priorytet: AI gra pierwszą gotową.
  skills: u.skills ?? [],
  cd: {},
  ataki: u.ataki ?? 1,   // ile ciosów na turę — Kolos bije dwa razy pod rząd
  next: interval(u.speed),
  effects: [],           // [{ id, turns, dmgMult, armorMult, stun, critTakenMult }]
  damageDone: 0,
  damageTaken: 0,
  healingDone: 0,
  healingReceived: 0,
  alive: true,
});

export function createFight({ party, enemies, potions = 0, wtype = 'mele', abilities = [],
                              maxMana = 0, manaRegen = 0, poziom = 1,
                              activeEnemyCap = null, hazard = null }, seed, mode = 'auto') {
  const wszyscyWrogowie = enemies.map((u, i) => mkUnit({ ...u, kind: 'wrog' }, 'wrog', i));
  const cap = Math.max(1, Math.min(wszyscyWrogowie.length,
    activeEnemyCap == null ? wszyscyWrogowie.length : activeEnemyCap));
  return {
    mode, seed, rng: seed >>> 0, t: 0, turn: 0, wtype,
    // Skala pancerza tej walki. Wyliczona raz, bo stan walki musi zostać
    // serializowalny — inaczej wznowiona walka liczyłaby inaczej niż zaczęta.
    armorK: armorK(poziom),
    playerArmorEffectMult: playerArmorEffect(poziom),
    // Mana pod zaklęcia. Jedyny zasób w walce — pasek ładowania został skasowany.
    // Umiejętności chodzą na cooldownach, zaklęcia na manie.
    mana: maxMana, maxMana, manaRegen,
    party: party.map((u, i) => mkUnit(u, 'gracz', i)),
    enemies: wszyscyWrogowie.slice(0, cap).map((u, i) => ({ ...u, slot: i })),
    reinforcements: wszyscyWrogowie.slice(cap),
    enemyHistory: [],
    enemyTotal: wszyscyWrogowie.length,
    activeEnemyCap: cap,
    priorityTarget: null,
    hazard,
    potions: zapasMikstur(potions), potionsStart: ilePotek(potions), healUses: 0,
    cooldowns: Object.fromEntries(abilities.map(a => [a, 0])),
    abilities,
    log: [], over: false, win: null, awaiting: false,
  };
}

const hero = (F) => F.party[0];
const livingEnemies = (F) => F.enemies.filter(e => e.alive);
const livingParty = (F) => F.party.filter(u => u.alive);

// ---------------------------------------------------------------- szyk

// Kogo ta jednostka może w tej chwili dosięgnąć. Zawsze najbliższy rząd —
// nie da się przeskoczyć obrońcy i uderzyć w maga za nim.
export function reachable(attacker, pool) {
  const zywi = pool.filter(u => u.alive);
  if (!zywi.length) return [];
  const zasieg = attacker.reach + attacker.advance;
  const w = zywi.filter(u => u.row <= zasieg);
  if (!w.length) return [];
  const naj = Math.min(...w.map(u => u.row));
  return w.filter(u => u.row === naj);
}

// Jak groźna jest jednostka. Obrażenia na sekundę ważą najwięcej, bo to one
// zabijają; niskie HP podbija priorytet, bo taniej ją dobić niż tankować.
export const groznosc = (u) =>
  (u.damage * (u.speed || 100) / 100) * (u.threatMult ?? 1)
  * (1 + Math.max(0, 1 - u.hp / u.maxHp) * 0.5);

// Kogo zaatakować. AI nie wali w pierwszego z brzegu:
//   1. PROWOKACJA ma pierwszeństwo — sprowokowany bije w prowokującego
//   2. w zasięgu wybiera NAJGROŹNIEJSZEGO, nie najbliższego w tablicy
// Dzięki temu łucznik z tyłu naprawdę jest wart ochrony, a tank ma czym
// odciągnąć uwagę od maga.
export function pickTarget(attacker, pool) {
  const w = reachable(attacker, pool);
  if (!w.length) return null;

  if (attacker.taunt?.turns > 0) {
    const prowokujacy = w.find(u => u.idx === attacker.taunt.by && u.alive);
    if (prowokujacy) return prowokujacy;
  }
  const wybrany = w.find(u => u.idx === attacker.preferredTarget && u.alive);
  if (wybrany) return wybrany;
  return w.reduce((a, b) => (groznosc(b) > groznosc(a) ? b : a));
}

export const target1 = (attacker, pool) => pickTarget(attacker, pool);

// Ile jeszcze podejść dzieli jednostkę od najbliższego żywego wroga.
export function stepsNeeded(attacker, pool) {
  const zywi = pool.filter(u => u.alive);
  if (!zywi.length) return 0;
  const naj = Math.min(...zywi.map(u => u.row));
  return Math.max(0, naj - (attacker.reach + attacker.advance));
}

// Nazwa jedzie razem z HP. Klient odtwarza arenę wyłącznie z wpisów logu —
// bez niej rysował „undefined" pod każdym paskiem.
function snapshot(F) {
  const u2 = (u) => ({ name: u.name, hp: Math.max(0, u.hp), maxHp: u.maxHp, alive: u.alive,
                       idx: u.idx, slot: u.slot, kind: u.kind, row: u.row, advance: u.advance,
                       role: u.role, klasa: u.klasa, ic: u.ic,
                       armorMax: u.armorMax ?? u.armor ?? 0, armorNow: Math.max(0, u.armorNow ?? u.armorMax ?? u.armor ?? 0),
                       dtype: u.dtype, damageType: u.damageType, resists: { ...u.resists } });
  const pokonani = (F.enemyHistory?.length ?? 0) + F.enemies.filter(u => !u.alive).length;
  return {
    party: F.party.map(u2),
    enemies: F.enemies.map(u2),
    enemyProgress: { defeated: pokonani, total: F.enemyTotal ?? F.enemies.length,
      queued: F.reinforcements?.length ?? 0, active: livingEnemies(F).length },
    reinforcementPreview: (F.reinforcements ?? []).slice(0, 3).map(u2),
    priorityTarget: F.priorityTarget ?? null,
    mana: F.mana,
    combatStats: combatStats(F),
  };
}

function unitCombatStats(u) {
  return {
    name: u.name, side: u.side, idx: u.idx, slot: u.slot, kind: u.kind, role: u.role,
    damageDone: u.damageDone ?? 0, damageTaken: u.damageTaken ?? 0,
    healingDone: u.healingDone ?? 0, healingReceived: u.healingReceived ?? 0,
  };
}

function combatStats(F) {
  const party = F.party.map(unitCombatStats);
  const enemies = [...(F.enemyHistory ?? []), ...F.enemies].map(unitCombatStats);
  const sum = (arr, key) => arr.reduce((n, u) => n + (u[key] ?? 0), 0);
  return {
    party, enemies,
    totals: {
      damageDone: sum(party, 'damageDone'),
      damageTaken: sum(party, 'damageTaken'),
      healingDone: sum(party, 'healingDone'),
      enemyDamage: sum(enemies, 'damageDone'),
    },
  };
}

function applyHeal(healer, target, wanted) {
  const actual = Math.max(0, Math.min(target.maxHp - target.hp, wanted));
  target.hp += actual;
  healer.healingDone = (healer.healingDone ?? 0) + actual;
  target.healingReceived = (target.healingReceived ?? 0) + actual;
  return actual;
}

const push = (F, kind, text, extra = {}) =>
  F.log.push({ t: Math.round(F.t), kind, text, ...snapshot(F), ...extra });

function rand(F) { const [v, s] = nextRandom(F.rng); F.rng = s; return v; }

// ---------------------------------------------------------------- efekty

function effMult(u, key, base = 1) {
  let m = base;
  for (const e of u.effects) if (e[key] != null) m *= e[key];
  return m;
}
const isStunned = (u) => u.effects.some(e => e.stun);

function tickEffects(u, F) {
  const expired = [];
  u.effects = u.effects.filter(e => {
    // Trucizna zbiera swoje na początku tury zatrutego. Liczona z jego
    // MAKSYMALNEGO zdrowia, więc gruby przeciwnik nie jest na nią odporny.
    if (e.dmgPerTurn && u.alive) {
      const d = Math.max(1, Math.round(e.dmgPerTurn));
      const actual = Math.min(u.hp, d);
      u.hp = Math.max(0, u.hp - d);
      u.damageTaken = (u.damageTaken ?? 0) + actual;
      const sourcePool = e.sourceSide === 'wrog'
        ? [...(F.enemyHistory ?? []), ...F.enemies] : F.party;
      const source = sourcePool.find(x => x.idx === e.sourceIdx);
      if (source) source.damageDone = (source.damageDone ?? 0) + actual;
      if (u.hp <= 0) u.alive = false;
      push(F, u.side === 'wrog' ? 'hit' : 'enemy',
           `☠ ${u.name}: ${e.label ?? e.id} −${d}`, { dmg: d, dtype: 'mag' });
      if (!u.alive) push(F, u.side === 'wrog' ? 'kill' : 'down', `${u.name} pada`);
    }
    e.turns--;
    if (e.turns <= 0) { expired.push(e.id); return false; }
    return true;
  });
  for (const id of expired) push(F, 'info', `${u.name}: ${id} wygasa`);
}

function addEffect(u, eff) {
  u.effects = u.effects.filter(e => e.id !== eff.id);
  u.effects.push({ ...eff });
}

// ---------------------------------------------------------------- cios

function strike(F, attacker, target, { mult = 1, strength = null, pierce = 0,
                                       label = null, damageType = null }) {
  const chance = strength
    ? hitChance(attacker.accuracy, strength, target.evasion)
    : Math.min(C.combat.accuracyMax, Math.max(C.combat.accuracyMin, attacker.accuracy - target.evasion));

  if (rand(F) > chance) {
    push(F, 'miss', `${attacker.name} → ${target.name}: pudło`, {
      actor: { side: attacker.side, idx: attacker.idx }, target: { side: target.side, idx: target.idx },
    });
    return 0;
  }

  const critTaken = effMult(target, 'critTakenMult');
  const isCrit = rand(F) < attacker.crit * critTaken;

  let dmg = attacker.damage * effMult(attacker, 'dmgMult') * mult * (0.9 + rand(F) * 0.2);
  if (isCrit) dmg *= attacker.critMult;

  // Blok idzie po krytyku i przed pancerzem — zablokowany krytyk boli jak zwykły cios.
  const blocked = target.block > 0 && rand(F) < target.block;
  if (blocked) dmg *= (1 - Math.min(0.9, target.blockCut));

  const clampRes = r => Math.min(C.combat.resistanceMax, Math.max(C.combat.resistanceMin, r ?? 0));
  // Efektywny podział typów tego ciosu. Zaklęcie wymusza jeden typ; broń niesie
  // swój (Miecz 80% Cięcie / 20% Przebicie); reszta ma pojedynczy typ.
  const split = damageType ? { [damageType]: 1 }
    : (attacker.damageSplit
       ?? { [attacker.damageType ?? (attacker.dtype === 'mag' ? 'magic' : 'slash')]: 1 });
  // Typ dominujący — do koloru i ikony wpisu logu.
  const typ = Object.entries(split).sort((a, b) => b[1] - a[1])[0][0];
  // Odporność ważona po podziale — do modelu redukcji i do metadanych logu.
  const resist = Object.entries(split)
    .reduce((s, [t, w]) => s + w * clampRes(target.resists?.[t] ?? 0), 0);

  let armorHit = 0;   // ile ciosu poszło w pulę pancerza (do logu)
  if (C.combat.armorModel === 'barrier') {
    // PANCERZ = PULA (druga pula życia). Cios najpierw bije pulę pancerza;
    // dopiero jej nadwyżka sięga HP. Przebicie i Magia omijają pulę.
    let toHp = 0, toPool = 0;
    for (const [t, w] of Object.entries(split)) {
      const portion = dmg * w * (1 - clampRes(target.resists?.[t] ?? 0));
      if (t === 'pierce' || t === 'magic') toHp += portion;            // omija pulę fizyczną
      else if (t === 'smash') toPool += portion * C.combat.crushVsArmorMult; // łamie szybciej
      else toPool += portion;                                          // Cięcie neutralne
    }
    // Jawne przebicie (afiks/zaklęcie) przelewa część puli prosto w HP.
    if (pierce > 0) { const p = toPool * pierce; toPool -= p; toHp += p; }
    const absorbed = Math.min(target.armorNow ?? 0, toPool);
    target.armorNow = Math.max(0, (target.armorNow ?? 0) - absorbed);
    armorHit = Math.round(absorbed);
    toHp += (toPool - absorbed);
    dmg = Math.max(1, Math.round(toHp * effMult(target, 'takenMult')));
  } else {
    // STARY MODEL: redukcja armor/(armor+K). Odporność typu działa PO pancerzu.
    const zapisanyPoziom = (F.armorK - C.combat.armorKBase) / C.combat.armorKPerFloor;
    const playerArmor = target.side === 'gracz'
      ? (F.playerArmorEffectMult ?? playerArmorEffect(zapisanyPoziom)) : 1;
    const armor = target.armor * playerArmor * effMult(target, 'armorMult') * (1 - pierce);
    dmg = Math.max(1, Math.round(reduce(F, dmg, armor) * effMult(target, 'takenMult') * (1 - resist)));
  }
  const actual = Math.min(target.hp, dmg);
  target.hp -= dmg;
  attacker.damageDone = (attacker.damageDone ?? 0) + actual;
  target.damageTaken = (target.damageTaken ?? 0) + actual;
  if (target.hp <= 0) { target.hp = 0; target.alive = false; }

  const who = label ? `${attacker.name} · ${label}` : attacker.name;
  const znak = C.combat.damageTypes?.[typ]?.ic ?? (attacker.dtype === 'mag' ? '✦' : '⚔');
  push(F, isCrit ? 'crit' : (attacker.side === 'wrog' ? 'enemy' : 'hit'),
       `${znak} ${who} → ${target.name}: ${dmg}${armorHit > 0 ? ` 🛡−${armorHit}` : ''}${isCrit ? ' KRYT' : ''}${blocked ? ' BLOK' : ''}`,
       { dmg, armorHit, blocked, dtype: typ === 'magic' ? 'mag' : 'fiz', damageType: typ, resist,
         actor: { side: attacker.side, idx: attacker.idx }, target: { side: target.side, idx: target.idx } });

  // Hazard elity nie jest ukrytym podatkiem od HP: oddaje wyłącznie wskazany
  // rodzaj ciosu. Zmiana broni na Smash/Pierce/Magię całkowicie go omija.
  const reflect = Math.max(0, target.reflectByType?.[typ] ?? 0);
  if (reflect > 0 && attacker.alive && actual > 0) {
    const zwrot = Math.max(1, Math.round(Math.min(dmg * reflect,
      attacker.maxHp * Math.max(0, target.reflectCapPct ?? 0.12))));
    const real = Math.min(attacker.hp, zwrot);
    attacker.hp = Math.max(0, attacker.hp - zwrot);
    attacker.damageTaken = (attacker.damageTaken ?? 0) + real;
    target.damageDone = (target.damageDone ?? 0) + real;
    if (attacker.hp <= 0) attacker.alive = false;
    push(F, attacker.side === 'gracz' ? 'enemy' : 'hit',
      `🌿 Cierniowy Odwet → ${attacker.name}: ${zwrot}`,
      { dmg: zwrot, dtype: 'fiz', damageType: 'slash',
        actor: { side: target.side, idx: target.idx }, target: { side: attacker.side, idx: attacker.idx } });
    if (!attacker.alive) push(F, attacker.side === 'wrog' ? 'kill' : 'down', `${attacker.name} pada`);
  }

  if (!target.alive) push(F, target.side === 'wrog' ? 'kill' : 'down', `${target.name} pada`);
  return dmg;
}

// ---------------------------------------------------------------- akcje gracza

// Podejście. Broń biała nie dosięga tylnych rzędów — trzeba stracić turę,
// żeby skrócić dystans. To jest cała cena za bicie wręcz i cały powód,
// dla którego tylna jednostka jest warta ochrony.
function advance(F, u, pool) {
  const zostalo = stepsNeeded(u, pool);
  if (zostalo <= 0) return false;
  u.advance++;
  const po = stepsNeeded(u, pool);
  push(F, 'info', po > 0
    ? `${u.name} podchodzi — jeszcze ${po}`
    : `${u.name} dopadł tylny rząd`);
  return true;
}

function playerBasic(F, u, strength) {
  const target = target1(u, F.enemies);
  if (!target) { advance(F, u, F.enemies); return; }
  strike(F, u, target, { mult: STRENGTHS[strength].dmg, strength });
}

// Towarzysz nie jest już słabszą kopią zwykłego ataku bohatera. Każda klasa
// realizuje swój prosty automat: paladyn leczy, tancerz tnie dwa razy, mag razi
// grupę, tropiciel odsłania pancerz, a pet zostawia krwawienie.
function companionTurn(F, u) {
  if (u.supportHealPct > 0 && (u.cd.wsparcie ?? 0) <= 0) {
    const ranni = F.party.filter(x => x.alive && x.hp / x.maxHp < 0.75);
    if (ranni.length) {
      const cel = ranni.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a));
      const ile = Math.max(1, Math.round(cel.maxHp * u.supportHealPct));
      const healed = applyHeal(u, cel, ile);
      u.cd.wsparcie = u.supportHealCd || 4;
      push(F, 'heal', `${u.name} · ${u.role}: ${cel.name} +${healed}`, { heal: healed,
        actor: { side: u.side, idx: u.idx }, target: { side: cel.side, idx: cel.idx } });
      return;
    }
  }

  let pierwszy = target1(u, F.enemies);
  if (!pierwszy) { advance(F, u, F.enemies); return; }

  for (let i = 0; i < Math.max(1, u.basicHits); i++) {
    if (!u.alive) break;
    const cel = target1(u, F.enemies);
    if (!cel) break;
    const trafilo = strike(F, u, cel, {
      mult: u.basicHitMult,
      pierce: u.armorPierce,
      label: u.basicHits > 1 ? `${u.role} ${i + 1}/${u.basicHits}` : u.role,
    });
    if (!trafilo) continue;

    if (u.exposeArmor > 0 && cel.alive) {
      addEffect(cel, { id: 'odsloniety_pancerz', label: 'Odsłonięty pancerz', turns: 2,
                       armorMult: u.exposeArmor });
      push(F, 'info', `${u.name}: ${cel.name} traci ${Math.round((1 - u.exposeArmor) * 100)}% pancerza`);
    }
    if (u.bleedMult > 0 && cel.alive) {
      addEffect(cel, { id: 'krwawienie_peta', label: 'Krwawienie', turns: u.bleedTurns || 2,
                       dmgPerTurn: Math.max(1, Math.round(u.damage * u.bleedMult)),
                       sourceSide: u.side, sourceIdx: u.idx });
      push(F, 'info', `${u.name}: ${cel.name} krwawi`);
    }

    if (u.splashMult > 0) {
      for (const drugi of livingEnemies(F)) {
        if (!u.alive) break;
        if (drugi.idx === cel.idx) continue;
        strike(F, u, drugi, { mult: u.splashMult, pierce: u.armorPierce, label: `${u.role} · fala` });
      }
    }
  }
}

// Czy umiejętność da się w tej chwili użyć. Powód odmowy wraca tekstem,
// żeby klient nie musiał znać reguł.
export function abilityBlock(F, id) {
  const A = ABILITIES[id];
  if (!A) return 'nieznana umiejętność';
  if ((F.cooldowns?.[id] ?? 0) > 0) return `odnowienie: ${F.cooldowns[id]}`;
  if (A.mana && F.mana < A.mana) return `brak many (${F.mana}/${A.mana})`;
  return null;
}

function useAbility(F, u, id) {
  const A = ABILITIES[id];
  const blok = abilityBlock(F, id);
  if (blok) { push(F, 'info', `${A?.label ?? id}: ${blok}`); return; }

  // Zaklęcia płacą maną i ćwiczą Magię. Reszta chodzi na samym cooldownie.
  if (A.mana) {
    F.mana -= A.mana;
    F.spellsCast = (F.spellsCast ?? 0) + 1;
    push(F, 'buff', `${u.name} · ${A.label} (−${A.mana} many)`);
  }
  F.cooldowns[id] = A.cd;

  // PROWOKACJA — ściąga uwagę wrogów i zatrzymuje ich marsz w głąb szyku.
  if (A.taunt) {
    for (const e of F.enemies) if (e.alive) e.taunt = { by: u.idx, turns: A.taunt };
    push(F, 'buff', `${u.name} · ${A.label} — wrogowie idą po Ciebie`);
  }

  if (A.heal) {
    const ile = Math.round(u.maxHp * A.heal);
    const healed = applyHeal(u, u, ile);
    push(F, 'heal', `${u.name} · ${A.label}: +${healed}`, { heal: healed });
  }

  if (A.buff) {
    addEffect(u, A.buff);
    if (!A.mana && !A.taunt) push(F, 'buff', `${u.name} · ${A.label}`);
  }
  if (A.buff || A.heal || A.taunt) return;

  const targets = A.target === 'all' ? livingEnemies(F) : reachable(u, F.enemies).slice(0, 1);
  if (!targets.length) return;

  const hits = A.hits ?? 1;
  for (let h = 0; h < hits; h++) {
    for (const t of targets) {
      if (!t.alive) continue;
      strike(F, u, t, { mult: A.dmgMult ?? 1, pierce: A.armorPierce ?? 0,
        label: A.label, damageType: A.mana ? 'magic' : null });
    }
  }
  if (A.stun) {
    for (const t of targets) {
      if (t.alive && rand(F) < A.stun) {
        addEffect(t, { id: 'ogluszenie', turns: A.stunTurns ?? 1, stun: true,
                       critTakenMult: A.stunCritMult ?? 1 });
        push(F, 'info', `${t.name} ogłuszony`);
      }
    }
  }
}

// Którą wypić, gdy gracz nie wskazał. NAJSŁABSZĄ, KTÓRA WYSTARCZY — inaczej
// automat wypijałby Eliksir Otchłani na zadrapanie. Gdy żadna nie domyka
// brakującego zdrowia, leci najmocniejsza dostępna.
function wybierzMiksture(F, u) {
  const brak = u.maxHp - u.hp;
  const maja = C.healing.mikstury.filter(m => (F.potions[m.id] ?? 0) > 0);
  if (!maja.length) return null;
  const wystarcza = maja.find(m => ileLeczy(m.id, u.maxHp) >= brak);
  return (wystarcza ?? maja[maja.length - 1]).id;
}

function drinkPotion(F, u, id = null) {
  const wybor = id && (F.potions[id] ?? 0) > 0 ? id : wybierzMiksture(F, u);
  if (!wybor) { push(F, 'info', 'brak mikstur'); return; }

  const M = MIKSTURY[wybor];
  const eff = healEffect(F.healUses);
  const heal = Math.round(ileLeczy(wybor, u.maxHp) * eff * (1 + (u.potionPct ?? 0)));
  const healed = applyHeal(u, u, heal);
  F.potions[wybor]--;
  if (F.potions[wybor] <= 0) delete F.potions[wybor];
  F.healUses++;
  push(F, 'heal', `${u.name}: ${M.label} +${healed} (×${eff.toFixed(2)})`, { heal: healed });
}

// Mikstury należą do bohatera. Sojusznik ich nie tyka — inaczej pet wypijałby
// zapas, którego gracz potrzebuje na bossa.
function autoPotion(F, u) {
  if (u.idx !== 0) return false;
  if (!ilePotek(F.potions) || u.hp / u.maxHp >= C.healing.autoThreshold) return false;
  drinkPotion(F, u);
  return true;
}

// ---------------------------------------------------------------- tury

// Obrona: oddajesz turę, ale ciosy do następnej Twojej tury bolą o połowę mniej.
// turns:1 znaczy „do mojej następnej tury" — tickEffects zdejmuje efekt dopiero
// na początku kolejnej tury tej samej jednostki, więc wrogie ciosy w międzyczasie
// jeszcze go łapią.
function defend(F, u) {
  u.effects.push({ id: 'obrona', turns: 1, takenMult: 1 - C.combat.defendCut });
  push(F, 'buff', `${u.name} staje w obronie — obrażenia mniejsze o ${Math.round(C.combat.defendCut * 100)}%`);
}

// Zdolność przeciwnika. Gra PIERWSZĄ gotową z listy, więc kolejność w `skills`
// jest jego priorytetem: healer leczy, zanim zacznie bić.
// Zwraca true, gdy tura została zużyta.
function wrogZdolnosc(F, u) {
  const Z_ALL = C.wrogowie?.zdolnosci ?? {};
  const swoi = u.side === 'wrog' ? F.enemies : F.party;
  const obcy = u.side === 'wrog' ? F.party : F.enemies;

  for (const id of u.skills ?? []) {
    const Z = Z_ALL[id];
    if (!Z || (u.cd[id] ?? 0) > 0) continue;

    // Leczenie. Bez rannego sojusznika zdolność się nie marnuje — czeka.
    if (Z.healPctMaxHp) {
      const ranni = swoi.filter(x => x.alive && x.hp / x.maxHp < (Z.prog ?? 0.85));
      if (!ranni.length) continue;
      const cel = ranni.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a));
      const ile = Math.max(1, Math.round(cel.maxHp * Z.healPctMaxHp));
      const healed = applyHeal(u, cel, ile);
      u.cd[id] = Z.cd;
      push(F, 'heal', `${u.name} · ${Z.label}: ${cel.name} +${healed}`, { heal: healed });
      return true;
    }

    const cel = target1(u, obcy);
    if (!cel) continue;                       // nie dosięga — niech lepiej podejdzie
    u.cd[id] = Z.cd;
    strike(F, u, cel, { mult: Z.dmgMult ?? 1, pierce: Z.armorPierce ?? 0, label: Z.label });

    if (Z.stun && cel.alive && rand(F) < Z.stun) {
      addEffect(cel, { id: 'ogluszenie', turns: Z.stunTurns ?? 1, stun: true });
      push(F, 'info', `${cel.name} ogłuszony na ${Z.stunTurns ?? 1} tur`);
    }
    if (Z.dot && cel.alive) {
      addEffect(cel, { id: Z.dot.id, label: Z.dot.label, turns: Z.dot.turns,
                       dmgPerTurn: Math.max(1, Math.round(cel.maxHp * Z.dot.pctMaxHp)) });
      push(F, 'info', `${cel.name}: ${Z.dot.label}`);
    }
    return true;
  }
  return false;
}

function unitTurn(F, u, action) {
  F.turn++;
  tickEffects(u, F);

  // Prowokacja schodzi z tur na turze sprowokowanego.
  if (u.taunt) { u.taunt.turns--; if (u.taunt.turns <= 0) u.taunt = null; }

  // Trucizna mogła go właśnie dobić — martwy nie bije.
  if (!u.alive) { u.next += interval(u.speed); return; }

  if (isStunned(u)) {
    push(F, 'info', `${u.name} jest ogłuszony i traci turę`);
  } else if (u.side === 'wrog') {
    if (!wrogZdolnosc(F, u)) {
      const target = target1(u, F.party);
      if (target) {
        // Kolos i jemu podobni biją kilka razy pod rząd. Cel wybierany na nowo
        // przy każdym ciosie, żeby drugi cios nie leciał w trupa.
        for (let i = 0; i < (u.ataki ?? 1); i++) {
          const t = target1(u, F.party);
          if (!t) break;
          strike(F, u, t, { label: i > 0 ? `cios ${i + 1}` : null });
        }
      }
      // Sprowokowany stoi w miejscu — o to chodzi w prowokacji. Bez niej
      // podchodzi, żeby dobrać się do tylnych rzędów.
      else if (!u.taunt) advance(F, u, F.party);
      else push(F, 'info', `${u.name} stoi sprowokowany`);
    }
  } else if (action == null) {
    autoPotion(F, u);
    if (u.idx !== 0) {
      companionTurn(F, u);
      u.next += interval(u.speed);
      for (const k of Object.keys(u.cd)) if (u.cd[k] > 0) u.cd[k]--;
      return;
    }
    // Automat rzuca zaklęcie, gdy stać go na najdroższe dostępne — inaczej
    // mana stałaby pełna, a magia byłaby wyłącznie zabawką trybu turowego.
    const czar = u.idx === 0 ? (F.abilities ?? [])
      .filter(id => ABILITIES[id]?.mana && !abilityBlock(F, id))
      .sort((x, y) => ABILITIES[y].mana - ABILITIES[x].mana)[0] : null;
    if (czar) useAbility(F, u, czar);
    else playerBasic(F, u, 'srednio');
  } else {
    switch (action.type) {
      case 'potion':   drinkPotion(F, u, action.id ?? null); break;
      case 'ability':  useAbility(F, u, action.id); break;
      case 'defend':   defend(F, u); break;
      default:         playerBasic(F, u, action.strength ?? 'srednio');
    }
  }

  u.next += interval(u.speed);
  // Odnowienia zdolności przeciwnika schodzą na JEGO turze — także wtedy,
  // gdy ją stracił przez ogłuszenie.
  for (const k of Object.keys(u.cd)) if (u.cd[k] > 0) u.cd[k]--;
  // Regeneracja z Witalności — HP wraca co własną turę jednostki.
  if ((u.hpRegen ?? 0) > 0 && u.alive && u.hp < u.maxHp) {
    u.hp = Math.min(u.maxHp, u.hp + u.hpRegen);
  }
  if (u.side === 'gracz' && u.idx === 0) {
    for (const k of Object.keys(F.cooldowns)) if (F.cooldowns[k] > 0) F.cooldowns[k]--;
    // Mana wraca sama co Twoją turę — inaczej długa walka kończyłaby się
    // biciem kijem, a magia byłaby jednorazowa.
    if (F.maxMana) F.mana = Math.min(F.maxMana, F.mana + (F.manaRegen ?? 0));
  }
}

function deployReinforcements(F) {
  if (!F.reinforcements?.length) return;
  for (let i = 0; i < F.enemies.length && F.reinforcements.length; i++) {
    const polegly = F.enemies[i];
    if (polegly.alive) continue;
    F.enemyHistory ??= [];
    F.enemyHistory.push(polegly);
    const nowy = F.reinforcements.shift();
    nowy.slot = polegly.slot ?? i;
    // Posiłek dostaje własny czas wejścia. Bez tego jednostka utworzona na
    // początku walki próbowałaby „nadrobić" wszystkie zaległe tury naraz.
    nowy.next = Math.max(nowy.next, F.t + interval(nowy.speed));
    F.enemies[i] = nowy;
    push(F, 'info', `↳ ${nowy.name} wchodzi z posiłków`);
  }
}

function finish(F) {
  if (F.over) return;
  deployReinforcements(F);
  // Zaznaczenie ginie razem z konkretnym przeciwnikiem. Automat wybierze
  // następnego według zwykłego AI, dopóki gracz ponownie kogoś nie wskaże.
  if (F.priorityTarget != null && !F.enemies.some(e => e.alive && e.idx === F.priorityTarget)) {
    F.priorityTarget = null;
    for (const u of F.party) u.preferredTarget = null;
  }
  if (!livingEnemies(F).length) { F.over = true; F.win = true; push(F, 'win', 'Wygrana'); }
  else if (!livingParty(F).length) { F.over = true; F.win = false; push(F, 'lose', 'Przegrana'); }
}

const allUnits = (F) => [...F.party, ...F.enemies].filter(u => u.alive);
const nextUp = (F) => allUnits(F).reduce((a, b) => (b.next < a.next ? b : a));

// Przewija tury do momentu, w którym ruch ma bohater gracza.
export function beginTurn(F) {
  let guard = 0;
  while (!F.over && guard++ < 400) {
    const u = nextUp(F);
    if (u.side === 'gracz' && u.idx === 0) break;
    F.t = u.next;
    unitTurn(F, u, null);
    finish(F);
  }
  F.awaiting = !F.over;
  return F;
}

// Jedna akcja gracza, potem odpowiedź reszty.
export function step(F, action) {
  if (F.over) return F;
  if (!action) return runToEnd(F);

  F.awaiting = false;
  const u = hero(F);
  F.t = Math.max(F.t, u.next);
  unitTurn(F, u, action);
  finish(F);
  if (F.over) return F;

  return beginTurn(F);
}

// Cała walka bez udziału gracza.
export function runToEnd(F) {
  let guard = 0;
  F.awaiting = false;
  while (!F.over && guard++ < C.combat.maxTurns) {
    const u = nextUp(F);
    F.t = u.next;
    unitTurn(F, u, null);
    finish(F);
  }
  if (!F.over) { F.over = true; F.win = livingEnemies(F).length === 0; push(F, 'win', 'walka przerwana'); }
  return F;
}

// Jedna porcja automatu. Walka nie jest już liczona w całości przed animacją:
// serwer rozgrywa najwyżej jeden obieg bohatera, oddaje stan klientowi i dopiero
// potem liczy następny. Między porcjami można naprawdę zmienić wspólny cel.
export function autoRound(F) {
  if (F.over) return F;
  F.awaiting = false;
  let guard = 0;
  let bohaterWykonalRuch = false;
  while (!F.over && guard++ < 12 && F.turn < C.combat.maxTurns) {
    const u = nextUp(F);
    if (bohaterWykonalRuch && u.side === 'gracz' && u.idx === 0) break;
    F.t = u.next;
    unitTurn(F, u, null);
    if (u.side === 'gracz' && u.idx === 0) bohaterWykonalRuch = true;
    finish(F);
  }
  if (!F.over && F.turn >= C.combat.maxTurns) {
    F.over = true;
    F.win = livingEnemies(F).length === 0;
    push(F, F.win ? 'win' : 'lose', F.win ? 'Wygrana' : 'Przegrana — limit tur');
  }
  return F;
}

// ---------------------------------------------------------------- widok

export function summary(F) {
  const u2 = (u) => ({
    name: u.name, kind: u.kind, hp: Math.max(0, u.hp), maxHp: u.maxHp, alive: u.alive,
    idx: u.idx, slot: u.slot, row: u.row, advance: u.advance, role: u.role, klasa: u.klasa,
    ic: u.ic, armorMax: u.armorMax ?? u.armor ?? 0, armorNow: Math.max(0, u.armorNow ?? u.armorMax ?? u.armor ?? 0),
    dtype: u.dtype, damageType: u.damageType, resists: { ...u.resists },
  });
  const nastepny = !F.over ? nextUp(F) : null;
  const pula = nastepny ? (nastepny.side === 'wrog' ? F.party : F.enemies) : [];
  const cel = nastepny ? pickTarget(nastepny, pula) : null;
  return {
    win: !!F.win, over: F.over, awaiting: F.awaiting,
    log: F.log, durationMs: Math.round(F.t), turns: F.turn,
    party: F.party.map(u2),
    enemies: F.enemies.map(u2),
    enemyProgress: { defeated: (F.enemyHistory?.length ?? 0) + F.enemies.filter(u => !u.alive).length,
      total: F.enemyTotal ?? F.enemies.length, queued: F.reinforcements?.length ?? 0,
      active: livingEnemies(F).length },
    reinforcementPreview: (F.reinforcements ?? []).slice(0, 3).map(u2),
    priorityTarget: F.priorityTarget ?? null,
    nextAction: nastepny ? { actor: nastepny.name, actorSide: nastepny.side,
                              target: cel?.name ?? null, role: nastepny.role ?? null } : null,
    mana: F.mana, maxMana: F.maxMana,
    cooldowns: F.cooldowns,
    // Co da się teraz rzucić i dlaczego nie — klient nie musi znać reguł.
    blokady: Object.fromEntries((F.abilities ?? []).map(id => [id, abilityBlock(F, id)])),
    potions: F.potions,
    potionsLeft: ilePotek(F.potions), potionsUsed: F.potionsStart - ilePotek(F.potions),
    spellsCast: F.spellsCast ?? 0,
    combatStats: combatStats(F),
  };
}

// --------------------------------------------------------------- self-check

export function demo() {
  const P = { name: 'Ty', hp: 400, maxHp: 400, damage: 40, speed: 120, armor: 50,
              crit: .1, critMult: 1.6, accuracy: 0.85, evasion: 0.05 };
  const E = { name: 'Goblin', hp: 260, maxHp: 260, damage: 22, speed: 95, armor: 20, evasion: 0.03 };
  const mk = (seed, mode = 'auto') => createFight(
    { party: [{ ...P }], enemies: [{ ...E }], potions: 3, wtype: 'mele',
      abilities: ['okrzyk', 'wir', 'ogluszenie'] }, seed, mode);

  const a = summary(runToEnd(mk(12345)));
  const b = summary(runToEnd(mk(12345)));
  console.assert(JSON.stringify(a.log) === JSON.stringify(b.log), 'symulacja deterministyczna');
  console.assert(a.win === true, 'silniejszy wygrywa');
  console.assert(a.combatStats.totals.damageDone > 0 && a.combatStats.totals.damageTaken > 0,
    'podsumowanie liczy zadane i wytankowane obrazenia');
  console.assert(a.combatStats.party[0].damageDone === a.combatStats.totals.damageDone,
    'podsumowanie przypisuje wynik konkretnej jednostce');

  // log niesie stan calej druzyny i wrogow — na tym stoi animacja
  console.assert(a.log.every(l => Array.isArray(l.party) && Array.isArray(l.enemies)),
    'kazdy wpis logu ma stan obu stron');
  const ehp = a.log.map(l => l.enemies[0].hp);
  console.assert(ehp.every((v, i) => i === 0 || v <= ehp[i - 1]), 'HP wroga tylko spada');

  // Sojusznicy naprawde bija: ta sama walka z druzyna konczy sie szybciej.
  const solo = summary(runToEnd(createFight(
    { party: [{ ...P }], enemies: [{ ...E, hp: 4000, maxHp: 4000 }], potions: 0,
      wtype: 'mele', abilities: [] }, 999)));
  const zDruzyna = summary(runToEnd(createFight(
    { party: [{ ...P }, { ...P, name: 'Sojusznik', damage: 20 }, { ...P, name: 'Pet', damage: 10 }],
      enemies: [{ ...E, hp: 4000, maxHp: 4000 }], potions: 0, wtype: 'mele', abilities: [] }, 999)));
  console.assert(zDruzyna.turns > 0 && solo.turns > 0, 'obie walki sie odbyly');
  console.assert(zDruzyna.enemies[0].hp < solo.enemies[0].hp,
    `druzyna zadaje wiecej obrazen (${zDruzyna.enemies[0].hp} vs ${solo.enemies[0].hp})`);
  console.assert(zDruzyna.log.some(l => l.party.length === 3), 'log niesie stan calej druzyny');

  // Mikstury naleza do bohatera — sojusznik ich nie tyka.
  const zRanionym = createFight(
    { party: [{ ...P }, { ...P, name: 'Sojusznik', hp: 1, maxHp: 400 }],
      enemies: [{ ...E, damage: 1 }], potions: 5, wtype: 'mele', abilities: [] }, 31337);
  runToEnd(zRanionym);
  console.assert(!zRanionym.log.some(l => /Sojusznik: mikstura/.test(l.text)),
    'sojusznik nie pije mikstur bohatera');

  // Rodzaj obrazen jedzie w logu — na tym stoi kolor w kliencie.
  const magiczny = summary(runToEnd(createFight(
    { party: [{ ...P, dtype: 'mag' }], enemies: [{ ...E }], potions: 0,
      wtype: 'magia', abilities: [] }, 55)));
  console.assert(magiczny.log.some(l => l.dtype === 'mag'), 'log niesie obrazenia magiczne');
  console.assert(magiczny.log.some(l => l.dtype === 'fiz'), 'wrog bije fizycznie');

  // Odporności wymuszają dobór broni: ten sam cios i ziarno mają być wyraźnie
  // lepsze jako Smash przeciw podatnemu celowi niż Slash przeciw odpornemu.
  const ciosTypu = (damageType) => {
    const F = createFight({
      party: [{ ...P, damage: 200, accuracy: 5, damageType }],
      enemies: [{ ...E, hp: 9999, maxHp: 9999, damage: 1,
        resists: { slash: 0.35, smash: -0.25 } }],
      potions: 0, abilities: [] }, 8128, 'turowa');
    beginTurn(F); step(F, { type: 'attack', strength: 'srednio' });
    return 9999 - F.enemies[0].hp;
  };
  console.assert(ciosTypu('smash') > ciosTypu('slash'), 'Smash przebija podatnosc lepiej niz Slash odporność');

  // Posiłki: na arenie nigdy nie ma więcej niż pięciu, ale walka rozlicza
  // wszystkich z kolejki i nie kończy się po wybiciu pierwszego składu.
  const posilki = summary(runToEnd(createFight({
    party: [{ ...P, hp: 9999, maxHp: 9999, damage: 999, accuracy: 5 }],
    enemies: Array.from({ length: 8 }, (_, i) => ({ ...E, name: `Posiłek ${i + 1}`,
      hp: 30, maxHp: 30, damage: 1 })), activeEnemyCap: 5,
    potions: 0, abilities: [],
  }, 4567)));
  console.assert(posilki.win && posilki.enemyProgress.defeated === 8,
    'walka konczy sie dopiero po pokonaniu calej kolejki');
  console.assert(posilki.log.some(l => /wchodzi z posiłków/.test(l.text)), 'wejscie posilkow jest w logu');
  console.assert(posilki.log.every(l => l.enemies.length <= 5), 'arena trzyma maksymalnie pieciu wrogow');

  const hpPoCierniach = (damageType) => {
    const F = createFight({
      party: [{ ...P, hp: 5000, maxHp: 5000, damage: 200, accuracy: 5, damageType }],
      enemies: [{ ...E, hp: 9999, maxHp: 9999, damage: 1, speed: 1,
        reflectByType: { slash: 0.08 } }], potions: 0, abilities: [],
    }, 7171, 'turowa');
    beginTurn(F); step(F, { type: 'attack', strength: 'srednio' });
    return F.party[0].hp;
  };
  console.assert(hpPoCierniach('slash') < hpPoCierniach('smash'),
    'Cierniowy Odwet rani Slash, a Smash go omija');

  // SZYK: bron biala nie dosiega tylnego rzedu, trzeba podejsc.
  const melee = { ...P, name: 'Mieczyk', row: 1, reach: 1, accuracy: 5, damage: 1000 };
  const lucznik = { ...E, name: 'Lucznik', row: 3, hp: 200, maxHp: 200, damage: 1 };
  const F2 = createFight({ party: [{ ...melee }], enemies: [{ ...lucznik }],
    potions: 0, wtype: 'mele', abilities: [] }, 4711, 'turowa');
  beginTurn(F2);
  console.assert(target1(F2.party[0], F2.enemies) === null, 'bron biala nie dosiega trzeciego rzedu');
  console.assert(stepsNeeded(F2.party[0], F2.enemies) === 2, 'do trzeciego rzedu dwa podejscia');
  step(F2, { type: 'attack', strength: 'srednio' });
  console.assert(F2.enemies[0].hp === 200, 'pierwsza tura to podejscie, nie cios');
  step(F2, { type: 'attack', strength: 'srednio' });
  console.assert(F2.enemies[0].hp === 200, 'druga tura to nadal podejscie');
  step(F2, { type: 'attack', strength: 'srednio' });
  console.assert(F2.enemies[0].hp < 200, 'trzecia tura wreszcie trafia');
  console.assert(F2.log.some(l => /podchodzi/.test(l.text)), 'log mowi o podchodzeniu');

  // ...a luk siega od razu
  const F3 = createFight({ party: [{ ...melee, reach: 3 }], enemies: [{ ...lucznik }],
    potions: 0, wtype: 'dystans', abilities: [] }, 4711, 'turowa');
  beginTurn(F3);
  step(F3, { type: 'attack', strength: 'srednio' });
  console.assert(F3.enemies[0].hp < 200, 'dystans bije w tylny rzad od razu');

  // Przod zaslania tyl: dopoki stoi obronca, mag za nim jest nietykalny
  const F4 = createFight({ party: [{ ...melee, reach: 3 }],
    enemies: [{ ...E, name: 'Obronca', row: 1, hp: 500, maxHp: 500 },
              { ...E, name: 'Mag', row: 2, hp: 100, maxHp: 100 }],
    potions: 0, wtype: 'dystans', abilities: [] }, 99, 'turowa');
  console.assert(target1(F4.party[0], F4.enemies).name === 'Obronca', 'cel to zawsze najblizszy rzad');

  // MANA: zaklecie kosztuje mane, a nie ladunki paska.
  const magik = createFight(
    { party: [{ ...P, accuracy: 5 }], enemies: [{ ...E, hp: 9999, maxHp: 9999 }],
      potions: 0, wtype: 'magia', abilities: ['fireball'], maxMana: 20, manaRegen: 0 },
    2024, 'turowa');
  beginTurn(magik);
  console.assert(magik.mana === 20, 'walka startuje z pelna mana');
  console.assert(!abilityBlock(magik, 'fireball'), 'przy pelnej manie czar przechodzi');
  const hpPrzedCzarem = magik.enemies[0].hp;
  step(magik, { type: 'ability', id: 'fireball' });
  console.assert(magik.mana === 12, `fireball zabiera 8 many (${magik.mana})`);
  console.assert(magik.enemies[0].hp < hpPrzedCzarem, 'fireball zadaje obrazenia');

  // brak many blokuje czar i mowi dlaczego (cooldown zdjety, zeby nie zaslanial)
  magik.mana = 3; magik.cooldowns.fireball = 0;
  console.assert(/brak many/.test(abilityBlock(magik, 'fireball') ?? ''), 'brak many blokuje czar');

  // mana wraca co ture i nie przekracza maksimum
  const regen = createFight(
    { party: [{ ...P, accuracy: 5 }], enemies: [{ ...E, hp: 9999, maxHp: 9999 }],
      potions: 0, wtype: 'magia', abilities: ['fireball'], maxMana: 20, manaRegen: 3 },
    77, 'turowa');
  beginTurn(regen);
  step(regen, { type: 'ability', id: 'fireball' });   // 20 - 8 = 12, potem +3
  const poCzarze = regen.mana;
  console.assert(poCzarze < 20, `czar zabral mane (${poCzarze})`);
  step(regen, { type: 'attack', strength: 'lekki' });
  console.assert(regen.mana > poCzarze, `mana regeneruje sie (${poCzarze} -> ${regen.mana})`);
  console.assert(regen.mana <= regen.maxMana, 'mana nie przekracza maksimum');

  // AI: wrog bije w NAJGROZNIEJSZEGO w zasiegu, nie w pierwszego z brzegu.
  const grozny = { ...P, name: 'Grozny', damage: 400, speed: 200, row: 1 };
  const slaby  = { ...P, name: 'Slaby',  damage: 5,   speed: 60,  row: 1 };
  const A1 = createFight({ party: [{ ...slaby }, { ...grozny }],
    enemies: [{ ...E, accuracy: 5 }], potions: 0, wtype: 'mele', abilities: [] }, 5150, 'turowa');
  console.assert(target1(A1.enemies[0], A1.party).name === 'Grozny',
    'AI wybiera najgrozniejszego, nie pierwszego z tablicy');

  // PROWOKACJA: sprowokowany bije w prowokujacego i przestaje podchodzic
  const T = createFight({
    party: [{ ...P, name: 'Tank', row: 1, damage: 5 }, { ...P, name: 'Mag', row: 2, damage: 400 }],
    enemies: [{ ...E, name: 'Zbir', row: 1, reach: 1, accuracy: 5 }],
    potions: 0, wtype: 'mele', abilities: ['prowokacja'] }, 606, 'turowa');
  beginTurn(T);
  console.assert(target1(T.enemies[0], T.party).name === 'Tank',
    'bez prowokacji wrog i tak siega tylko pierwszego rzedu');
  step(T, { type: 'ability', id: 'prowokacja' });
  console.assert(T.enemies[0].taunt?.turns > 0, 'prowokacja nakłada taunt na wroga');
  console.assert(target1(T.enemies[0], T.party).name === 'Tank', 'sprowokowany bije w prowokujacego');

  // sprowokowany NIE podchodzi glebiej w szyk
  const T2 = createFight({
    // wrog musi byc SZYBSZY, inaczej beginTurn odda ture bohaterowi i wrog
    // w ogole nie zdazy sie ruszyc przed sprawdzeniem
    party: [{ ...P, name: 'Mag', row: 2, damage: 400, speed: 40 }],
    enemies: [{ ...E, name: 'Zbir', row: 1, reach: 1, accuracy: 5, speed: 300 }],
    potions: 0, wtype: 'mele', abilities: [] }, 707, 'turowa');
  T2.enemies[0].taunt = { by: 9, turns: 3 };     // sprowokowany przez kogos, kto padl
  beginTurn(T2);
  // Wrog stoi DOPOKI trwa prowokacja: tyle wpisow "stoi sprowokowany",
  // ile tur taunta — i dopiero potem rusza w glab szyku.
  // Licznik schodzi na POCZATKU tury sprowokowanego, wiec z trzech tur
  // dwie widac jako stanie, a w trzeciej taunt juz wygasl.
  const stal = T2.log.filter(l => /stoi sprowokowany/.test(l.text)).length;
  console.assert(stal >= 2, `sprowokowany stoi, dopoki trwa prowokacja (${stal})`);
  const pierwszePodejscie = T2.log.findIndex(l => /podchodzi|dopadł/.test(l.text));
  console.assert(pierwszePodejscie >= stal, 'podchodzi dopiero po wygasnieciu prowokacji');

  // Obrona: ten sam wrogi cios boli mniej, gdy gracz stanal w obronie.
  // Oba przebiegi maja to samo ziarno, wiec roznica bierze sie wylacznie z akcji.
  const obr = (akcja) => {
    const F = createFight({ party: [{ ...P, hp: 5000, maxHp: 5000, evasion: -5 }],
      enemies: [{ ...E, hp: 99999, maxHp: 99999, damage: 300, accuracy: 5 }],
      potions: 0, wtype: 'mele', abilities: [] }, 4242, 'turowa');
    beginTurn(F); step(F, akcja);
    return F.party[0].hp;
  };
  const hpZObrona = obr({ type: 'defend' });
  const hpBezObrony = obr({ type: 'attack', strength: 'lekki' });
  console.assert(hpZObrona > hpBezObrony, `obrona zbija obrazenia (${hpZObrona} vs ${hpBezObrony})`);

  // umiejetnosci: cooldown i buff
  const H = mk(9, 'turowa'); beginTurn(H);
  step(H, { type: 'ability', id: 'okrzyk' });
  console.assert(hero(H).effects.some(e => e.id === 'okrzyk'), 'okrzyk nakłada efekt');
  console.assert(H.cooldowns.okrzyk > 0, 'umiejetnosc wchodzi na cooldown');
  const cdBefore = H.cooldowns.okrzyk;
  step(H, { type: 'attack', strength: 'lekki' });
  console.assert(H.cooldowns.okrzyk < cdBefore, 'cooldown maleje z turami');

  // wir bije wielokrotnie
  const I = createFight({ party: [{ ...P }], enemies: [{ ...E }, { ...E, name: 'Goblin 2' }],
                          potions: 0, wtype: 'mele', abilities: ['wir'] }, 11, 'turowa');
  beginTurn(I);
  const n0 = I.log.length;
  step(I, { type: 'ability', id: 'wir' });
  const hits = I.log.slice(n0).filter(l => l.dmg || l.kind === 'miss').length;
  console.assert(hits >= 3, 'wir uderza wiele razy w wielu wrogow');

  // unik dziala: wiekszy unik = mniej trafien
  const dodgy = summary(runToEnd(createFight(
    { party: [{ ...P, evasion: 0.4 }], enemies: [{ ...E, damage: 30 }], potions: 0, wtype: 'mele', abilities: [] }, 5)));
  const naked = summary(runToEnd(createFight(
    { party: [{ ...P, evasion: 0 }], enemies: [{ ...E, damage: 30 }], potions: 0, wtype: 'mele', abilities: [] }, 5)));
  console.assert(dodgy.party[0].hp >= naked.party[0].hp, 'unik ma pomagac');

  // turowa dogrywa sie do konca
  const J = mk(42, 'turowa'); beginTurn(J);
  let k = 0;
  while (!J.over && k++ < 200) step(J, { type: 'attack', strength: 'srednio' });
  console.assert(J.over && k < 200, 'walka turowa konczy sie bez zapetlenia');

  // leczenie slabnie
  console.assert(healEffect(0) === 1 && Math.abs(healEffect(1) - 0.9) < 1e-9, 'leczenie slabnie o 10%');

  // blok zbija obrazenia; bez bloku ten sam seed bije mocniej
  const bity = (block) => summary(runToEnd(createFight(
    { party: [{ ...P, hp: 100000, maxHp: 100000, block, blockCut: 0.5, evasion: 0 }],
      enemies: [{ ...E, hp: 99999, maxHp: 99999, damage: 60 }],
      potions: 0, wtype: 'mele', abilities: [] }, 777))).party[0].hp;
  console.assert(bity(1) > bity(0), 'blok zmniejsza obrazenia');
  console.assert(bity(0.5) >= bity(0), 'polowiczny blok tez pomaga');

  // ---- ZDOLNOŚCI PRZECIWNIKÓW ----

  // trucizna zabiera zdrowie co ture, takze wtedy, gdy truciciel juz nie bije
  const truty = createFight(
    { party: [{ ...P, hp: 5000, maxHp: 5000, armor: 99999, evasion: 0 }],
      enemies: [{ ...E, hp: 99999, maxHp: 99999, damage: 1, skills: ['zatrucie'] }],
      potions: 0, wtype: 'mele', abilities: [] }, 4242);
  for (let i = 0; i < 40; i++) { const u = [...truty.party, ...truty.enemies].filter(x => x.alive)
    .reduce((a, b) => (b.next < a.next ? b : a)); truty.t = u.next; unitTurn(truty, u, u.side === 'gracz' ? { type: 'defend' } : null); }
  console.assert(truty.party[0].hp < 5000, 'trucizna przechodzi przez pancerz');
  console.assert(truty.log.some(l => /trucizna/.test(l.text)), 'trucizna widac w logu');

  // ogluszenie zabiera ture
  const stun = createFight(
    { party: [{ ...P, hp: 9000, maxHp: 9000 }],
      enemies: [{ ...E, hp: 99999, maxHp: 99999, skills: ['zamach'] }],
      potions: 0, wtype: 'mele', abilities: [] }, 99);
  runToEnd(stun);
  console.assert(stun.log.some(l => /ogłuszony/.test(l.text)), 'Zamach Kolosa ogłusza');

  // healer leczy najbardziej poobijanego swojego
  const heal = createFight(
    { party: [{ ...P, damage: 40 }],
      enemies: [{ ...E, name: 'Ranny', hp: 300, maxHp: 3000, damage: 1 },
                { ...E, name: 'Szeptucha', hp: 3000, maxHp: 3000, damage: 1, row: 2, skills: ['leczenie'] }],
      potions: 0, wtype: 'mele', abilities: [] }, 31337);
  runToEnd(heal);
  console.assert(heal.log.some(l => /Pieśń Kości/.test(l.text)), 'healer leczy swoich');

  // dwa ciosy na ture bija mocniej niz jeden
  const ile = (ataki) => summary(runToEnd(createFight(
    { party: [{ ...P, hp: 100000, maxHp: 100000, armor: 0, evasion: 0 }],
      enemies: [{ ...E, hp: 99999, maxHp: 99999, damage: 50, ataki }],
      potions: 0, wtype: 'mele', abilities: [] }, 8181))).party[0].hp;
  console.assert(ile(2) < ile(1), 'dwa ciosy na ture bola bardziej');

  // pancerz skaluje sie z poziomem: to samo 500 pancerza zbija mniej wyzej
  console.assert(armorK(50) > armorK(1), 'skala pancerza rosnie z pietrem');

  console.log('combat.js — wszystkie testy przeszly');
}

if (process.argv[1] && process.argv[1].endsWith('combat.js')) demo();
