// Stan postaci: atrybuty, skille, ekwipunek, statystyki wynikowe.

import CONFIG from './config.js';
import { itemStatSummary, WEAPON_TYPES, handsOf } from './content.js';

const C = CONFIG;

// Wyprawka klasowa — Common ilvl 1, bez afiksów. Ma tylko wyciągnąć gracza z gołych pięści.
function starterItem(name, slot, wtype) {
  const def = C.gear.slots[slot];
  const it = {
    id: null, slot, wtype, name, rarity: 'common', ilvl: 1, plus: 0, energy: 0,
    reqLevel: 1, damage: 0, armor: 0, affixes: [],
  };
  if (def.base === 'damage' || def.base === 'mixed') {
    it.damage = Math.round((C.gear.weaponDamageBase + C.gear.weaponDamagePerIlvl) * def.mult);
  }
  if (def.base === 'armor' || def.base === 'mixed') {
    it.armor = Math.round((C.gear.armorBase + C.gear.armorPerIlvl) * def.mult);
  }
  return it;
}

// Profil głównej postaci. GRACZ NIE WYBIERA KLASY — decyzja trwała.
// Klasy istnieją dalej w config, ale należą do Sojuszników.
export const PROFIL = 'bohater';

export const klasaId = (klasa) => (C.classes[klasa] ? klasa : PROFIL);
export const classOf = (klasa) => C.classes[klasaId(klasa)];

// Doprowadza postać z bazy do obecnego kształtu gry. Wołane przy każdym wczytaniu,
// więc naprawa zapisuje się przy następnym save.
export function migrate(ch) {
  // Każda postać z bazy — Wędrowiec, Wojownik, Mag, cokolwiek — staje się Bohaterem.
  // Punkty z nieistniejących już węzłów drzewka wracają niżej, same z siebie.
  ch.klasa = PROFIL;

  // Sloty skasowane z gry (Pas, Spodnie) zabierają ze sobą swoje przedmioty —
  // zostawione w ekwipunku wywalałyby ekran, bo nie mają już definicji slotu.
  for (const slot of Object.keys(ch.equipped)) {
    if (!C.gear.slots[slot]) delete ch.equipped[slot];
  }
  ch.backpack = ch.backpack.filter(it => C.gear.slots[it.slot]);

  // Skille bojowe skasowane — stare postacie zrzucają je bez śladu.
  // UWAGA: skille zbierackie NIE lądują w ch.skills. Są w tej wersji samą makietą
  // i renderują się z config — nie ma czego zapisywać, więc nie ma czego stracić.
  delete ch.skills;

  // Pola dołożone pod vertical slice — postacie sprzed nich dostają puste.
  ch.bestiary ??= {};
  ch.collection ??= { companions: [], pets: [] };
  ch.collection.companions ??= [];
  ch.collection.pets ??= [];
  ch.prof ??= {};
  for (const id of Object.keys(C.skills)) if (C.skills[id].grywalne) ch.prof[id] ??= { lvl: 1, xp: 0 };
  ch.materials ??= {};
  ch.activity ??= null;
  ch.discovered ??= {};
  // Co gracz już ma, jest z definicji odkryte — inaczej po aktualizacji
  // tabela dropów kłamałaby, że nigdy tego nie widział.
  for (const it of [...ch.backpack, ...Object.values(ch.equipped)]) {
    const b = baseOf(it);
    if (b) ch.discovered[b] = true;
  }
  ch.unlocked ??= {};
  ch.expedition ??= null;
  ch.cskills ??= freshCombatSkills();
  for (const id of Object.keys(C.combatSkills.list)) ch.cskills[id] ??= { lvl: 1, xp: 0 };

  ch.team ??= { allies: [null, null, null], pet: null };
  ch.team.allies ??= [null, null, null];
  // Sojusznik usunięty z kolekcji nie może zostać w slocie jako duch.
  ch.team.allies = ch.team.allies.map(i => (ch.collection.companions[i] ? i : null));
  if (!ch.collection.pets[ch.team.pet]) ch.team.pet = null;
  // Slot, który jeszcze się nie otworzył, nie ma prawa nikogo trzymać. Postacie
  // sprzed bramkowania miały obsadę w zamkniętych slotach — wraca do kolekcji.
  ch.team.allies = ch.team.allies.map((v, i) => (slotOpen(ch, i) ? v : null));
  if (!petSlotOpen(ch)) ch.team.pet = null;

  // Drzewko doszło później; postacie sprzed niego dostają puste.
  ch.tree ??= {};
  // Węzły, które zniknęły z config, oddają swoje punkty.
  const znane = new Set(treeOf(ch.klasa).flatMap(b => b.nodes.map(n => n.id)));
  for (const [id, rank] of Object.entries(ch.tree)) {
    if (!znane.has(id)) { ch.treePoints += rank; delete ch.tree[id]; }
  }
  return ch;
}

// Poziom postaci = najwyższe zdobyte piętro. Nie ma osobnego paska expa —
// wieża jest jedyną miarą postępu.
export const poziom = (ch) => ch.maxFloor;

export function newCharacter(name, crest = null) {
  const klasa = PROFIL;
  const cls = C.classes[klasa];
  const attrs = { ...C.character.startingAttrs };

  const equipped = {};
  if (cls.startWeapon)  equipped.bron    = starterItem(cls.startWeapon, 'bron', cls.startWtype);
  if (cls.startOffhand) equipped.offhand = starterItem(cls.startOffhand, 'offhand', cls.startOffWtype ?? 'tarcza');

  return {
    name, klasa,
    crest: crest ?? { shape: 'tarcza', symbol: 'miecz', color: 'mosiadz', border: 'smola', ink: 'smola' },
    floor: 1, fight: 0, maxFloor: 1,
    attrs, unspentAttr: C.character.startingAttrPoints,
    treePoints: 0,
    tree: {},              // id węzła -> ranga
    gold: 0,
    // currency = Klucz Przywołania. Jedna waluta zamiast dwóch, dopóki nie wiadomo,
    // czy Przywołanie zostaje w grze.
    currency: C.summon.startingKeys,
    // Kronika. family -> { kills, drops: [nazwy odkrytych trofeów] }
    bestiary: {},
    // Profesje zbierackie. id skilla -> { lvl, xp }
    prof: freshProf(),
    // Surowce. id surowca -> sztuki
    materials: {},
    // Co gracz teraz kopie: { skill, res, since } albo null
    activity: null,
    // Bazy przedmiotów, które kiedykolwiek przeszły graczowi przez ręce.
    // Na tym stoi tabela dropów wyprawy i katalog w Kronice.
    discovered: {},
    // Kto stoi w drużynie. Liczby to indeksy w collection.companions / .pets.
    team: { allies: [null, null, null], pet: null },
    unlocked: {},          // co już zostało odblokowane (sojusznik, pet)
    expedition: null,      // trwająca wyprawa albo null
    // Skille bojowe. Rosną z tego, czym bijesz. Dają bonusy, NIE bramkują sprzętu.
    cskills: freshCombatSkills(),
    // Co wypadło z Przywołania. Drużyna czyta stąd pierwszego sojusznika.
    collection: { companions: [], pets: [] },
    potions: C.healing.startingPotions,
    mode: 'auto',          // 'auto' | 'turowa'
    activeFight: null,
    abilities: Object.keys(C.abilities),   // docelowo wychodzone w drzewku
    equipped,              // slot -> item
    backpack: [],          // item[]
    hpLost: 0,             // ile HP brakuje (utrzymuje się między walkami)
    stats: null,
  };
}

// ---------------------------------------------------------------- drzewko klasy

export const treeOf = (klasa) => C.tree.classes[klasaId(klasa)] ?? [];

// Ile punktów siedzi w danej gałęzi.
const branchSpent = (ch, branch) =>
  branch.nodes.reduce((s, n) => s + (ch.tree?.[n.id] ?? 0), 0);

// Węzeł numer i wymaga i * nodeStep punktów w swojej gałęzi.
export function nodeState(ch, branch, index) {
  const node = branch.nodes[index];
  const rank = ch.tree?.[node.id] ?? 0;
  const need = index * C.tree.nodeStep;
  const spent = branchSpent(ch, branch);
  return {
    rank, need, spent,
    max: C.tree.rankMax,
    unlocked: spent >= need,
    canRaise: spent >= need && rank < C.tree.rankMax && ch.treePoints > 0,
  };
}

// Suma wszystkich wykupionych efektów. Jedno miejsce, w którym drzewko
// zamienia się w liczby — computeStats zna tylko wynik.
export function treeEffects(ch) {
  const out = { dmgPct: 0, hpPct: 0, armorPct: 0, armorFlat: 0, critChance: 0,
                critPower: 0, speed: 0, accuracy: 0, evasion: 0, block: 0,
                blockCut: 0, potionPct: 0, attrWeight: {} };
  for (const branch of treeOf(ch.klasa)) {
    for (const node of branch.nodes) {
      const rank = ch.tree?.[node.id] ?? 0;
      if (!rank) continue;
      for (const [k, v] of Object.entries(node.eff)) {
        if (k === 'attrWeight') {
          for (const [a, w] of Object.entries(v)) out.attrWeight[a] = (out.attrWeight[a] ?? 0) + w * rank;
        } else {
          out[k] = (out[k] ?? 0) + v * rank;
        }
      }
    }
  }
  return out;
}

export function spendTreePoint(ch, nodeId) {
  if (ch.treePoints <= 0) return { ok: false, reason: 'Nie masz punktów drzewka' };
  for (const branch of treeOf(ch.klasa)) {
    const index = branch.nodes.findIndex(n => n.id === nodeId);
    if (index < 0) continue;
    const st = nodeState(ch, branch, index);
    if (st.rank >= st.max) return { ok: false, reason: 'Węzeł jest już na maksymalnej randze' };
    if (!st.unlocked) return { ok: false, reason: `Wymaga ${st.need} punktów w gałęzi ${branch.label}` };
    ch.tree ??= {};
    ch.tree[nodeId] = st.rank + 1;
    ch.treePoints--;
    return { ok: true, rank: ch.tree[nodeId] };
  }
  return { ok: false, reason: 'Nie ma takiego węzła w drzewku tej klasy' };
}

export const respecCost = (ch) => C.tree.respecBase + C.tree.respecPerLevel * poziom(ch);

export function resetTree(ch) {
  const cost = respecCost(ch);
  if (ch.gold < cost) return { ok: false, reason: `Reset kosztuje ${cost} zł — masz ${ch.gold}` };
  const wrocilo = Object.values(ch.tree ?? {}).reduce((a, b) => a + b, 0);
  ch.gold -= cost;
  ch.treePoints += wrocilo;
  ch.tree = {};
  return { ok: true, cost, punkty: wrocilo };
}

// Baza przedmiotu bez przydomka. Nowe przedmioty niosą ją w polu `base`;
// stare zapisy rozbieramy po nazwie, bo przydomek to zawsze ostatnie słowo.
export function baseOf(it) {
  if (!it) return null;
  if (it.base) return it.base;
  const cz = String(it.name ?? '').split(' ');
  return cz.length > 1 ? cz.slice(0, -1).join(' ') : (cz[0] || null);
}

// ---------------------------------------------------------------- profesje

// Ile expa na kolejny poziom. Liniowo i nisko — to są liczby pod obejrzenie
// pętli, nie pod finalny balans.
export const freshProf = () => Object.fromEntries(
  Object.entries(C.skills).filter(([, s]) => s.grywalne).map(([id]) => [id, { lvl: 1, xp: 0 }]));

export const xpNeed = (skill, lvl) => (C.skills[skill].xpBase ?? 20) * lvl;

export const profOf = (ch, skill) => (ch.prof?.[skill] ?? { lvl: 1, xp: 0 });

// Dopisuje exp i przelewa nadmiar w kolejne poziomy. Zwraca, ile poziomów wpadło.
export function addSkillXp(ch, skill, xp) {
  ch.prof ??= {};
  const p = ch.prof[skill] ??= { lvl: 1, xp: 0 };
  p.xp += xp;
  let awans = 0;
  while (p.xp >= xpNeed(skill, p.lvl)) { p.xp -= xpNeed(skill, p.lvl); p.lvl++; awans++; }
  return awans;
}

// Surowiec da się kopać tylko na swoim poziomie. Bramka jest jedna i jest tutaj.
export function canGather(ch, skill, resId) {
  const res = (C.skills[skill].resources ?? []).find(r => r.id === resId);
  if (!res) return { ok: false, reason: 'Nie ma takiego surowca' };
  const lvl = profOf(ch, skill).lvl;
  if (lvl < res.lvl) return { ok: false, reason: `Wymaga ${C.skills[skill].label} ${res.lvl} — masz ${lvl}` };
  return { ok: true, res };
}

// ---------------------------------------------------------------- statystyki wynikowe

export function computeStats(ch) {
  const a = { ...ch.attrs };
  let dmgFlat = 0, hpFlat = 0, armorFlat = 0, critChance = 0, critPower = 0,
      speedFlat = 0, accFlat = 0, evaFlat = 0;

  for (const item of Object.values(ch.equipped)) {
    if (!item) continue;
    const s = itemStatSummary(item);
    a.sila += s.sila; a.intelekt += s.intelekt;
    a.zrecznosc += s.zrecznosc; a.wytrzymalosc += s.wytrzymalosc;
    dmgFlat += s.dmgFlat; hpFlat += s.hpFlat; armorFlat += s.armorFlat;
    critChance += s.critChance; critPower += s.critPower;
    speedFlat += s.speed; accFlat += s.accuracy; evaFlat += s.evasion;
  }

  const cc = C.character;
  // Liniowo. Mnożnik od Wytrzymałości robił z tego skalowanie kwadratowe
  // i Obrońca przechodził całą wieżę bez jednej przegranej.
  // Poziom postaci = najwyższe zdobyte piętro. Po skasowaniu skilla Zdrowie
  // to on niesie darmowy przyrost HP, żeby wieża nie robiła się coraz ostrzejsza
  // dla kogoś, kto nie wpakował wszystkiego w Wytrzymałość.
  const T = treeEffects(ch);
  // Skille bojowe dokładają się do drzewka, nie zastępują go. Drzewko jest
  // schowane z UI, ale liczby zostają — wróci albo nie, kod jest gotowy na oba.
  const K = combatSkillBonus(ch);

  const maxHp = Math.round(
    (cc.startHp + a.wytrzymalosc * cc.hpPerStamina + poziom(ch) * cc.hpPerLevel + hpFlat)
    * (1 + T.hpPct + K.hpPct)
  );

  // Obrażenia skalują się z atrybutami KLASY, nie z typu trzymanej broni — inaczej
  // trzy klasy mieszane nie mają jak istnieć. Każdy atrybut klasy liczy się w pełni,
  // a cena za elastyczność siedzi w dzielniku (config.classes[x].dmgDivisor).
  const cls = classOf(ch.klasa);
  const divisor = cls.dmgDivisor ?? cc.strDamageDivisor;
  // Drzewko podbija WAGĘ atrybutu w obrażeniach — tak wygląda "większe obrażenia
  // od magii" w silniku, który nie zna typów obrażeń, tylko atrybuty klasy.
  const mainAttr = (cls.dmgAttrs ?? ['sila'])
    .reduce((sum, attr) => sum + (a[attr] ?? 0) * (1 + (T.attrWeight[attr] ?? 0)), 0);

  const damage = Math.round((cc.baseDamage + dmgFlat) * (1 + mainAttr / divisor) * (1 + T.dmgPct + K.dmgPct));
  const speed = Math.round(C.combat.baseSpeed + speedFlat + T.speed + a.zrecznosc / (cc.agiSpeedDivisor / 100));
  const armor = Math.round((armorFlat + T.armorFlat + a.wytrzymalosc * cc.staArmorPerPoint) * (1 + T.armorPct + K.armorPct));

  const accuracy = cc.accuracyBase + a.zrecznosc * cc.accuracyPerAgi + accFlat / 100 + T.accuracy;
  const evasion = Math.min(cc.evasionMax, a.zrecznosc * cc.evasionPerAgi + evaFlat / 100 + T.evasion);

  // Blok wymaga tarczy. Drzewko bez tarczy w ręce nie daje z niego nic.
  const maTarcze = ch.equipped.offhand?.wtype === 'tarcza';
  const block = maTarcze
    ? Math.min(C.combat.blockChanceMax, C.combat.blockChanceShield + T.block + K.block)
    : 0;

  return {
    maxHp,
    hp: Math.max(1, maxHp - (ch.hpLost ?? 0)),
    damage: Math.max(1, damage),
    speed: Math.max(20, speed),
    armor,
    accuracy: Math.min(C.combat.accuracyMax, accuracy),
    evasion,
    block,
    blockCut: C.combat.blockCut + T.blockCut,
    potionPct: T.potionPct,
    wtype: ch.equipped.bron?.wtype ?? 'mele',
    // Bohater stoi w pierwszym rzędzie, ale jego ZASIĘG zależy od broni:
    // bronią białą dosięga tylko przodu, łukiem i różdżką bije w każdy rząd.
    row: C.formation.rows.bohater,
    reach: C.formation.reach[ch.equipped.bron?.wtype ?? 'mele'] ?? 1,
    crit: C.combat.critBase + critChance / 100 + a.zrecznosc / cc.agiCritDivisor + T.critChance,
    critMult: C.combat.critMultBase + critPower / 100 + T.critPower,
    attrs: a,
    power: Math.round(damage * 3 + maxHp * 0.5 + armor * 1.5),
  };
}

// ---------------------------------------------------------------- skille bojowe

export const freshCombatSkills = () =>
  Object.fromEntries(Object.keys(C.combatSkills.list).map(id => [id, { lvl: 1, xp: 0 }]));

export const cskillNeed = (lvl) => C.combatSkills.xpBase * lvl;

// Jak rozkłada się exp z walki. To jest CAŁA reguła i siedzi w jednym miejscu:
//   dwuręczna            → 100% do jej skilla
//   jednoręczna + tarcza → 50% broń / 50% Obrona
//   dwie jednoręczne     → po 50% do skilla każdej
//   jednoręczna sama     → 100% do jej skilla
//   gołe pięście         → 100% do Broni białej
// Witalność stoi obok — rośnie z samego udziału w walce, niezależnie od rąk.
export function skillSplit(ch) {
  const bron = ch.equipped?.bron ?? null;
  const off = ch.equipped?.offhand ?? null;
  const sk = (it) => (it ? (WEAPON_TYPES[it.wtype]?.skill ?? null) : null);

  const out = {};
  const add = (k, v) => { if (k) out[k] = (out[k] ?? 0) + v; };

  if (!bron) { add('melee', 1); return out; }
  if (handsOf(bron) === 2) { add(sk(bron), 1); return out; }
  if (off?.wtype === 'tarcza') { add(sk(bron), 0.5); add('obrona', 0.5); return out; }
  if (off && WEAPON_TYPES[off.wtype]) { add(sk(bron), 0.5); add(sk(off), 0.5); return out; }
  add(sk(bron), 1);
  return out;
}

// Dopisuje exp i przelewa nadmiar w poziomy. Zwraca listę tych, które awansowały.
export function addCombatXp(ch, pula) {
  ch.cskills ??= freshCombatSkills();
  const awanse = [];
  const daj = (id, xp) => {
    const s = ch.cskills[id] ??= { lvl: 1, xp: 0 };
    s.xp += xp;
    while (s.xp >= cskillNeed(s.lvl)) { s.xp -= cskillNeed(s.lvl); s.lvl++; awanse.push(id); }
  };
  for (const [id, udzial] of Object.entries(skillSplit(ch))) daj(id, Math.round(pula * udzial));
  daj('witalnosc', Math.round(pula));   // za samo bycie w walce
  return awanse;
}

// Bonusy ze skilli. Skille broni liczą się TYLKO dla broni, którą trzymasz —
// exp z łuku nie ma podbijać obrażeń różdżki.
export function combatSkillBonus(ch) {
  const out = { dmgPct: 0, armorPct: 0, hpPct: 0, block: 0 };
  const s = ch.cskills ?? {};
  const wtype = ch.equipped?.bron?.wtype ?? 'mele';
  const aktywny = WEAPON_TYPES[wtype]?.skill ?? 'melee';

  for (const [id, eff] of Object.entries(C.combatSkills.perLevel)) {
    const lvl = (s[id]?.lvl ?? 1) - 1;          // poziom 1 nie daje jeszcze nic
    if (!lvl) continue;
    if (['melee', 'dystans', 'magia'].includes(id) && id !== aktywny) continue;
    for (const [k, v] of Object.entries(eff)) out[k] = (out[k] ?? 0) + v * lvl;
  }
  return out;
}

// ---------------------------------------------------------------- drużyna

// Statystyki sojusznika albo peta. Liczą się z BOHATERA — nie ma osobnej krzywej
// do strojenia, a towarzysz nigdy nie zostaje w tyle ani nie przerasta gracza.
// Rzadkość jest jedyną osią rozwoju, bo ekwipunku nie noszą.
export function allyStats(hero, wpis, rodzaj = 'ally') {
  const base = C.allies[rodzaj];
  const mult = C.allies.rarityMult[wpis.rarity] ?? 1;
  // Klasa decyduje o rzędzie, rząd decyduje, kto do kogo dosięga.
  const klasa = wpis.klasa ?? 'wojownik';
  const row = rodzaj === 'pet' ? C.formation.petRow : (C.formation.rows[klasa] ?? 1);
  // Tylni sojusznicy biją z dystansu — inaczej stanie z tyłu byłoby czystą karą.
  const reach = row === 1 ? C.formation.reach.mele : C.formation.maxRow;
  return {
    name: wpis.name,
    rarity: wpis.rarity,
    kind: rodzaj,
    klasa: rodzaj === 'pet' ? null : klasa,
    row, reach,
    dtype: klasa === 'mag' ? 'mag' : 'fiz',
    maxHp: Math.max(1, Math.round(hero.maxHp * base.hpPct * mult)),
    hp: Math.max(1, Math.round(hero.maxHp * base.hpPct * mult)),
    damage: Math.max(1, Math.round(hero.damage * base.dmgPct * mult)),
    armor: Math.round(hero.armor * base.armorPct * mult),
    speed: base.speed,
    crit: C.combat.critBase,
    critMult: C.combat.critMultBase,
    accuracy: hero.accuracy,
    evasion: 0,
    dtype: 'fiz',
  };
}

// Czy wolno już przywoływać. Piętro 3 otwiera sojuszników, piętro 10 — pety.
// To są progi na DOSTĘP, nie prezenty: towarzysza trzeba sobie wylosować kluczem.
export const canSummon = (ch, kind) =>
  kind === 'pets' ? petSlotOpen(ch) : slotOpen(ch, 0);

// Czy slot jest już otwarty. Sloty 2 i 3 są zamknięte świadomie — patrz config.
export function slotOpen(ch, i) {
  if (C.allies.lockedSlots.includes(i)) return false;
  return poziom(ch) >= C.allies.unlock.ally1;
}
export const petSlotOpen = (ch) => poziom(ch) >= C.allies.unlock.pet;

// Kto faktycznie wchodzi do walki, w kolejności slotów. Zwraca [{...staty}].
export function teamUnits(ch, heroStats) {
  const out = [];
  (ch.team?.allies ?? []).forEach((idx, i) => {
    if (!slotOpen(ch, i)) return;              // zamknięty slot nie wystawia nikogo
    const w = ch.collection?.companions?.[idx];
    if (w) out.push(allyStats(heroStats, w, 'ally'));
  });
  const p = petSlotOpen(ch) ? ch.collection?.pets?.[ch.team?.pet] : null;
  if (p) out.push(allyStats(heroStats, p, 'pet'));
  return out;
}

// ---------------------------------------------------------------- ekwipunek

// Jedyna bramka na sprzęt: poziom postaci. Skille bojowe były drugą bramką
// na to samo — sprzęt z piętra 40 i tak wymagał piętra 40, żeby go zdobyć.
export function canEquip(ch, item) {
  if (item.reqLevel > poziom(ch)) {
    return { ok: false, reason: `Wymaga poziomu ${item.reqLevel} — masz ${poziom(ch)}` };
  }
  return { ok: true };
}

export function equip(ch, itemId) {
  const idx = ch.backpack.findIndex(i => i.id === itemId);
  if (idx < 0) return { ok: false, reason: 'Nie ma takiego przedmiotu' };
  const item = ch.backpack[idx];
  const check = canEquip(ch, item);
  if (!check.ok) return check;

  // Dwuręczna zajmuje obie ręce. Do drugiej ręki nic już nie wejdzie,
  // a to, co tam było, wraca do plecaka.
  if (item.slot === 'offhand' && handsOf(ch.equipped.bron) === 2) {
    return { ok: false, reason: 'Trzymasz broń dwuręczną — druga ręka jest zajęta' };
  }

  const old = ch.equipped[item.slot] ?? null;
  ch.equipped[item.slot] = item;
  ch.backpack.splice(idx, 1);
  if (old) ch.backpack.push(old);

  let zdjete = null;
  if (item.slot === 'bron' && handsOf(item) === 2 && ch.equipped.offhand) {
    zdjete = ch.equipped.offhand;
    ch.backpack.push(zdjete);
    delete ch.equipped.offhand;
  }

  return { ok: true, equipped: item, unequipped: old, offhandZdjety: zdjete };
}

// --------------------------------------------------------------- self-check
// node game/character.js — pilnuje skalowania obrażeń z atrybutów klasy.

export function demo() {
  // nagi=true zdejmuje wyprawkę — inaczej pomiar mierzy startowy sprzęt,
  // a nie samo skalowanie z atrybutów.
  const dmg = (add = {}, nagi = false) => {
    const ch = newCharacter('T');
    if (nagi) ch.equipped = {};
    for (const [k, v] of Object.entries(add)) ch.attrs[k] += v;
    return computeStats(ch).damage;
  };

  // GRACZ NIE MA KLASY. Bohater bierze obrażenia z wszystkich trzech
  // atrybutów ofensywnych — dlatego nie ma martwego dropu.
  console.assert(newCharacter('T').klasa === PROFIL, 'nowa postac to Bohater, nie klasa');
  console.assert(dmg({ sila: 30 }) > dmg(), 'Sila daje obrazenia');
  console.assert(dmg({ intelekt: 30 }) > dmg(), 'Intelekt daje obrazenia');
  console.assert(dmg({ zrecznosc: 30 }) > dmg(), 'Zrecznosc daje obrazenia');

  // ...i liczy je tak samo, więc podział punktów między nie nic nie zmienia
  const razem = dmg({ sila: 300, intelekt: 300, zrecznosc: 300 }, true) - dmg({}, true);
  const wJedno = dmg({ sila: 900 }, true) - dmg({}, true);
  console.assert(razem === wJedno, `podzial punktow ofensywnych bez znaczenia (${razem} vs ${wJedno})`);

  // Wytrzymałość nie jest osią obrażeń
  console.assert(dmg({ wytrzymalosc: 30 }) === dmg(), 'Wytrzymalosc nie daje obrazen');

  // start: puste atrybuty i worek punktów
  const swiezy = newCharacter('T');
  console.assert(Object.values(swiezy.attrs).every(v => v === 0), 'atrybuty startuja na zerze');
  console.assert(swiezy.unspentAttr === 10, 'dziesiec punktow na start');
  console.assert(swiezy.skills === undefined, 'skille bojowe nie istnieja');

  // sprzęt bramkuje wyłącznie poziom postaci
  const ch = newCharacter('T');
  ch.maxFloor = 5;
  console.assert(canEquip(ch, { reqLevel: 5, slot: 'helm' }).ok, 'przedmiot na poziomie postaci wchodzi');
  console.assert(!canEquip(ch, { reqLevel: 6, slot: 'helm' }).ok, 'przedmiot ponad poziom nie wchodzi');

  // poziom niesie HP zamiast skasowanego skilla Zdrowie
  const hp1 = computeStats(newCharacter('T')).maxHp;
  const wyzej = newCharacter('T'); wyzej.maxFloor = 10;
  console.assert(computeStats(wyzej).maxHp > hp1, 'wyzsze pietro daje wiecej HP');

  // drzewko: bramka gałęzi, wpływ na statystyki, reset
  const p = newCharacter('T');
  p.treePoints = 30;
  const galaz = treeOf(PROFIL).find(b => b.id === 'hart');
  console.assert(!spendTreePoint(p, galaz.nodes[1].id).ok, 'drugi wezel zamkniety bez punktow w galezi');
  for (let i = 0; i < 2; i++) spendTreePoint(p, galaz.nodes[0].id);
  console.assert(spendTreePoint(p, galaz.nodes[1].id).ok, 'dwa punkty w galezi otwieraja drugi wezel');
  console.assert(p.tree[galaz.nodes[0].id] === 2, 'ranga rosnie');
  console.assert(p.treePoints === 27, 'punkty schodza z puli');

  // blok liczy się tylko z tarczą — Bohater startuje bez niej
  const zTarcza = newCharacter('T');
  zTarcza.equipped.offhand = { slot: 'offhand', wtype: 'tarcza', affixes: [], damage: 0, armor: 5 };
  console.assert(computeStats(zTarcza).block > 0, 'z tarcza blok istnieje');
  console.assert(computeStats(newCharacter('T')).block === 0, 'bez tarczy blok zerowy');

  // węzeł obrażeń faktycznie podnosi obrażenia
  const bijak = newCharacter('T'); bijak.treePoints = 10; bijak.attrs.sila = 40;
  const przed = computeStats(bijak).damage;
  for (let i = 0; i < 3; i++) spendTreePoint(bijak, 'ostrze');
  console.assert(computeStats(bijak).damage > przed, 'wezel Ostrze podnosi obrazenia');

  // reset oddaje punkty i zabiera złoto
  bijak.gold = 99999;
  const wydane = Object.values(bijak.tree).reduce((a, b) => a + b, 0);
  const przedPkt = bijak.treePoints;
  resetTree(bijak);
  console.assert(bijak.treePoints === przedPkt + wydane, 'reset oddaje wszystkie punkty');
  console.assert(Object.keys(bijak.tree).length === 0, 'reset czysci drzewko');
  const biedak = newCharacter('T'); biedak.gold = 0;
  console.assert(!resetTree(biedak).ok, 'reset bez zlota nie przechodzi');

  // Postacie z bazy: KAZDA klasa staje sie Bohaterem, a punkty z martwych
  // wezlow wracaja do puli. Bez tego stary Mag traci wszystko, co wydal.
  const stary = newCharacter('T');
  stary.klasa = 'mag'; stary.tree = { plomien: 3, tafla: 2 }; stary.treePoints = 0;
  migrate(stary);
  console.assert(stary.klasa === PROFIL, 'stara klasa staje sie Bohaterem');
  console.assert(stary.treePoints === 5, `punkty z martwych wezlow wracaja (${stary.treePoints})`);
  console.assert(Object.keys(stary.tree).length === 0, 'martwe wezly znikaja');
  console.assert(klasaId('cokolwiek') === PROFIL, 'nieznana klasa spada na Bohatera');
  console.assert(classOf('wedrowiec').label === 'Bohater', 'Wedrowiec -> Bohater');

  // klasy Sojusznikow zostaja w config, ale gracz ich nie dostaje
  console.assert(C.classes.wojownik && C.classes.mag, 'klasy Sojusznikow czekaja w config');

  // ---- skille bojowe: podzial expa wedlug rak ----
  const w2h = { slot: 'bron', wtype: 'mele', hands: 2, affixes: [], damage: 10, armor: 0 };
  const w1h = { slot: 'bron', wtype: 'mele', hands: 1, affixes: [], damage: 6, armor: 0 };
  const rozdzka = { slot: 'bron', wtype: 'magia', hands: 1, affixes: [], damage: 6, armor: 0 };
  const tarcza = { slot: 'offhand', wtype: 'tarcza', affixes: [], damage: 0, armor: 5 };
  const kordelas = { slot: 'offhand', wtype: 'mele', hands: 1, affixes: [], damage: 4, armor: 0 };

  const podzial = (bron, off) => {
    const t = newCharacter('T');
    t.equipped = {}; if (bron) t.equipped.bron = bron; if (off) t.equipped.offhand = off;
    return skillSplit(t);
  };
  console.assert(podzial(w2h).melee === 1, 'dwureczna: caly exp w jeden skill');
  console.assert(podzial(w1h, tarcza).melee === 0.5 && podzial(w1h, tarcza).obrona === 0.5,
    'jednoreczna + tarcza: 50/50 bron i Obrona');
  console.assert(podzial(rozdzka, tarcza).magia === 0.5 && podzial(rozdzka, tarcza).obrona === 0.5,
    'rozdzka + tarcza: 50/50 magia i Obrona');
  console.assert(podzial(rozdzka, kordelas).magia === 0.5 && podzial(rozdzka, kordelas).melee === 0.5,
    'rozdzka + mieczyk: po polowie do obu skilli');
  console.assert(podzial(w1h).melee === 1, 'jednoreczna sama: caly exp w jej skill');
  console.assert(podzial(null).melee === 1, 'gole piesci ida w Bron biala');

  // Witalnosc rosnie zawsze, niezaleznie od rak
  const wojak = newCharacter('T'); wojak.equipped = { bron: rozdzka };
  addCombatXp(wojak, 500);
  console.assert(wojak.cskills.witalnosc.lvl > 1, 'Witalnosc rosnie z samego udzialu w walce');
  console.assert(wojak.cskills.magia.lvl > 1, 'rozdzka podbija magie');
  console.assert(wojak.cskills.melee.lvl === 1, 'bron biala stoi, gdy sie nia nie bije');

  // Bonus liczy sie TYLKO dla trzymanej broni
  const magik = newCharacter('T');
  magik.equipped = { bron: rozdzka }; magik.attrs.intelekt = 50;
  magik.cskills.magia.lvl = 20;
  const zMagia = computeStats(magik).damage;
  magik.cskills.magia.lvl = 1; magik.cskills.dystans.lvl = 20;
  console.assert(computeStats(magik).damage < zMagia, 'exp z luku nie podbija rozdzki');

  // Dwureczna zdejmuje tarcze i nie wpuszcza nowej
  const rycerz = newCharacter('T');
  rycerz.maxFloor = 50;
  rycerz.equipped = { offhand: { ...tarcza, id: 'T1' } };
  rycerz.backpack = [{ ...w2h, id: 'D1', reqLevel: 1 }, { ...tarcza, id: 'T2', reqLevel: 1 }];
  const r1 = equip(rycerz, 'D1');
  console.assert(r1.ok && !rycerz.equipped.offhand, 'dwureczna zdejmuje tarcze');
  console.assert(rycerz.backpack.some(i => i.id === 'T1'), 'zdjeta tarcza wraca do plecaka');
  console.assert(!equip(rycerz, 'T2').ok, 'przy dwurecznej tarcza nie wchodzi');

  console.log('character.js — wszystkie testy przeszly');
}

if (process.argv[1] && process.argv[1].endsWith('character.js')) demo();
