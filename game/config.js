// RaidFolk_idle — WSZYSTKIE LICZBY
// Zmieniasz tutaj, nigdzie indziej. Restart serwera i gotowe.

export const CONFIG = {

  // ---------- WALKA ----------
  combat: {
    tickMs: 100,              // rozdzielczość symulacji
    baseSpeed: 100,           // prędkość odniesienia; 100 = atak co 2 s
    speedToInterval: 20000,   // interval_ms = speedToInterval / speed
    maxTurns: 600,            // bezpiecznik — walka nie może trwać wiecznie
    critBase: 0.05,           // 5% bazowej szansy na kryta
    critMultBase: 1.5,
    armorK: 400,              // redukcja = armor / (armor + K)

    // Siła ciosu — wybierana co turę w walce turowej.
    // Mocniej znaczy rzadziej. To jest cała decyzja tury.
    // charge — ile ładuje pasek ultimate
    strengths: {
      lekki:   { label: 'Lekki',  dmg: 0.60, acc: +0.22, charge: 1 },
      srednio: { label: 'Średni', dmg: 1.00, acc:  0.00, charge: 2 },
      mocno:   { label: 'Mocny',  dmg: 1.75, acc: -0.28, charge: 3 },
    },
    accuracyMin: 0.10,        // nigdy nie jest beznadziejnie
    accuracyMax: 0.97,        // i nigdy pewnie

    // Pasek ultimate. Lekki cios ładuje 1, średni 2, mocny 3.
    chargeMax: 10,
  },

  // ---------------------------------------------------------------- UMIEJĘTNOŚCI
  // Docelowo wychodzone w drzewku. Na razie wszystkie dostępne od startu.
  abilities: {
    okrzyk: {
      label: 'Okrzyk bojowy', cd: 5, charge: 1, target: 'self',
      desc: 'Pancerz −20%, obrażenia +20% przez 3 tury.',
      buff: { id: 'okrzyk', turns: 3, dmgMult: 1.20, armorMult: 0.80 },
    },
    wir: {
      label: 'Wir', cd: 3, charge: 2, target: 'all',
      desc: 'Trzy ciosy po 60% obrażeń we wszystkich przeciwników.',
      hits: 3, dmgMult: 0.60,
    },
    ogluszenie: {
      label: 'Cios ogłuszający', cd: 4, charge: 2, target: 'one',
      desc: '150% obrażeń, 50% szans na ogłuszenie. Ogłuszony traci turę i obrywa krytyki 2× częściej.',
      dmgMult: 1.50, stun: 0.50, stunTurns: 1, stunCritMult: 2.0,
    },
  },

  // Ultimate zależy od typu broni w ręce.
  ultimates: {
    mele:    { label: 'Rozłam',      desc: 'Jeden cios za 400% obrażeń, ignoruje połowę pancerza.',
               dmgMult: 4.0, armorPierce: 0.5, target: 'one' },
    dystans: { label: 'Grad Strzał', desc: 'Pięć strzał po 110% obrażeń, każda trafia osobno.',
               hits: 5, dmgMult: 1.10, target: 'all' },
    magia:   { label: 'Nawałnica',   desc: 'Trzy uderzenia po 190% we wszystkich przeciwników.',
               hits: 3, dmgMult: 1.90, target: 'all' },
  },

  // ---------- LECZENIE ----------
  healing: {
    decayPerUse: 0.10,        // każde kolejne leczenie o 10% słabsze
    decayLinear: true,        // true = 100/90/80, false = 100/90/81
    minEffect: 0.10,          // podłoga — leczenie nigdy nie schodzi poniżej 10%
    autoThreshold: 0.30,      // automat leczy poniżej 30% HP
    startingPotions: 5,
    potionHealPct: 0.35,      // mikstura leczy 35% max HP
  },

  // ---------- POSTAĆ ----------
  character: {
    baseDamage: 6,            // gołe pięści — żeby nigdy nie zejść do zera
    startHp: 120,
    hpPerStamina: 16,
    hpPerLevel: 12,
    attrPointsPerFloor: 3,
    startingAttrs: { sila: 5, intelekt: 5, zrecznosc: 5, wytrzymalosc: 5 },
    // mnożniki: (1 + atrybut / dzielnik)
    strDamageDivisor: 100,    // Siła → obrażenia bronią mele
    intMagicDivisor: 100,     // Intelekt → obrażenia magiczne
    agiDamageDivisor: 130,    // Zręczność → obrażenia z dystansu
                              // wyższy dzielnik, bo Zręczność daje też prędkość i kryt
    agiSpeedDivisor: 200,
    agiCritDivisor: 500,      // +0.2% kryta za punkt
    staArmorPerPoint: 2,
    accuracyBase: 0.70,       // celność bazowa
    accuracyPerAgi: 0.004,    // +0.4 punktu procentowego za punkt Zręczności
    evasionPerAgi: 0.002,     // unik: szansa, że wróg spudłuje
    evasionMax: 0.45,
  },

  // ---------- KLASY ----------
  classes: {
    wojownik: { label: 'Wojownik', skill: 'atak',       expBonus: 0.5, attrs: { sila: 3 },
                startWeapon: 'Wyszczerbiony Topór', startWtype: 'mele' },
    lucznik:  { label: 'Łucznik',  skill: 'dystansowy', expBonus: 0.5, attrs: { zrecznosc: 3 },
                startWeapon: 'Nadwątlony Łuk', startWtype: 'dystans' },
    mag:      { label: 'Mag',      skill: 'magia',      expBonus: 0.5, attrs: { intelekt: 3 },
                startWeapon: 'Pęknięta Różdżka', startWtype: 'magia' },
    obronca:  { label: 'Obrońca',  skill: 'obrona',     expBonus: 0.5, attrs: { wytrzymalosc: 3 },
                startWeapon: 'Stępiony Miecz', startWtype: 'mele', startOffhand: 'Drewniana Tarcza' },
  },

  // ---------- SKILLE BOJOWE ----------
  skills: {
    list: ['atak', 'dystansowy', 'magia', 'obrona', 'zdrowie'],
    expBase: 30,              // exp potrzebny na poziom 1→2
    expGrowth: 1.14,          // każdy kolejny poziom ×1.14
    expPerFight: 12,          // bazowy exp z walki na poziomie mob=skill
    // moby dają mniej expa, gdy skill przerósł poziom moba
    expFalloffPerLevel: 0.06, // -6% za każdy poziom różnicy
    expFalloffMin: 0.05,      // ale nigdy poniżej 5%
    shieldSplit: 0.5,         // tarcza: 50% do broni, 50% do obrony
    zdrowieShare: 0.33,       // Zdrowie zawsze dostaje 33% expa z walki
  },

  // ---------- WIEŻA ----------
  tower: {
    fightsPerFloorMin: 6,
    fightsPerFloorMax: 10,
    plusEvery: 5,             // co 5 piętro — wariant "+"
    bossEvery: 10,            // co 10 piętro — boss aktu
    floorsPerAct: 10,
    plusStatMult: 1.30,       // wariant "+" ma o tyle mocniejsze statystyki
    // Boss ma być sprawdzianem wytrzymałości, nie ściany obrażeń:
    // wysoki mnożnik HP, niski mnożnik obrażeń.
    bossStatMult: 1.15,
    bossHpMult: 2.6,
    // skalowanie moba wraz z piętrem
    // UWAGA: growth to mnożnik wykładniczy — gracz rośnie liniowo (ilvl + atrybuty),
    // więc trzymaj go blisko 1.01, inaczej po 20 piętrach moby uciekają bezpowrotnie.
    mobHpBase: 60,   mobHpPerFloor: 22,   mobHpGrowth: 1.010,
    mobDmgBase: 9,   mobDmgPerFloor: 2.4, mobDmgGrowth: 1.006,
    mobSpeedBase: 90, mobSpeedPerFloor: 0.6,
    goldBase: 8, goldPerFloor: 3,
    treePointsPerFloor: 1,
    treePointsPerBoss: 5,
  },

  // ---------- ŁUP ----------
  loot: {
    dropChance: 0.55,         // szansa, że ze zwykłej walki coś wypadnie
    bossDropCount: [3, 6],    // skrzynia bossa: od-do przedmiotów
    // wagi rzadkości ze zwykłej walki
    weightsNormal: { common: 700, uncommon: 220, unique: 70, heroic: 9, legendary: 1, mystic: 0, god: 0 },
    weightsPlus:   { common: 450, uncommon: 350, unique: 160, heroic: 35, legendary: 5, mystic: 0, god: 0 },
    weightsBoss:   { common: 300, uncommon: 330, unique: 250, heroic: 100, legendary: 20, mystic: 0, god: 0 },
    // ilvl przedmiotu względem piętra
    ilvlSpread: [-2, 0],
    // Wagi slotów. Broń niesie prawie całe obrażenia i dzieli się na 3 typy,
    // więc bez podbicia wagi mag trafiał swoją broń raz na 30 dropów.
    slotWeights: {
      bron: 26, offhand: 11, helm: 8, napiersnik: 9, spodnie: 8,
      buty: 7, rekawice: 7, pas: 7, pierscien: 9, amulet: 8,
    },
  },

  // ---------- RZADKOŚCI ----------
  rarities: {
    common:    { label: 'Common',    mult: 1.00, affixes: 1, energy: 1,   color: '#8C8377' },
    uncommon:  { label: 'Uncommon',  mult: 1.18, affixes: 1, energy: 3,   color: '#5E9E4A' },
    unique:    { label: 'Unique',    mult: 1.42, affixes: 2, energy: 8,   color: '#3E86C4' },
    heroic:    { label: 'Heroic',    mult: 1.75, affixes: 3, energy: 20,  color: '#8A5CC4' },
    legendary: { label: 'Legendary', mult: 2.20, affixes: 3, energy: 50,  color: '#D9822B' },
    mystic:    { label: 'Mystic',    mult: 2.80, affixes: 4, energy: 120, color: '#C4453E' },
    god:       { label: 'God',       mult: 3.60, affixes: 4, energy: 300, color: '#E8C35A' },
  },

  // ---------- EKWIPUNEK ----------
  gear: {
    // slot -> { skill bramkujący, typ bazy, mnożnik bazy }
    slots: {
      bron:       { label: 'Broń',       gate: 'weapon',  base: 'damage', mult: 1.00 },
      offhand:    { label: 'Druga ręka', gate: 'offhand', base: 'mixed',  mult: 0.55 },
      helm:       { label: 'Hełm',       gate: 'obrona',  base: 'armor',  mult: 0.60 },
      napiersnik: { label: 'Napierśnik', gate: 'obrona',  base: 'armor',  mult: 1.00 },
      spodnie:    { label: 'Spodnie',    gate: 'obrona',  base: 'armor',  mult: 0.75 },
      buty:       { label: 'Buty',       gate: 'obrona',  base: 'armor',  mult: 0.45 },
      rekawice:   { label: 'Rękawice',   gate: 'obrona',  base: 'armor',  mult: 0.45 },
      pas:        { label: 'Pas',        gate: 'obrona',  base: 'armor',  mult: 0.40 },
      pierscien:  { label: 'Pierścień',  gate: 'any',     base: 'none',   mult: 0.00 },
      amulet:     { label: 'Amulet',     gate: 'any',     base: 'none',   mult: 0.00 },
    },
    weaponDamageBase: 10, weaponDamagePerIlvl: 4.2,
    armorBase: 6, armorPerIlvl: 3.1,
    // próg poziomu postaci = ilvl; próg skilla = ilvl * skillGateRatio
    skillGateRatio: 0.9,
    backpackSize: 120,
  },

  // ---------- AFIKSY ----------
  affixes: {
    // rolowane wartości skalują się z ilvl
    pool: [
      { id: 'sila',        label: 'Siła',              min: 2, max: 5,  perIlvl: 0.55 },
      { id: 'intelekt',    label: 'Intelekt',          min: 2, max: 5,  perIlvl: 0.55 },
      { id: 'zrecznosc',   label: 'Zręczność',         min: 2, max: 5,  perIlvl: 0.55 },
      { id: 'wytrzymalosc',label: 'Wytrzymałość',      min: 2, max: 5,  perIlvl: 0.55 },
      { id: 'wszystkie',   label: 'Wszystkie staty',   min: 1, max: 2,  perIlvl: 0.20 },
      { id: 'dmgFlat',     label: 'Obrażenia',         min: 3, max: 8,  perIlvl: 1.10 },
      { id: 'hpFlat',      label: 'Zdrowie',           min: 8, max: 20, perIlvl: 3.20 },
      { id: 'armorFlat',   label: 'Pancerz',           min: 3, max: 7,  perIlvl: 0.90 },
      { id: 'critChance',  label: 'Szansa na kryt',    min: 1, max: 3,  perIlvl: 0.06, pct: true },
      { id: 'critPower',   label: 'Siła kryta',        min: 3, max: 8,  perIlvl: 0.14, pct: true },
      { id: 'speed',       label: 'Prędkość ataku',    min: 1, max: 3,  perIlvl: 0.10 },
      { id: 'accuracy',    label: 'Celność',           min: 1, max: 2,  perIlvl: 0.04, pct: true },
      { id: 'evasion',     label: 'Unik',              min: 1, max: 2,  perIlvl: 0.03, pct: true },
    ],
  },

  // ---------- ULEPSZANIE (jeszcze nieaktywne w kawałku 1) ----------
  upgrade: {
    bands: [
      { to: 6,  fail: 'nic' },
      { to: 10, fail: 'spadek' },
      { to: 15, fail: 'spalenie' },
    ],
    chances: [null, .95,.92,.88,.84,.80, .70,.62,.55,.45, .25,.20,.15,.10,.05],
    energyPerPlus: [0, 20,40,70,110,160, 240,340,470,640, 850,1100,1400,1750,2150],
  },
};

export default CONFIG;
