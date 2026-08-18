// Generowanie treści: akty, piętra, przeciwnicy, przedmioty.
// Wszystko deterministyczne z ziarna tam, gdzie to możliwe — ten sam serwer, ten sam świat.

import CONFIG from './config.js';
import { attackSpeed } from './combat.js';

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

// Emoji przeciwnika. Brak wpisu → renderer spada do 👹 (mob) albo 👑 (boss).
// Rodziny aktów + generyk + nazwani bossowie, każdy inny.
export const FAMILY_IC = {
  // rodziny aktów
  'Leśny Szlam': '🟢', 'Goblin': '👺', 'Leśny Wilk': '🐺',
  'Topielec': '🧟', 'Pijawka': '🪱',
  'Konstrukt': '⚙️', 'Nietoperz': '🦇',
  'Ogr': '🧌', 'Pomiot': '👿',
  'Kultysta': '🕯️', 'Upiór': '👻',
  // generyk pięter bezimiennych
  'Cień': '🫥', 'Pełzacz': '🕷️', 'Zjawa': '👁️',
  // bossowie
  'Strażnik Puszczy': '🌳', 'Matka Mgieł': '🌫️', 'Kamienny Wół': '🗿',
  'Pan Wąwozu': '🌋', 'Strażnik Popiołu': '🔥', 'Przędąca Matka': '🕸️',
  'Wij Otchłani': '🐛', 'Bezimienny Herold': '📯', 'Żelazny Bastion': '🏰',
  'Skarbnik Głębi': '💰',
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

// Poziom przeciwnika na Wyprawie bierze się z przedziału TEJ WYPRAWY, nie
// z najwyższego piętra gracza. Wzdłuż trasy rośnie od dolnej do górnej granicy:
// pierwszy mob Puszczy ma poziom 1, a jej boss poziom 10. Dzięki temu powrót
// do starego terenu pozostaje powrotem do starego terenu, również na poziomie 200.
export function expeditionEnemyLevel(range, at, total, floorOffset = 0) {
  const lo = Math.max(1, Math.round(Number(range?.[0]) || 1));
  const hi = Math.max(lo, Math.round(Number(range?.[1]) || lo));
  const last = Math.max(1, Math.round(Number(total) || 1) - 1);
  const progress = Math.max(0, Math.min(1, (Number(at) || 0) / last));
  return Math.max(1, Math.round(lo + (hi - lo) * progress) + Math.round(Number(floorOffset) || 0));
}

const BOSS_NAMES = [
  'Strażnik Puszczy', 'Matka Mgieł', 'Kamienny Wół', 'Pan Wąwozu', 'Strażnik Popiołu',
  'Przędąca Matka', 'Wij Otchłani', 'Bezimienny Herold', 'Żelazny Bastion', 'Skarbnik Głębi',
];

// ---------------------------------------------------------------- piętra

export function floorInfo(floor) {
  const act = actForFloor(floor);
  const rng = mulberry32(floor * 7919 + 13);
  const t = C.tower;
  const isBoss = floor % t.bossEvery === 0;
  // Piętra 25, 35, 45... kończą się mini-elitą. Wyprzedzają wariant „+",
  // bo inaczej piętro 25 byłoby jednocześnie jednym i drugim.
  const isElita = !isBoss && floor >= t.elitaFrom && floor % t.elitaEvery === t.elitaFrom % t.elitaEvery;
  const isPlus = !isBoss && !isElita && floor % t.plusEvery === 0;
  const fights = rint(rng, t.fightsPerFloorMin, t.fightsPerFloorMax);
  return {
    floor, act: act.id, actName: act.name, isBoss, isPlus, isElita,
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

// Statystyki ZWYKŁEGO moba z tego piętra, bez żadnych mnożników wariantu.
// Na tym skaluje się świta: elita przy bossie jest mocnym mobem, a nie ułamkiem
// bossa — inaczej podniesienie zdrowia bossa mnożyło całą grupę razem z nim.
export function statyBazowe(floor) {
  const t = C.tower;
  const f2 = floor * floor;
  return {
    hp: (t.mobHpBase + t.mobHpPerFloor * floor + (t.mobHpPerFloor2 ?? 0) * f2) * Math.pow(t.mobHpGrowth, floor),
    damage: (t.mobDmgBase + t.mobDmgPerFloor * floor + (t.mobDmgPerFloor2 ?? 0) * f2) * Math.pow(t.mobDmgGrowth, floor),
    speed: t.mobSpeedBase + t.mobSpeedPerFloor * floor,
    armor: t.mobArmorBase + t.mobArmorPerFloor * floor,
    gold: t.goldBase + t.goldPerFloor * floor,
  };
}

// wariantOverride: wymusza wariant zamiast czytać go z piętra. Używa tego
// świta zwykłej fali — towarzysz NIE MOŻE nosić dopisku „+", bo jest słabszy
// od zwykłego moba. Zmierzone i zgłoszone: „Leśny Szlam +" miał 171 HP,
// a zwykły „Leśny Wilk" 202 — plus obiecywał coś, czego nie było.
// ŁAGODNY START — współczynnik tłumiący statystyki mobów na pierwszych piętrach.
// Rośnie liniowo od `lagodnyMnoznik` do 1,0 i od `lagodnyDoPietra` w górę wynosi
// dokładnie 1, więc późniejsza skala — i wszystkie wystrojone cele balansu —
// zostają nietknięte. Bez tego drugi mób i człon kwadratowy uderzały w gracza,
// który nie miał jeszcze czym oddawać: 0% szans od piętra 3.
export function lagodnyStart(floor) {
  const t = C.tower;
  const doP = t.lagodnyDoPietra ?? 0;
  if (!doP || floor >= doP) return 1;
  const m0 = t.lagodnyMnoznik ?? 1;
  return m0 + (1 - m0) * ((floor - 1) / (doP - 1));
}

export function makeEnemy(floor, fightIdx, wariantOverride = null) {
  const info = floorInfo(floor);
  const act = actForFloor(floor);
  const variant = wariantOverride ?? fightVariant(info, fightIdx);
  const rng = mulberry32(floor * 104729 + fightIdx * 1327 + 7);
  const t = C.tower;

  const g = Math.pow(t.mobHpGrowth, floor);
  const f2 = floor * floor;
  const lag = lagodnyStart(floor);
  let hp    = (t.mobHpBase + t.mobHpPerFloor * floor + (t.mobHpPerFloor2 ?? 0) * f2) * g * lag;
  let dmg   = (t.mobDmgBase + t.mobDmgPerFloor * floor + (t.mobDmgPerFloor2 ?? 0) * f2)
              * Math.pow(t.mobDmgGrowth, floor) * lag;
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
    klasa, row, ic: FAMILY_IC[family] ?? null,
    // Tylni przeciwnicy biją z dystansu, przednie wręcz — tak samo jak u gracza.
    reach: row === 1 ? C.formation.reach.jednoreczna : C.formation.maxRow,
    dtype: klasa === 'mag' ? 'mag' : 'fiz',
    damageType: classDamageType(klasa),
    hp: Math.round(hp), maxHp: Math.round(hp),
    damage: Math.round(dmg), speed: Math.round(speed),
    // TA SAMA SKALA CO U GRACZA — po to jest, żeby dało się porównać wprost.
    attackSpeed: attackSpeed(Math.round(speed)),
    armor: Math.round(t.mobArmorBase + t.mobArmorPerFloor * floor),
    gold: Math.round((t.goldBase + t.goldPerFloor * floor) * (variant === 'boss' ? 8 : variant === 'plus' ? 2 : 1)),
  };
}

// ---------------------------------------------------------------- przedmioty

// Bronie mają typ — od niego zależy, który skill je bramkuje i który rośnie.
// Bez tego mag nigdy nie znajdzie różdżki, a łucznik łuku.
// Bronie mają typ i LICZBĘ RĄK. Dwuręczna bije mocniej, ale blokuje drugą rękę:
// nie ma tarczy, nie ma drugiego ostrza. Za to cały exp idzie w jeden skill.
// [nazwa, ręce]
// RODZINA BRONI = SKILL BOJOWY. `wtype` przedmiotu jest jednocześnie
// identyfikatorem skilla, który rośnie od bicia nim — nie ma drugiej tabeli,
// która mogłaby się rozjechać.
//
// KOSTUR JEST DWURĘCZNY, ALE NALEŻY DO PRZYRZĄDÓW MAGICZNYCH. Dwuręczność
// to liczba rąk, nie rodzina — dlatego kostur nie expi Broni dwuręcznej.
// [nazwa, ręce]
export const WEAPON_TYPES = {
  dwureczna: { skill: 'dwureczna', label: 'Broń dwuręczna', names: [
    ['Topór', 2], ['Młot', 2], ['Miecz Dwuręczny', 2]] },
  jednoreczna: { skill: 'jednoreczna', label: 'Broń jednoręczna', names: [
    ['Miecz', 1], ['Scimitar', 1], ['Sztylet', 1]] },
  magiczne: { skill: 'magiczne', label: 'Przyrządy magiczne', names: [
    ['Różdżka', 1], ['Orb', 1], ['Kostur', 2]] },
  dystansowe: { skill: 'dystansowe', label: 'Broń dystansowa', names: [
    ['Łuk', 2], ['Kusza', 2], ['Oszczep', 1]] },
};

// Stare typy broni z zapisów sprzed podziału. Broń biała rozpada się na dwie
// rodziny po liczbie rąk — dokładnie tak, jak dzieli je nowy skill.
export const STARY_WTYPE = { mele: 'jednoreczna', dystans: 'dystansowe', magia: 'magiczne' };
export function nowyWtype(it) {
  if (!it) return null;
  if (WEAPON_TYPES[it.wtype]) return it.wtype;
  if (it.wtype === 'mele') return handsOf(it) === 2 ? 'dwureczna' : 'jednoreczna';
  return STARY_WTYPE[it.wtype] ?? it.wtype;
}

// Ile rąk zajmuje przedmiot. Stare zapisy nie mają pola hands — traktujemy je
// jako jednoręczne, żeby nikomu nie wypadła tarcza po aktualizacji.
export const handsOf = (it) => (it?.hands === 2 ? 2 : 1);

// Cztery czytelne rodzaje obrażeń. Rodzina skilla nie wystarcza: Młot i Topór
// są dwuręczne, ale pierwszy rozbija pancerz obuchem, a drugi tnie. Nazwa bazy
// rozstrzyga wyjątki, wtype daje bezpieczny fallback starym zapisom.
// TOŻSAMOŚĆ BRONI: każda ma główny typ obrażeń, część ma poboczny (podział %).
// Dzięki temu miecz omija pancerz czysto-cięciowy resztką Przebicia, a nie trzeba
// dokładać nowych typów. Rozpoznawanie po NAZWIE BAZY — działa też dla nazw
// tematycznych („Topór Ognia"). Suma wag = 1.
export function weaponDamageSplit(it) {
  const nazwa = String(it?.base ?? it?.name ?? '').toLocaleLowerCase('pl');
  const wtype = nowyWtype(it);
  if (wtype === 'magiczne' || /różdżk|rozdzk|kostur|orb|księg|ksieg|staff|berło|berlo/.test(nazwa)) return { magic: 1 };
  if (/młot|mlot|maczug|buława|bulawa|obuch|kastet/.test(nazwa)) return { smash: 1 };
  if (/sztylet|rapier|szpad/.test(nazwa)) return { pierce: 1 };
  if (/łuk|luk|kusz/.test(nazwa)) return { pierce: 1 };
  if (/oszczep|włócz|wlocz|javelin/.test(nazwa)) return { pierce: 0.9, slash: 0.1 };
  if (/scimitar/.test(nazwa)) return { slash: 1 };
  if (/topór|topor/.test(nazwa)) return { slash: 1 };
  // Wielki miecz / miecz dwuręczny — czyste Cięcie. Miecz 1H — Cięcie z resztką Przebicia.
  if (/dwuręczn|dwureczn|wielki miecz|greatsword/.test(nazwa)) return { slash: 1 };
  if (/miecz|ostrze/.test(nazwa)) return { slash: 0.8, pierce: 0.2 };
  if (wtype === 'dystansowe') return { pierce: 1 };
  if (wtype === 'dwureczna') return { slash: 1 };
  return { slash: 1 };
}

// Główny typ = najcięższa waga podziału. Używany do koloru logu i etykiety.
export function weaponDamageType(it) {
  const split = weaponDamageSplit(it);
  return Object.entries(split).sort((a, b) => b[1] - a[1])[0][0];
}

export const classDamageType = (klasa, kind = null) => {
  if (kind === 'pet') return 'pierce';
  if (klasa === 'mag') return 'magic';
  if (klasa === 'lowca' || klasa === 'tropiciel') return 'pierce';
  if (klasa === 'tancerz') return 'slash';
  return 'smash';
};

const NAMES = {
  bron:       null,   // z WEAPON_TYPES
  offhand:    ['Puklerz', 'Tarcza', 'Orb', 'Kastet', 'Sztylet'],
  helm:       ['Hełm', 'Kaptur', 'Diadem', 'Maska'],
  napiersnik: ['Napierśnik', 'Kolczuga', 'Kirys', 'Płaszcz', 'Zbroja Runiczna'],
  buty:       ['Buty', 'Trzewiki', 'Sandały'],
  rekawice:   ['Rękawice', 'Karwasze', 'Naręczaki'],
  pierscien:  ['Pierścień', 'Sygnet', 'Obrączka'],
  amulet:     ['Naszyjnik', 'Amulet', 'Talizman'],
};

const EPITHETS = [
  'Cierni', 'Zmierzchu', 'Popiołu', 'Głębi', 'Wichru', 'Krwi', 'Mgły', 'Kamienia',
  'Furii', 'Milczenia', 'Otchłani', 'Świtu', 'Rdzy', 'Pustki', 'Grzmotu', 'Szeptu',
];

// pool: lista {base, slot, wtype, hands} z definicji wyprawy. Gdy jest podana,
// przedmiot losuje się WYŁĄCZNIE z niej — dzięki temu tabela dropów pokazywana
// graczowi jest prawdą, a nie ozdobą.
// Jaki poziom ma przedmiot. Dwie drogi:
//   `zakres` — widełki wyprawy. Rzadkość decyduje, z której CZĘŚCI widełek
//              losujesz: legendarne i lepsze z góry, reszta z dołu.
//   bez niego — dawne „ilvl piętra plus rozrzut", używane jeszcze przez wieżę.
function ilvlZWidelek(rng, rarity, ilvl, zakres, wezel = 'walka') {
  if (!zakres) {
    const spread = C.loot.ilvlSpread;
    return Math.max(1, ilvl + rint(rng, spread[0], spread[1]));
  }
  const [lo, hi] = zakres;
  const rozpietosc = hi - lo;

  // Legendy i wyżej biorą samą górę widełek, niezależnie od tego, co je upuściło.
  if (rarity === 'legendary' || rarity === 'mystic' || rarity === 'god') {
    const gora = Math.max(lo, Math.round(lo + rozpietosc * C.expedition.legendarnyOd));
    return rint(rng, gora, hi);
  }

  // Zwykłe przedmioty: WĘZEŁ decyduje, z której części widełek losujesz.
  // Bez tego pierwsza walka runu i boss dawały statystycznie to samo.
  const w = C.expedition.ilvlWezel[wezel] ?? C.expedition.ilvlWezel.walka;
  const a = Math.max(lo, Math.round(lo + rozpietosc * w[0]));
  const b = Math.max(a, Math.round(lo + rozpietosc * w[1]));
  return rint(rng, a, b);
}

// PLUS NA ZNALEZIONEJ BRONI. Dotyczy wyłącznie broni — pancerz dalej plusuje
// się tylko u kowala. Rozkład geometryczny: każdy kolejny stopień jest o `ratio`
// rzadszy, a górną granicę bierze `upgrade.maxPlus`, więc jej podniesienie
// rozciąga tabelę samo, bez dopisywania liczb.
export function rollPlus(rng, item) {
  if (item.slot !== 'bron') return 0;
  const P = C.loot.plusNaBroni;
  if (!P || rng() >= P.szansa) return 0;

  const max = C.upgrade.maxPlus;
  const wagi = [];
  let suma = 0;
  for (let n = 1; n <= max; n++) { const w = Math.pow(P.ratio, n - 1); wagi.push(w); suma += w; }
  let r = rng() * suma;
  for (let n = 1; n <= max; n++) { if ((r -= wagi[n - 1]) <= 0) return n; }
  return 1;
}

export function rollItem(rng, { ilvl, weights, slot = null, pool = null, zakres = null, wezel = 'walka' }) {
  if (pool?.length) {
    // Wyprawa losuje najpierw SLOT, a dopiero potem konkretną bazę w tym slocie.
    // Bez tego 12 nazw broni kontra 7 części defensywnych dawało broni 63% puli.
    const sloty = [...new Set(pool.map(x => x.slot))];
    const wybranySlot = pick(rng, sloty);
    const wpis = pick(rng, pool.filter(x => x.slot === wybranySlot));
    return rollItemZBazy(rng, { ilvl, weights, wpis, zakres, wezel });
  }
  const s = slot ?? weightedPick(rng, C.loot.slotWeights);
  const def = C.gear.slots[s];
  const rarity = weightedPick(rng, weights);
  const rar = C.rarities[rarity];
  const itemIlvl = ilvlZWidelek(rng, rarity, ilvl, zakres, wezel);

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
    base: baseName,
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

  item.plus = rollPlus(rng, item);

  return item;
}

// Wariant z narzuconą bazą — używany, gdy przedmiot ma pochodzić z tabeli wyprawy.
function rollItemZBazy(rng, { ilvl, weights, wpis, zakres = null, wezel = 'walka' }) {
  const s = wpis.slot;
  const def = C.gear.slots[s];
  const rarity = weightedPick(rng, weights);
  const rar = C.rarities[rarity];
  const itemIlvl = ilvlZWidelek(rng, rarity, ilvl, zakres, wezel);
  const hands = wpis.hands ?? 1;

  const item = {
    id: null,
    slot: s, wtype: wpis.wtype ?? null, hands,
    base: wpis.base,
    name: `${wpis.base} ${pick(rng, EPITHETS)}`,
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
    item.affixes.push({ id: a.id, label: a.label, value: Math.max(1, Math.round(base + a.perIlvl * itemIlvl)),
                        pct: !!a.pct });
  }
  item.plus = rollPlus(rng, item);
  return item;
}

// wagiBoss: podmienione wagi skrzyni bossa. Używa tego wyprawa, bo bez ryzyka
// legendy, Mystic i God mają w niej zero.
export function rollDrops(seed, { floor, variant, pool = null, zakres = null, wagiBoss = null,
  customWeights = null, wezel = 'walka', dropChance = C.loot.dropChance }) {
  const rng = mulberry32(seed);
  const weights = customWeights ?? (
    variant === 'boss' ? (wagiBoss ?? C.loot.weightsBoss) :
    variant === 'plus' ? C.loot.weightsPlus : C.loot.weightsNormal);

  const out = [];
  if (variant === 'boss') {
    const n = rint(rng, C.loot.bossDropCount[0], C.loot.bossDropCount[1]);
    for (let i = 0; i < n; i++) out.push(rollItem(rng, { ilvl: floor, weights, pool, zakres, wezel }));
    // skrzynia: od najgorszego do najlepszego
    const order = Object.keys(C.rarities);
    out.sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
  } else if (rng() < dropChance) {
    out.push(rollItem(rng, { ilvl: floor, weights, pool, zakres, wezel }));
  }
  return out;
}

// Ilu przeciwników staje naraz. Od piętra 3 wychodzą we dwóch — dopiero wtedy
// szyk zaczyna znaczyć, bo jest kogo zasłaniać i do kogo podchodzić.
// Jedna jednostka świty. hp/dmg z definicji to UŁAMKI zwykłego moba z tego
// piętra, więc świta skaluje się razem z wieżą i nie ma osobnej krzywej.
function switaUnit(floor, fightIdx, d, baza, i) {
  const klasa = d.klasa ?? 'wojownik';
  const row = C.formation.rows[klasa] ?? 1;
  const nazwa = d.rodzina ? `${baza.family}${d.suffix ?? ''}` : d.name;
  // Skala od ZWYKŁEGO moba z piętra, nie od bossa. Bez tego każde podniesienie
  // zdrowia bossa mnożyło razem z nim całą świtę i grupa rosła trzykrotnie.
  const B = statyBazowe(floor);
  const hp = Math.max(1, Math.round(B.hp * d.hp));
  return {
    name: nazwa,
    // family to klucz bestiariusza. Świta ma własne wpisy — Rogaty Demon
    // z piętra 10 i z piętra 40 to ten sam potwór.
    family: d.rodzina ? baza.family : d.name,
    variant: d.elita ? 'elita' : 'normal',
    level: floor, klasa, row, ic: d.ic ?? null, elita: !!d.elita,
    reach: row === 1 ? C.formation.reach.jednoreczna : C.formation.maxRow,
    dtype: klasa === 'mag' ? 'mag' : 'fiz',
    damageType: classDamageType(klasa),
    hp, maxHp: hp,
    damage: Math.max(1, Math.round(B.damage * d.dmg)),
    speed: Math.round(B.speed),
    attackSpeed: attackSpeed(Math.round(B.speed)),
    armor: Math.round(B.armor * (d.elita ? 1.2 : 0.9)),
    gold: Math.round(baza.gold * (d.elita ? 0.6 : 0.35)),
    skills: d.skills ?? [],
  };
}

// Kto wychodzi na daną falę.
//   boss           → boss + świta: dwie elity i jeden zwykły
//   piętro elity   → ostatnia fala to paczka mini-elity (elita, healer, oprawca)
//   reszta         → jeden, dwóch (od piętra 3) albo trzech (od piętra 15)
export function makeEnemies(floor, fightIdx) {
  const t = C.tower;
  const info = floorInfo(floor);
  const pierwszy = makeEnemy(floor, fightIdx);

  if (pierwszy.variant === 'boss') {
    return [pierwszy, ...t.swita.boss.map((d, i) => switaUnit(floor, fightIdx, d, pierwszy, i))];
  }
  if (info.isElita && fightIdx >= info.fights - 1) {
    return t.swita.elita.map((d, i) => switaUnit(floor, fightIdx, d, pierwszy, i));
  }

  const ile = floor >= t.trioFromFloor ? 3 : floor >= t.duoFromFloor ? 2 : 1;
  const mnozniki = [1, t.duoStatMult, t.trioStatMult];
  const out = [pierwszy];
  // Każdy kolejny bierze inne ziarno, żeby nie był kopią pierwszego, i jest
  // słabszy — trzech pełnych przeciwników potroiłoby trudność z piętra na piętro.
  for (let i = 1; i < ile; i++) {
    // Towarzysz zawsze zwykły: nosi mnożnik slotu, nie dopisek wariantu.
    const e = makeEnemy(floor, fightIdx + 977 * i, 'normal');
    const m = mnozniki[i];
    e.hp = Math.max(1, Math.round(e.hp * m)); e.maxHp = e.hp;
    e.damage = Math.max(1, Math.round(e.damage * m));
    e.gold = Math.round(e.gold * m);
    out.push(e);
  }
  return out;
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
  // Świta bossa i paczka mini-elity mają własne wpisy w Kronice — ten sam
  // Rogaty Demon stoi przy każdym bossie, więc zasługuje na własne trofea.
  'Rogaty Demon': ['Ułamany Róg', 'Kopyto Demona', 'Płonąca Krew', 'Pieczęć Otchłani'],
  'Lich':         ['Zbutwiały Bandaż', 'Kość Palca', 'Zimna Iskra', 'Filakterium'],
  'Sukkubus':     ['Czarne Pióro', 'Skrzydlata Błona', 'Szept Pokusy', 'Serce Sukkuba'],
  'Szeptucha':    ['Zioło z Grobu', 'Zszyta Lalka', 'Kadzidło', 'Głos Szeptuchy'],
  'Oprawca':      ['Zakrwawiony Pas', 'Hak', 'Maska Oprawcy', 'Księga Kar'],
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
  const s = { sila: 0, precyzja: 0, intelekt: 0, zrecznosc: 0,
              szczescie: 0, witalnosc: 0,
              wytrzymalosc: 0,   // most dla starych przedmiotów → mapuje się na Witalność
              dmgFlat: 0, hpFlat: 0, armorFlat: 0, critChance: 0, critPower: 0,
              speed: 0, accuracy: 0, evasion: 0,
              resistSlash: 0, resistSmash: 0, resistPierce: 0, resistMagic: 0,
              // w SETNYCH AS — przelicza to computeStats
              attackSpeed: 0 };

  // ULEPSZENIE (+N). Na broni i pancerzu podbija bazę (obrażenia albo pancerz).
  // PIERŚCIENIE I NASZYJNIKI BAZY NIE MAJĄ — u nich plus podbija AFIKSY,
  // bo inaczej nie dałoby się ich ulepszać w ogóle.
  const ulepsz = 1 + (item.plus ?? 0) * C.upgrade.perPlus;
  const bezBazy = !item.damage && !item.armor;
  const mnoznikAfiksu = bezBazy ? ulepsz : 1;

  for (const a of item.affixes ?? []) {
    const v = a.value * mnoznikAfiksu;
    if (a.id === 'wszystkie') {
      s.sila += v; s.precyzja += v; s.intelekt += v; s.zrecznosc += v;
      s.szczescie += v; s.witalnosc += v;
    } else if (a.id in s) {
      s[a.id] += v;
    }
  }
  s.dmgFlat += Math.round((item.damage ?? 0) * ulepsz);
  s.armorFlat += Math.round((item.armor ?? 0) * ulepsz);
  return s;
}
