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
const reduce = (dmg, armor) => dmg * (1 - armor / (armor + C.combat.armorK));

export function healEffect(usesSoFar) {
  const h = C.healing;
  const f = h.decayLinear ? 1 - h.decayPerUse * usesSoFar : Math.pow(1 - h.decayPerUse, usesSoFar);
  return Math.max(h.minEffect, f);
}

export const STRENGTHS = C.combat.strengths;
export const ABILITIES = C.abilities;
export const ULTIMATES = C.ultimates;

export function hitChance(accuracy, strength, evasion = 0) {
  const s = STRENGTHS[strength] ?? STRENGTHS.srednio;
  const raw = accuracy + s.acc - evasion;
  return Math.min(C.combat.accuracyMax, Math.max(C.combat.accuracyMin, raw));
}

// ---------------------------------------------------------------- tworzenie walki

const mkUnit = (u, side, idx) => ({
  side, idx, name: u.name, kind: u.kind ?? 'gracz',
  hp: u.hp, maxHp: u.maxHp,
  damage: u.damage, speed: u.speed, armor: u.armor ?? 0,
  crit: u.crit ?? 0, critMult: u.critMult ?? 1.5,
  accuracy: u.accuracy ?? 0.8, evasion: u.evasion ?? 0,
  next: interval(u.speed),
  effects: [],           // [{ id, turns, dmgMult, armorMult, stun, critTakenMult }]
  alive: true,
});

export function createFight({ party, enemies, potions = 0, wtype = 'mele', abilities = [] }, seed, mode = 'auto') {
  return {
    mode, seed, rng: seed >>> 0, t: 0, turn: 0, wtype,
    party: party.map((u, i) => mkUnit(u, 'gracz', i)),
    enemies: enemies.map((u, i) => mkUnit({ ...u, kind: 'wrog' }, 'wrog', i)),
    potions, potionsStart: potions, healUses: 0,
    charge: 0, chargeMax: C.combat.chargeMax,
    cooldowns: Object.fromEntries(abilities.map(a => [a, 0])),
    abilities,
    log: [], over: false, win: null, awaiting: false,
  };
}

const hero = (F) => F.party[0];
const livingEnemies = (F) => F.enemies.filter(e => e.alive);
const livingParty = (F) => F.party.filter(u => u.alive);

function snapshot(F) {
  return {
    party: F.party.map(u => ({ hp: Math.max(0, u.hp), maxHp: u.maxHp, alive: u.alive })),
    enemies: F.enemies.map(u => ({ hp: Math.max(0, u.hp), maxHp: u.maxHp, alive: u.alive })),
    charge: F.charge,
  };
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

function strike(F, attacker, target, { mult = 1, strength = null, pierce = 0, label = null }) {
  const chance = strength
    ? hitChance(attacker.accuracy, strength, target.evasion)
    : Math.min(C.combat.accuracyMax, Math.max(C.combat.accuracyMin, attacker.accuracy - target.evasion));

  if (rand(F) > chance) {
    push(F, 'miss', `${attacker.name} → ${target.name}: pudło`);
    return 0;
  }

  const critTaken = effMult(target, 'critTakenMult');
  const isCrit = rand(F) < attacker.crit * critTaken;

  let dmg = attacker.damage * effMult(attacker, 'dmgMult') * mult * (0.9 + rand(F) * 0.2);
  if (isCrit) dmg *= attacker.critMult;

  const armor = target.armor * effMult(target, 'armorMult') * (1 - pierce);
  dmg = Math.max(1, Math.round(reduce(dmg, armor)));
  target.hp -= dmg;
  if (target.hp <= 0) { target.hp = 0; target.alive = false; }

  const who = label ? `${attacker.name} · ${label}` : attacker.name;
  push(F, isCrit ? 'crit' : (attacker.side === 'wrog' ? 'enemy' : 'hit'),
       `${who} → ${target.name}: ${dmg}${isCrit ? ' KRYT' : ''}`, { dmg });

  if (!target.alive) push(F, target.side === 'wrog' ? 'kill' : 'down', `${target.name} pada`);
  return dmg;
}

// ---------------------------------------------------------------- akcje gracza

function addCharge(F, n) {
  F.charge = Math.min(F.chargeMax, F.charge + n);
}

function playerBasic(F, u, strength) {
  const target = livingEnemies(F)[0];
  if (!target) return;
  strike(F, u, target, { mult: STRENGTHS[strength].dmg, strength });
  addCharge(F, STRENGTHS[strength].charge);
}

function useAbility(F, u, id) {
  const A = ABILITIES[id];
  if (!A) { push(F, 'info', 'nieznana umiejętność'); return; }
  if ((F.cooldowns[id] ?? 0) > 0) { push(F, 'info', `${A.label}: jeszcze ${F.cooldowns[id]} tur`); return; }

  F.cooldowns[id] = A.cd;
  addCharge(F, A.charge ?? 1);

  if (A.buff) {
    addEffect(u, A.buff);
    push(F, 'buff', `${u.name} · ${A.label}`);
    return;
  }

  const targets = A.target === 'all' ? livingEnemies(F) : [livingEnemies(F)[0]].filter(Boolean);
  if (!targets.length) return;

  const hits = A.hits ?? 1;
  for (let h = 0; h < hits; h++) {
    for (const t of targets) {
      if (!t.alive) continue;
      strike(F, u, t, { mult: A.dmgMult ?? 1, label: A.label });

      if (A.stun && t.alive && rand(F) < A.stun) {
        addEffect(t, { id: 'ogłuszenie', turns: (A.stunTurns ?? 1) + 1, stun: true,
                       critTakenMult: A.stunCritMult ?? 2 });
        push(F, 'buff', `${t.name} ogłuszony`);
      }
    }
  }
}

function useUltimate(F, u) {
  if (F.charge < F.chargeMax) { push(F, 'info', 'pasek jeszcze nie pełny'); return; }
  const U = ULTIMATES[F.wtype] ?? ULTIMATES.mele;
  F.charge = 0;

  const targets = U.target === 'all' ? livingEnemies(F) : [livingEnemies(F)[0]].filter(Boolean);
  const hits = U.hits ?? 1;
  push(F, 'ult', `${u.name} · ${U.label}`);
  for (let h = 0; h < hits; h++) {
    for (const t of targets) {
      if (!t.alive) continue;
      strike(F, u, t, { mult: U.dmgMult, pierce: U.armorPierce ?? 0, label: U.label });
    }
  }
}

function drinkPotion(F, u) {
  if (F.potions <= 0) { push(F, 'info', 'brak mikstur'); return; }
  const eff = healEffect(F.healUses);
  const heal = Math.round(u.maxHp * C.healing.potionHealPct * eff);
  u.hp = Math.min(u.maxHp, u.hp + heal);
  F.potions--; F.healUses++;
  push(F, 'heal', `${u.name}: mikstura +${heal} (×${eff.toFixed(2)})`, { heal });
}

function autoPotion(F, u) {
  if (F.potions <= 0 || u.hp / u.maxHp >= C.healing.autoThreshold) return false;
  drinkPotion(F, u);
  return true;
}

// ---------------------------------------------------------------- tury

function unitTurn(F, u, action) {
  F.turn++;
  tickEffects(u, F);

  if (isStunned(u)) {
    push(F, 'info', `${u.name} jest ogłuszony i traci turę`);
  } else if (u.side === 'wrog') {
    const target = livingParty(F)[0];
    if (target) strike(F, u, target, {});
  } else if (action == null) {
    autoPotion(F, u);
    playerBasic(F, u, 'srednio');
  } else {
    switch (action.type) {
      case 'potion':   drinkPotion(F, u); break;
      case 'ability':  useAbility(F, u, action.id); break;
      case 'ultimate': useUltimate(F, u); break;
      default:         playerBasic(F, u, action.strength ?? 'srednio');
    }
  }

  u.next += interval(u.speed);
  if (u.side === 'gracz' && u.idx === 0) {
    for (const k of Object.keys(F.cooldowns)) if (F.cooldowns[k] > 0) F.cooldowns[k]--;
  }
}

function finish(F) {
  if (F.over) return;
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

// ---------------------------------------------------------------- widok

export function summary(F) {
  return {
    win: !!F.win, over: F.over, awaiting: F.awaiting,
    log: F.log, durationMs: Math.round(F.t), turns: F.turn,
    party: F.party.map(u => ({ name: u.name, kind: u.kind, hp: Math.max(0, u.hp), maxHp: u.maxHp, alive: u.alive })),
    enemies: F.enemies.map(u => ({ name: u.name, hp: Math.max(0, u.hp), maxHp: u.maxHp, alive: u.alive })),
    charge: F.charge, chargeMax: F.chargeMax,
    cooldowns: F.cooldowns,
    potionsLeft: F.potions, potionsUsed: F.potionsStart - F.potions,
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

  // log niesie stan calej druzyny i wrogow — na tym stoi animacja
  console.assert(a.log.every(l => Array.isArray(l.party) && Array.isArray(l.enemies)),
    'kazdy wpis logu ma stan obu stron');
  const ehp = a.log.map(l => l.enemies[0].hp);
  console.assert(ehp.every((v, i) => i === 0 || v <= ehp[i - 1]), 'HP wroga tylko spada');

  // pasek ultimate: lekki 1, sredni 2, mocny 3
  console.assert(STRENGTHS.lekki.charge === 1 && STRENGTHS.srednio.charge === 2
    && STRENGTHS.mocno.charge === 3, 'ladowanie paska wg sily ciosu');

  const F = mk(7, 'turowa'); beginTurn(F);
  console.assert(F.charge === 0, 'pasek startuje pusty');
  step(F, { type: 'attack', strength: 'mocno' });
  console.assert(F.charge === 3, 'mocny cios laduje 3');
  step(F, { type: 'attack', strength: 'lekki' });
  console.assert(F.charge === 4, 'lekki cios laduje 1');

  // ultimate wymaga pelnego paska
  const G = mk(8, 'turowa'); beginTurn(G);
  const before = G.log.length;
  step(G, { type: 'ultimate' });
  console.assert(G.log.slice(before).some(l => l.text.includes('pasek')), 'ultimate blokowany przy pustym pasku');
  G.charge = G.chargeMax;
  const b2 = G.log.length;
  step(G, { type: 'ultimate' });
  console.assert(G.log.slice(b2).some(l => l.kind === 'ult'), 'ultimate idzie przy pelnym pasku');
  console.assert(G.charge === 0, 'ultimate zeruje pasek');

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

  console.log('combat.js — wszystkie testy przeszly');
}

if (process.argv[1] && process.argv[1].endsWith('combat.js')) demo();
