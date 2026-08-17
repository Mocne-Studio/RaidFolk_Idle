// Generowanie treści: akty, piętra, przeciwnicy, przedmioty.
// Wszystko deterministyczne z ziarna tam, gdzie to możliwe — ten sam serwer, ten sam świat.

import CONFIG from './config.js';

const C = CONFIG;

// ---------------------------------------------------------------- losowość

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rint = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

function weightedPick(rng, weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
  return entries[0][0];
}

// ---------------------------------------------------------------- akty

export const ACTS = [
  { id: 1, name: 'Rozstaje Cierni',          families: ['Goblin', 'Szczur'],        skladnik: 'Cierniowy Korzeń' },
  { id: 2, name: 'Mokradła Szeptu',          families: ['Topielec', 'Pijawka'],     skladnik: 'Szeptany Muł' },
  { id: 3, name: 'Kopalnia Zgniłego Kamienia', families: ['Konstrukt', 'Nietoperz'], skladnik: 'Rdzawy Odłamek' },
  { id: 4, name: 'Wąwóz Popiołu',            families: ['Ogr', 'Pomiot'],           skladnik: 'Popiół Wąwozu' },
  { id: 5, name: 'Zapadła Kaplica',          families: ['Kultysta', 'Upiór'],       skladnik: 'Zwęglona Relikwia' },
];

const GENERIC = { name: 'Bezimienne Piętra', families: ['Cień', 'Pełzacz', 'Zjawa'], skladnik: 'Odłamek Pustki' };

export function actForFloor(floor) {
  const idx = Math.floor((floor - 1) / C.tower.floorsPerAct);
  return ACTS[idx] ?? { ...GENERIC, id: idx + 1 };
}

const BOSS_NAMES = [
  'Gruk Rzeźnik', 'Matka Mgieł', 'Kamienny Wół', 'Pan Wąwozu', 'Strażnik Popiołu',
  'Przędąca Matka', 'Wij Otchłani', 'Bezimienny Herold', 'Żelazny Bastion', 'Skarbnik Głębi',
];

// ---------------------------------------------------------------- piętra

export function floorInfo(floor) {
  const act = actForFloor(floor);
  const rng = mulberry32(floor * 7919 + 13);
  const isBoss = floor % C.tower.bossEvery === 0;
  const isPlus = !isBoss && floor % C.tower.plusEvery === 0;
  const fights = rint(rng, C.tower.fightsPerFloorMin, C.tower.fightsPerFloorMax);
  return {
    floor, act: act.id, actName: act.name, isBoss, isPlus,
    fights: isBoss ? 1 : fights,
    bossName: isBoss ? BOSS_NAMES[(Math.floor(floor / 10) - 1) % BOSS_NAMES.length] : null,
  };
}

// Jaki wariant ma dana walka na piętrze: co 5. walka jest "+"
function fightVariant(info, fightIdx) {
  if (info.isBoss) return 'boss';
  if (info.isPlus) return 'plus';
  return fightIdx > 0 && (fightIdx + 1) % 5 === 0 ? 'plus' : 'normal';
}

export function makeEnemy(floor, fightIdx) {
  const info = floorInfo(floor);
  const act = actForFloor(floor);
  const variant = fightVariant(info, fightIdx);
  const rng = mulberry32(floor * 104729 + fightIdx * 1327 + 7);
  const t = C.tower;

  const g = Math.pow(t.mobHpGrowth, floor);
  let hp    = (t.mobHpBase + t.mobHpPerFloor * floor) * g;
  let dmg   = (t.mobDmgBase + t.mobDmgPerFloor * floor) * Math.pow(t.mobDmgGrowth, floor);
  let speed = t.mobSpeedBase + t.mobSpeedPerFloor * floor;

  let name = `${pick(rng, act.families)}`;
  if (variant === 'plus') { hp *= t.plusStatMult; dmg *= t.plusStatMult; name += ' +'; }
  if (variant === 'boss') { hp *= t.bossHpMult;   dmg *= t.bossStatMult; speed += 10; name = info.bossName; }

  return {
    name, variant, level: floor,
    hp: Math.round(hp), maxHp: Math.round(hp),
    damage: Math.round(dmg), speed: Math.round(speed),
    armor: Math.round(floor * 3.2),
    gold: Math.round((t.goldBase + t.goldPerFloor * floor) * (variant === 'boss' ? 8 : variant === 'plus' ? 2 : 1)),
  };
}

// ---------------------------------------------------------------- przedmioty

// Bronie mają typ — od niego zależy, który skill je bramkuje i który rośnie.
// Bez tego mag nigdy nie znajdzie różdżki, a łucznik łuku.
export const WEAPON_TYPES = {
  mele:    { skill: 'atak',        names: ['Ostrze', 'Topór', 'Młot', 'Kieł', 'Pazur', 'Rozłupywacz', 'Sierp'] },
  dystans: { skill: 'dystansowy',  names: ['Łuk', 'Kusza', 'Proca', 'Oszczep', 'Krótki Łuk'] },
  magia:   { skill: 'magia',       names: ['Różdżka', 'Kostur', 'Berło', 'Zwój', 'Kryształ'] },
};

const NAMES = {
  bron:       null,   // z WEAPON_TYPES
  offhand:    ['Puklerz', 'Tarcza', 'Orb', 'Kastet', 'Sztylet'],
  helm:       ['Hełm', 'Kaptur', 'Diadem', 'Maska'],
  napiersnik: ['Napierśnik', 'Kolczuga', 'Kirys', 'Płaszcz'],
  spodnie:    ['Nogawice', 'Spodnie', 'Nabiodrki'],
  buty:       ['Buty', 'Trzewiki', 'Sandały'],
  rekawice:   ['Rękawice', 'Karwasze', 'Naręczaki'],
  pas:        ['Pas', 'Przepaska', 'Bandolier'],
  pierscien:  ['Pierścień', 'Sygnet', 'Obrączka'],
  amulet:     ['Amulet', 'Naszyjnik', 'Talizman'],
};

const EPITHETS = [
  'Cierni', 'Zmierzchu', 'Popiołu', 'Głębi', 'Wichru', 'Krwi', 'Mgły', 'Kamienia',
  'Furii', 'Milczenia', 'Otchłani', 'Świtu', 'Rdzy', 'Pustki', 'Grzmotu', 'Szeptu',
];

export function rollItem(rng, { ilvl, weights, slot = null }) {
  const s = slot ?? weightedPick(rng, C.loot.slotWeights);
  const def = C.gear.slots[s];
  const rarity = weightedPick(rng, weights);
  const rar = C.rarities[rarity];
  const spread = C.loot.ilvlSpread;
  const itemIlvl = Math.max(1, ilvl + rint(rng, spread[0], spread[1]));

  let baseName, wtype = null;
  if (s === 'bron') {
    wtype = pick(rng, Object.keys(WEAPON_TYPES));
    baseName = pick(rng, WEAPON_TYPES[wtype].names);
  } else {
    baseName = pick(rng, NAMES[s]);
    if (s === 'offhand') wtype = /puklerz|tarcza/i.test(baseName) ? 'tarcza' : 'inne';
  }

  const item = {
    id: null,
    slot: s, wtype,
    name: `${baseName} ${pick(rng, EPITHETS)}`,
    rarity, ilvl: itemIlvl, plus: 0, energy: 0,
    reqLevel: itemIlvl,
    reqSkill: Math.max(1, Math.floor(itemIlvl * C.gear.skillGateRatio)),
    damage: 0, armor: 0,
    affixes: [],
  };

  if (def.base === 'damage' || def.base === 'mixed') {
    item.damage = Math.round((C.gear.weaponDamageBase + C.gear.weaponDamagePerIlvl * itemIlvl) * def.mult * rar.mult);
  }
  if (def.base === 'armor' || def.base === 'mixed') {
    item.armor = Math.round((C.gear.armorBase + C.gear.armorPerIlvl * itemIlvl) * def.mult * rar.mult);
  }

  const used = new Set();
  for (let i = 0; i < rar.affixes; i++) {
    let a, guard = 0;
    do { a = pick(rng, C.affixes.pool); } while (used.has(a.id) && guard++ < 20);
    used.add(a.id);
    const base = rint(rng, a.min, a.max);
    const val = Math.max(1, Math.round(base + a.perIlvl * itemIlvl));
    item.affixes.push({ id: a.id, label: a.label, value: val, pct: !!a.pct });
  }

  return item;
}

export function rollDrops(seed, { floor, variant }) {
  const rng = mulberry32(seed);
  const weights =
    variant === 'boss' ? C.loot.weightsBoss :
    variant === 'plus' ? C.loot.weightsPlus : C.loot.weightsNormal;

  const out = [];
  if (variant === 'boss') {
    const n = rint(rng, C.loot.bossDropCount[0], C.loot.bossDropCount[1]);
    for (let i = 0; i < n; i++) out.push(rollItem(rng, { ilvl: floor, weights }));
    // skrzynia: od najgorszego do najlepszego
    const order = Object.keys(C.rarities);
    out.sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
  } else if (rng() < C.loot.dropChance) {
    out.push(rollItem(rng, { ilvl: floor, weights }));
  }
  return out;
}

// ---------------------------------------------------------------- statystyki przedmiotu

export function itemStatSummary(item) {
  const s = { sila: 0, intelekt: 0, zrecznosc: 0, wytrzymalosc: 0,
              dmgFlat: 0, hpFlat: 0, armorFlat: 0, critChance: 0, critPower: 0,
              speed: 0, accuracy: 0, evasion: 0 };
  for (const a of item.affixes ?? []) {
    if (a.id === 'wszystkie') {
      s.sila += a.value; s.intelekt += a.value; s.zrecznosc += a.value; s.wytrzymalosc += a.value;
    } else if (a.id in s) {
      s[a.id] += a.value;
    }
  }
  s.dmgFlat += item.damage ?? 0;
  s.armorFlat += item.armor ?? 0;
  return s;
}
