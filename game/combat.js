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
  // blok: szansa, że cios zostanie przyjęty tarczą. Bez tarczy jest zerowa,
  // więc tarcza ma wreszcie własną roblotę, a nie tylko kawałek pancerza.
  block: u.block ?? 0, blockCut: u.blockCut ?? C.combat.blockCut,
  potionPct: u.potionPct ?? 0,
  // Rodzaj obrażeń: 'fiz' albo 'mag'. Silnik nie liczy z nich niczego — służą
  // wyłącznie do tego, żeby log walki miał kolor i żeby było widać, czym bijesz.
  // Wynikają z typu broni: różdżka i kostur to magia, reszta to fizyczne.
  dtype: u.dtype ?? 'fiz',
  // Szyk. row: 1 przód, 2 środek, 3 tył. reach: do którego rzędu sięga broń.
  // advance rośnie, gdy jednostka podchodzi — każde podejście to jedna tura.
  row: u.row ?? 1,
  reach: u.reach ?? C.formation.maxRow,
  advance: 0,
  klasa: u.klasa ?? null,
  next: interval(u.speed),
  effects: [],           // [{ id, turns, dmgMult, armorMult, stun, critTakenMult }]
  alive: true,
});

export function createFight({ party, enemies, potions = 0, wtype = 'mele', abilities = [],
                              maxMana = 0, manaRegen = 0 }, seed, mode = 'auto') {
  return {
    mode, seed, rng: seed >>> 0, t: 0, turn: 0, wtype,
    // Mana pod zaklęcia. Osobny zasób od paska ultimate: pasek ładuje się
    // biciem, mana wraca sama co turę. Dwa zasoby, dwie osie decyzji.
    mana: maxMana, maxMana, manaRegen,
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

export const target1 = (attacker, pool) => reachable(attacker, pool)[0] ?? null;

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
  const u2 = (u) => ({ name: u.name, hp: Math.max(0, u.hp), maxHp: u.maxHp, alive: u.alive });
  return {
    party: F.party.map(u2),
    enemies: F.enemies.map(u2),
    charge: F.charge,
    mana: F.mana,
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

  // Blok idzie po krytyku i przed pancerzem — zablokowany krytyk boli jak zwykły cios.
  const blocked = target.block > 0 && rand(F) < target.block;
  if (blocked) dmg *= (1 - Math.min(0.9, target.blockCut));

  const armor = target.armor * effMult(target, 'armorMult') * (1 - pierce);
  // takenMult zbija to, co zostało po pancerzu — tak działa Obrona z menu tury.
  dmg = Math.max(1, Math.round(reduce(dmg, armor) * effMult(target, 'takenMult')));
  target.hp -= dmg;
  if (target.hp <= 0) { target.hp = 0; target.alive = false; }

  const who = label ? `${attacker.name} · ${label}` : attacker.name;
  const znak = attacker.dtype === 'mag' ? '✦' : '⚔';
  push(F, isCrit ? 'crit' : (attacker.side === 'wrog' ? 'enemy' : 'hit'),
       `${znak} ${who} → ${target.name}: ${dmg}${isCrit ? ' KRYT' : ''}${blocked ? ' BLOK' : ''}`,
       { dmg, blocked, dtype: attacker.dtype });

  if (!target.alive) push(F, target.side === 'wrog' ? 'kill' : 'down', `${target.name} pada`);
  return dmg;
}

// ---------------------------------------------------------------- akcje gracza

function addCharge(F, n) {
  F.charge = Math.min(F.chargeMax, F.charge + n);
}

// Podejście. Broń biała nie dosięga tylnych rzędów — trzeba stracić turę,
// żeby skrócić dystans. To jest cała cena za bicie wręcz i cały powód,
// dla którego łucznik z tyłu jest wart ochrony.
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
  const dmg = strike(F, u, target, { mult: STRENGTHS[strength].dmg, strength });

  // Pudło zeruje pasek. Dlatego mocny cios to hazard: ładuje 3, ale trafia rzadko,
  // a nieudany zabiera wszystko, co uzbierałeś.
  if (dmg > 0) {
    addCharge(F, STRENGTHS[strength].charge);
  } else if (F.charge > 0) {
    push(F, 'lost', `pasek spada z ${F.charge} do zera`);
    F.charge = 0;
  }
}

// Czy zaklęcie da się w tej chwili rzucić. Powód odmowy wraca tekstem,
// żeby klient nie musiał znać reguł.
export function abilityBlock(F, id) {
  const A = ABILITIES[id];
  if (!A) return 'nieznana umiejętność';
  if ((F.cooldowns?.[id] ?? 0) > 0) return `odnowienie: ${F.cooldowns[id]}`;
  // UWAGA: `charge` przy umiejętności to ile ona ŁADUJE pasek, nie ile kosztuje.
  // Jedynym kosztem jest mana i płacą ją wyłącznie zaklęcia.
  if (A.mana && F.mana < A.mana) return `brak many (${F.mana}/${A.mana})`;
  return null;
}

function useAbility(F, u, id) {
  const A = ABILITIES[id];
  const blok = abilityBlock(F, id);
  if (blok) { push(F, 'info', `${A?.label ?? id}: ${blok}`); return; }

  // Zaklęcia płacą maną, zwykłe umiejętności ładują pasek. Nigdy jedno i drugie.
  if (A.mana) {
    F.mana -= A.mana;
    push(F, 'buff', `${u.name} · ${A.label} (−${A.mana} many)`);
  } else {
    addCharge(F, A.charge ?? 1);
  }
  F.cooldowns[id] = A.cd;

  // Zaklęcia leczące — Fala Chłodu i podobne.
  if (A.heal) {
    const ile = Math.round(u.maxHp * A.heal);
    u.hp = Math.min(u.maxHp, u.hp + ile);
    push(F, 'heal', `${u.name} · ${A.label}: +${ile}`);
  }

  if (A.buff) {
    addEffect(u, A.buff);
    if (!A.mana) push(F, 'buff', `${u.name} · ${A.label}`);
    return;
  }
  if (A.heal) return;

  const targets = A.target === 'all' ? livingEnemies(F) : reachable(u, F.enemies).slice(0, 1);
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

  const targets = U.target === 'all' ? livingEnemies(F) : reachable(u, F.enemies).slice(0, 1);
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
  const heal = Math.round(u.maxHp * C.healing.potionHealPct * eff * (1 + (u.potionPct ?? 0)));
  u.hp = Math.min(u.maxHp, u.hp + heal);
  F.potions--; F.healUses++;
  push(F, 'heal', `${u.name}: mikstura +${heal} (×${eff.toFixed(2)})`, { heal });
}

// Mikstury należą do bohatera. Sojusznik ich nie tyka — inaczej pet wypijałby
// zapas, którego gracz potrzebuje na bossa.
function autoPotion(F, u) {
  if (u.idx !== 0) return false;
  if (F.potions <= 0 || u.hp / u.maxHp >= C.healing.autoThreshold) return false;
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

function unitTurn(F, u, action) {
  F.turn++;
  tickEffects(u, F);

  if (isStunned(u)) {
    push(F, 'info', `${u.name} jest ogłuszony i traci turę`);
  } else if (u.side === 'wrog') {
    const target = target1(u, F.party);
    if (target) strike(F, u, target, {});
    else advance(F, u, F.party);
  } else if (action == null) {
    autoPotion(F, u);
    // Automat rzuca zaklęcie, gdy stać go na najdroższe dostępne — inaczej
    // mana stałaby pełna, a magia byłaby wyłącznie zabawką trybu turowego.
    const czar = u.idx === 0 ? (F.abilities ?? [])
      .filter(id => ABILITIES[id]?.mana && !abilityBlock(F, id))
      .sort((x, y) => ABILITIES[y].mana - ABILITIES[x].mana)[0] : null;
    if (czar) useAbility(F, u, czar);
    else playerBasic(F, u, 'srednio');
  } else {
    switch (action.type) {
      case 'potion':   drinkPotion(F, u); break;
      case 'ability':  useAbility(F, u, action.id); break;
      case 'ultimate': useUltimate(F, u); break;
      case 'defend':   defend(F, u); break;
      default:         playerBasic(F, u, action.strength ?? 'srednio');
    }
  }

  u.next += interval(u.speed);
  if (u.side === 'gracz' && u.idx === 0) {
    for (const k of Object.keys(F.cooldowns)) if (F.cooldowns[k] > 0) F.cooldowns[k]--;
    // Mana wraca sama co Twoją turę — inaczej długa walka kończyłaby się
    // biciem kijem, a magia byłaby jednorazowa.
    if (F.maxMana) F.mana = Math.min(F.maxMana, F.mana + (F.manaRegen ?? 0));
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
    mana: F.mana, maxMana: F.maxMana,
    cooldowns: F.cooldowns,
    // Co da się teraz rzucić i dlaczego nie — klient nie musi znać reguł.
    blokady: Object.fromEntries((F.abilities ?? []).map(id => [id, abilityBlock(F, id)])),
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
  console.assert(magik.charge === 0, 'zaklecie NIE laduje paska ultimate');

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

  // pasek: trafienie laduje, pudlo zeruje
  const P100 = { ...P, accuracy: 5 };      // zawsze trafia
  const P0   = { ...P, accuracy: -5 };     // zawsze pudluje
  const one  = (p, seed) => createFight(
    { party: [{ ...p }], enemies: [{ ...E, hp: 99999, maxHp: 99999 }], potions: 0,
      wtype: 'mele', abilities: [] }, seed, 'turowa');

  const F = one(P100, 7); beginTurn(F);
  console.assert(F.charge === 0, 'pasek startuje pusty');
  step(F, { type: 'attack', strength: 'mocno' });
  console.assert(F.charge === 3, 'mocny cios laduje 3');
  step(F, { type: 'attack', strength: 'lekki' });
  console.assert(F.charge === 4, 'lekki cios laduje 1');
  step(F, { type: 'attack', strength: 'srednio' });
  console.assert(F.charge === 6, 'sredni cios laduje 2');

  const M = one(P0, 11); beginTurn(M);
  M.charge = 8;
  step(M, { type: 'attack', strength: 'mocno' });
  console.assert(M.charge === 0, 'pudlo zeruje caly pasek');
  console.assert(M.log.some(l => l.kind === 'lost'), 'utrata paska trafia do logu');

  // umiejetnosci nie ruszaja paska przy pudle — maja wlasny koszt w cooldownie
  const K = createFight({ party: [{ ...P0 }], enemies: [{ ...E, hp: 99999, maxHp: 99999 }],
                          potions: 0, wtype: 'mele', abilities: ['wir'] }, 13, 'turowa');
  beginTurn(K); K.charge = 5;
  step(K, { type: 'ability', id: 'wir' });
  console.assert(K.charge > 0, 'nieudana umiejetnosc nie kasuje paska');

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

  // blok zbija obrazenia; bez bloku ten sam seed bije mocniej
  const bity = (block) => summary(runToEnd(createFight(
    { party: [{ ...P, hp: 100000, maxHp: 100000, block, blockCut: 0.5, evasion: 0 }],
      enemies: [{ ...E, hp: 99999, maxHp: 99999, damage: 60 }],
      potions: 0, wtype: 'mele', abilities: [] }, 777))).party[0].hp;
  console.assert(bity(1) > bity(0), 'blok zmniejsza obrazenia');
  console.assert(bity(0.5) >= bity(0), 'polowiczny blok tez pomaga');

  console.log('combat.js — wszystkie testy przeszly');
}

if (process.argv[1] && process.argv[1].endsWith('combat.js')) demo();
