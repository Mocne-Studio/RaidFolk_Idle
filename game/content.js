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

// Klasa przeciwnika decyduje o jego rzędzie w szyku, tak samo jak u sojuszników.
// Goblin z procą stoi z tyłu i trzeba do niego podejść — na tym stoi cała
// mechanika szyku.
export const FAMILY_CLASS = {
  'Leśny Szlam': 'wojownik',
  'Goblin': 'lowca',
  'Leśny Wilk': 'tancerz',
  'Strażnik Puszczy': 'paladyn',
};

export const ACTS = [
  // Akt 1 to biom Puszcza — pierwsze dziesięć pięter i jedyny akt, który ma
  // dopracowaną obsadę pod bestiariusz. Reszta czeka na swoją kolej.
  { id: 1, name: 'Puszcza',                  families: ['Leśny Szlam', 'Goblin', 'Leśny Wilk'], skladnik: 'Cierniowy Korzeń' },
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
  'Strażnik Puszczy', 'Matka Mgieł', 'Kamienny Wół', 'Pan Wąwozu', 'Strażnik Popiołu',
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

  // family to klucz bestiariusza — nazwa bez dopisku wariantu, żeby Goblin
  // i Goblin + liczyły się jako ten sam wpis.
  let family = pick(rng, act.families);
  let name = family;
  if (variant === 'plus') { hp *= t.plusStatMult; dmg *= t.plusStatMult; name += ' +'; }
  if (variant === 'boss') { hp *= t.bossHpMult;   dmg *= t.bossStatMult; speed += 10; family = info.bossName; name = family; }

  const klasa = FAMILY_CLASS[family] ?? 'wojownik';
  const row = C.formation.rows[klasa] ?? 1;

  return {
    name, family, variant, level: floor,
    klasa, row,
    // Tylni przeciwnicy biją z dystansu, przednie wręcz — tak samo jak u gracza.
    reach: row === 1 ? C.formation.reach.mele : C.formation.maxRow,
    dtype: klasa === 'mag' ? 'mag' : 'fiz',
    hp: Math.round(hp), maxHp: Math.round(hp),
    damage: Math.round(dmg), speed: Math.round(speed),
    armor: Math.round(floor * 3.2),
    gold: Math.round((t.goldBase + t.goldPerFloor * floor) * (variant === 'boss' ? 8 : variant === 'plus' ? 2 : 1)),
  };
}

// ---------------------------------------------------------------- przedmioty

// Bronie mają typ — od niego zależy, który skill je bramkuje i który rośnie.
// Bez tego mag nigdy nie znajdzie różdżki, a łucznik łuku.
// Bronie mają typ i LICZBĘ RĄK. Dwuręczna bije mocniej, ale blokuje drugą rękę:
// nie ma tarczy, nie ma drugiego ostrza. Za to cały exp idzie w jeden skill.
// [nazwa, ręce]
export const WEAPON_TYPES = {
  mele:    { skill: 'melee',   names: [
    ['Ostrze', 1], ['Kieł', 1], ['Pazur', 1], ['Sierp', 1], ['Puginał', 1],
    ['Topór', 2], ['Młot', 2], ['Rozłupywacz', 2], ['Glewia', 2]] },
  dystans: { skill: 'dystans', names: [
    ['Krótki Łuk', 1], ['Proca', 1], ['Oszczep', 1], ['Kusza Lekka', 1],
    ['Łuk Długi', 2], ['Kusza Ciężka', 2]] },
  magia:   { skill: 'magia',   names: [
    ['Różdżka', 1], ['Berło', 1], ['Zwój', 1], ['Kryształ', 1],
    ['Kostur', 2], ['Laska', 2]] },
};

// Ile rąk zajmuje przedmiot. Stare zapisy nie mają pola hands — traktujemy je
// jako jednoręczne, żeby nikomu nie wypadła tarcza po aktualizacji.
export const handsOf = (it) => (it?.hands === 2 ? 2 : 1);

const NAMES = {
  bron:       null,   // z WEAPON_TYPES
  offhand:    ['Puklerz', 'Tarcza', 'Orb', 'Kastet', 'Sztylet'],
  helm:       ['Hełm', 'Kaptur', 'Diadem', 'Maska'],
  napiersnik: ['Napierśnik', 'Kolczuga', 'Kirys', 'Płaszcz'],
  buty:       ['Buty', 'Trzewiki', 'Sandały'],
  rekawice:   ['Rękawice', 'Karwasze', 'Naręczaki'],
  pierscien:  ['Pierścień', 'Sygnet', 'Obrączka'],
  amulet:     ['Naszyjnik', 'Amulet', 'Talizman'],
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

  let baseName, wtype = null, hands = 1;
  if (s === 'bron') {
    wtype = pick(rng, Object.keys(WEAPON_TYPES));
    const wpis = pick(rng, WEAPON_TYPES[wtype].names);
    baseName = wpis[0]; hands = wpis[1];
  } else {
    baseName = pick(rng, NAMES[s]);
    if (s === 'offhand') wtype = /puklerz|tarcza/i.test(baseName) ? 'tarcza' : 'inne';
  }

  const item = {
    id: null,
    slot: s, wtype, hands,
    name: `${baseName} ${pick(rng, EPITHETS)}`,
    rarity, ilvl: itemIlvl, plus: 0, energy: 0,
    reqLevel: itemIlvl,
    damage: 0, armor: 0,
    affixes: [],
  };

  if (def.base === 'damage' || def.base === 'mixed') {
    item.damage = Math.round((C.gear.weaponDamageBase + C.gear.weaponDamagePerIlvl * itemIlvl)
      * def.mult * rar.mult * (hands === 2 ? C.combatSkills.twoHandDmg : 1));
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

// Ilu przeciwników staje naraz. Od piętra 3 wychodzą we dwóch — dopiero wtedy
// szyk zaczyna znaczyć, bo jest kogo zasłaniać i do kogo podchodzić.
export function makeEnemies(floor, fightIdx) {
  const pierwszy = makeEnemy(floor, fightIdx);
  if (floor < C.tower.duoFromFloor || pierwszy.variant === 'boss') return [pierwszy];

  // Drugi bierze inne ziarno, żeby nie był kopią pierwszego, i jest słabszy —
  // dwóch pełnych przeciwników podwajało trudność z piętra na piętro.
  const drugi = makeEnemy(floor, fightIdx + 977);
  const m = C.tower.duoStatMult;
  drugi.hp = Math.max(1, Math.round(drugi.hp * m)); drugi.maxHp = drugi.hp;
  drugi.damage = Math.max(1, Math.round(drugi.damage * m));
  drugi.gold = Math.round(drugi.gold * m);
  return [pierwszy, drugi];
}

// ---------------------------------------------------------------- bestiariusz
// Trofea. Nie mają statystyk i nie wchodzą do plecaka — istnieją tylko po to,
// żeby wpis w Kronice miał co odsłaniać. Cztery na przeciwnika, bo tyle mieści
// się w karcie i tyle wystarcza, żeby ostatnie było czuć.
export const FAMILY_DROPS = {
  'Leśny Szlam':      ['Kropla Szlamu', 'Zielony Rdzeń', 'Lepka Błona', 'Serce Kałuży'],
  'Goblin':           ['Zardzewiały Nóż', 'Kieł Goblina', 'Podarta Sakwa', 'Znak Wodza'],
  'Leśny Wilk':       ['Wilcze Futro', 'Złamany Pazur', 'Ślepie Wilka', 'Kieł Wataszki'],
  'Strażnik Puszczy': ['Kora Strażnika', 'Żywiczna Łza', 'Korzeń Odwieczny', 'Serce Puszczy'],
};
const GENERIC_DROPS = ['Strzęp Skóry', 'Wyszczerbiony Ząb', 'Zimny Popiół', 'Nieznany Odłamek'];

export const dropsOf = (family) => FAMILY_DROPS[family] ?? GENERIC_DROPS;

// Szansa na trofeum z jednego zabicia. Boss zawsze coś oddaje — inaczej wpis
// bossa stałby pusty do dziesiątego podejścia.
export function rollTrophy(seed, family, znane = [], variant = 'normal') {
  const rng = mulberry32(seed);
  if (variant !== 'boss' && rng() > 0.35) return null;
  const brak = dropsOf(family).filter(d => !znane.includes(d));
  if (!brak.length) return null;
  return pick(rng, brak);
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
