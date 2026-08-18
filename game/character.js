// Stan postaci: atrybuty, skille, ekwipunek, statystyki wynikowe.

import CONFIG from './config.js';
import { attackSpeed, asDoSpeed } from './combat.js';
import { weaponDamageSplit } from './content.js';
import { itemStatSummary, WEAPON_TYPES, handsOf, nowyWtype,
         weaponDamageType, classDamageType } from './content.js';
import { cleanupFoodBuffs, foodEffects, professionCycleMs } from './professions.js';

const C = CONFIG;

// Wyprawka klasowa — Common ilvl 1, bez afiksów. Ma tylko wyciągnąć gracza z gołych pięści.
function starterItem(name, slot, wtype) {
  const def = C.gear.slots[slot];
  const it = {
    id: 'i' + (nastepneId++), slot, wtype, name, rarity: 'common', ilvl: 1, plus: 0, energy: 0,
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

// Licznik id dla przedmiotów, które powstały bez niego (wyprawka startowa).
let nastepneId = Date.now();

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

  // MIGRACJA ATRYBUTÓW 4→7. Role się rozeszły: Zręczność → Precyzja (dmg dyst.)
  // + Zręczność (AS/unik) + Szczęście (kryt); Wytrzymałość → Witalność (HP/regen)
  // Nie da się tego uczciwie rozdzielić za gracza,
  // więc zwracamy WSZYSTKIE punkty i pozwalamy rozdać na nowo.
  // TWARDA SKÓRA ZOSTAŁA USUNIĘTA Z GRY. Postacie, które zdążyły w nią włożyć
  // punkty, dostają je z powrotem do puli — nikt nie traci nic za decyzję,
  // która zapadła po jego stronie ekranu.
  if (ch.attrs && 'twardaskora' in ch.attrs) {
    ch.unspentAttr = (ch.unspentAttr ?? 0) + (Number(ch.attrs.twardaskora) || 0);
    delete ch.attrs.twardaskora;
  }

  if (ch.attrs && ('wytrzymalosc' in ch.attrs || !('witalnosc' in ch.attrs))) {
    const zwrot = Object.values(ch.attrs).reduce((s, v) => s + (Number(v) || 0), 0);
    ch.attrs = { ...C.character.startingAttrs };
    ch.unspentAttr = (ch.unspentAttr ?? 0) + zwrot;
  }

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
  for (const unit of [...ch.collection.companions, ...ch.collection.pets]) cleanupFoodBuffs(unit);
  ch.prof ??= {};
  for (const id of Object.keys(C.skills)) if (C.skills[id].grywalne) ch.prof[id] ??= { lvl: 1, xp: 0 };
  ch.materials ??= {};
  ch.smithFurnace ??= { coal: 0 };
  ch.smithFurnace.coal = Math.max(0, Math.floor(Number(ch.smithFurnace.coal) || 0));
  ch.pvpEquipment ??= {};
  for (const slot of Object.keys(ch.pvpEquipment)) {
    if (!C.gear.slots[slot]) delete ch.pvpEquipment[slot];
  }
  ch.pveEquipmentB ??= {};
  ch.pveLoadout = ch.pveLoadout === 'b' ? 'b' : 'a';
  for (const slot of Object.keys(ch.pveEquipmentB)) {
    if (!C.gear.slots[slot]) delete ch.pveEquipmentB[slot];
  }
  ch.miningEquipment ??= {};
  ch.miningInventory ??= [];
  // Sprzęt profesji ma własny magazyn; odrzucamy tylko uszkodzone wpisy,
  // nigdy nie mieszamy ich z plecakiem bojowym.
  ch.miningInventory = ch.miningInventory.filter(it => it?.profession === 'mining' && C.mining.slots[it.slot]);
  for (const slot of Object.keys(ch.miningEquipment)) {
    const it = ch.miningEquipment[slot];
    if (!C.mining.slots[slot] || it?.profession !== 'mining') delete ch.miningEquipment[slot];
  }
  for (const it of [...ch.miningInventory, ...Object.values(ch.miningEquipment)]) {
    const recipe = C.smithing.recipes.find(r => r.id === it?.canonicalId);
    if (recipe) it.reqMiningLevel ??= recipe.lvl;
  }
  ch.activity ??= null;
  // Jeżeli patch skrócił cykl profesji, trwająca przed aktualizacją produkcja
  // również dostaje nowy czas. Bez tego zapis przechowywałby stare `ms` i gracz
  // musiałby jeszcze raz odczekać kilka minut mimo poprawionego balansu.
  if (ch.activity) {
    const skill = C.skills[ch.activity.skill];
    const resource = skill?.resources?.find(r => r.id === ch.activity.res);
    if (resource) {
      const currentMs = professionCycleMs(ch, ch.activity.skill, resource);
      if (!ch.activity.ms || currentMs < ch.activity.ms) {
        ch.activity.ms = currentMs;
        ch.activity.finishAt = (ch.activity.since ?? Date.now()) + currentMs;
      }
    }
  }
  ch.discovered ??= {};
  ch.buff ??= null;
  ch.foodBuffs ??= { main_meal: null, drink: null, dessert: null };
  ch.professionEquipment ??= {};
  // Stary buff na liczbę walk przechodzi do Main Meal. Dzięki temu
  // aktualizacja nie kasuje jedzenia, które ktoś miał aktywne w chwili patcha.
  if (ch.buff && !ch.foodBuffs.main_meal) {
    ch.foodBuffs.main_meal = {
      id: ch.buff.id ?? 'legacy_food', label: ch.buff.label ?? 'Posiłek',
      category: 'legacy', slot: 'main_meal',
      effects: { dmgPct: ch.buff.dmgPct ?? 0, hpPct: ch.buff.hpPct ?? 0 },
      walki: Math.max(1, ch.buff.walki ?? 20),
    };
    ch.buff = null;
  }
  cleanupFoodBuffs(ch);

  // Wyprawka startowa powstawała bez id, więc nic nie mogło jej znaleźć —
  // ulepszanie odbijało się o „nie ma takiego przedmiotu". Każdy przedmiot
  // bez id dostaje je przy pierwszym wczytaniu.
  for (const it of [...ch.backpack, ...Object.values(ch.equipped), ...Object.values(ch.pveEquipmentB), ...Object.values(ch.pvpEquipment)]) {
    if (it && !it.id) it.id = 'i' + (nastepneId++);
  }
  // Co gracz już ma, jest z definicji odkryte — inaczej po aktualizacji
  // tabela dropów kłamałaby, że nigdy tego nie widział.
  for (const it of [...ch.backpack, ...Object.values(ch.equipped), ...Object.values(ch.pveEquipmentB), ...Object.values(ch.pvpEquipment)]) {
    const b = baseOf(it);
    if (b) ch.discovered[b] = true;
  }
  ch.unlocked ??= {};
  ch.nagrodzone ??= {};
  // Ukończone wyprawy: 'puszcza:wysokie' -> ile razy. Na tym stoi drugi slot drużyny.
  ch.wyprawyZrobione ??= {};
  ch.dungeonyZrobione ??= {};
  // Karta gracza doszła później. Postać sprzed niej nie zna swojej daty urodzenia —
  // dostaje dzisiejszą, bo zmyślona wstecz byłaby gorsza niż żadna.
  ch.createdAt ??= Date.now();
  ch.bio ??= '';
  ch.guild ??= null;
  ch.settings = { ...C.ui.domyslne, ...(ch.settings ?? {}) };
  if (!C.ui.themes.some(t => t.id === ch.settings.theme)) ch.settings.theme = C.ui.domyslne.theme;
  if (!C.ui.quality.some(q => q.id === ch.settings.quality)) ch.settings.quality = C.ui.domyslne.quality;
  ch.expedition ??= null;
  ch.combatRunStats ??= null;
  // Postój był jedną flagą na cały run, teraz jest listą wykorzystanych ognisk.
  if (ch.expedition && !Array.isArray(ch.expedition.safepointDone)) {
    ch.expedition.safepointDone = ch.expedition.safepointDone ? [0] : [];
  }
  // Poziomy ryzyka wyprawy zmieniły nazwy (niskie/równe/wysokie → bez ryzyka/
  // zaawansowany/pro). Trwający run ze starym kluczem dostałby zerowe mnożniki.
  if (ch.expedition?.risk && !C.expedition.risks[ch.expedition.risk]) {
    ch.expedition.risk = { niskie: 'bezryzyka', rowne: 'zaawansowany', wysokie: 'pro' }[ch.expedition.risk]
      ?? 'bezryzyka';
  }
  // To samo w zapisie ukończonych wypraw — na nim stoi drugi slot drużyny.
  if (ch.wyprawyZrobione) {
    for (const [k, v] of Object.entries(ch.wyprawyZrobione)) {
      const [id, r] = k.split(':');
      const nowy = { niskie: 'bezryzyka', rowne: 'zaawansowany', wysokie: 'pro' }[r];
      if (!nowy) continue;
      ch.wyprawyZrobione[`${id}:${nowy}`] = (ch.wyprawyZrobione[`${id}:${nowy}`] ?? 0) + v;
      delete ch.wyprawyZrobione[k];
    }
  }
  // Zaklęcia nie siedzą w ch.abilities — biorą się z podpiętej runy.
  // Postacie sprzed tej zmiany zrzucają je bez śladu.
  ch.abilities = (ch.abilities ?? []).filter(id => C.abilities[id] && !C.abilities[id].czar);
  for (const [id, a] of Object.entries(C.abilities)) {
    if (!a.czar && !ch.abilities.includes(id)) ch.abilities.push(id);
  }
  // Mikstury były JEDNYM licznikiem, teraz są mapą rodzajów. Stary zapas
  // migruje na rodzaj, który odpowiada dawnym 35% — nikt nic nie traci.
  ch.mikstury ??= {};
  if (typeof ch.potions === 'number' && ch.potions > 0) {
    const d = C.healing.domyslna;
    ch.mikstury[d] = (ch.mikstury[d] ?? 0) + ch.potions;
  }
  delete ch.potions;
  for (const id of Object.keys(ch.mikstury)) {
    if (!C.healing.mikstury.some(m => m.id === id) || ch.mikstury[id] <= 0) delete ch.mikstury[id];
  }

  ch.runa ??= null;
  // Podpięta runa, której już nie masz w zapasach, odpina się sama.
  if (ch.runa && !(ch.materials?.[ch.runa] > 0)) ch.runa = null;
  // ---- SKILLE BOJOWE PRZESZŁY NA RODZINY BRONI ----
  // Broń biała rozpadła się na dwuręczną i jednoręczną, Witalność skasowana.
  // Stary poziom przechodzi na nowy skill, żeby nikomu nie wyparował dorobek.
  ch.cskills ??= {};
  const STARE_SKILLE = { melee: 'jednoreczna', dystans: 'dystansowe', magia: 'magiczne' };
  for (const [stary, nowy] of Object.entries(STARE_SKILLE)) {
    if (!ch.cskills[stary]) continue;
    const a = ch.cskills[stary], b = ch.cskills[nowy];
    ch.cskills[nowy] = (!b || a.lvl > b.lvl) ? a : b;
    delete ch.cskills[stary];
  }
  delete ch.cskills.witalnosc;               // Witalność skasowana na stałe
  for (const id of Object.keys(ch.cskills)) if (!C.combatSkills.list[id]) delete ch.cskills[id];
  for (const id of Object.keys(C.combatSkills.list)) ch.cskills[id] ??= { lvl: 1, xp: 0 };

  // Drzewka skilli bojowych. Węzeł, którego już nie ma w config, po prostu znika —
  // punkt i tak wraca, bo pula liczy się z poziomu skilla, nie z zapisu.
  ch.ctree ??= {};
  const znaneWezly = new Set(Object.values(C.combatSkills.drzewka).flat().map(n => n.id));
  for (const id of Object.keys(ch.ctree)) if (!znaneWezly.has(id)) delete ch.ctree[id];

  // ---- TYPY BRONI ----
  // `wtype` przedmiotu jest teraz identyfikatorem rodziny/skilla. Stary
  // 'mele' rozpada się po liczbie rąk, reszta ma podmianę jeden do jednego.
  for (const it of [...ch.backpack, ...Object.values(ch.equipped), ...Object.values(ch.pveEquipmentB), ...Object.values(ch.pvpEquipment)]) {
    if (it?.slot === 'bron') it.wtype = nowyWtype(it);
  }

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

// Ile mikstur w sumie. Limity noszenia liczą sztuki, nie rodzaje.
export const ilePotek = (ch) => Object.values(ch.mikstury ?? {}).reduce((a, b) => a + b, 0);

// Ile sztuk każdego rodzaju wolno zabrać, gdy limit wynosi `limit` sztuk.
// Bierzemy od najmocniejszych — gracz idzie do wieży z tym, co ma najlepszego.
export function zabierzMikstury(ch, limit) {
  const out = {};
  let zostalo = Math.max(0, limit);
  for (const m of [...C.healing.mikstury].reverse()) {
    const ile = Math.min(zostalo, ch.mikstury?.[m.id] ?? 0);
    if (ile > 0) { out[m.id] = ile; zostalo -= ile; }
    if (!zostalo) break;
  }
  return out;
}

// Zdejmuje ze stanu to, co zostało wypite w walce.
export function zuzyjMikstury(ch, przed, po) {
  for (const [id, n] of Object.entries(przed)) {
    const wypite = n - (po?.[id] ?? 0);
    if (wypite <= 0) continue;
    ch.mikstury[id] = Math.max(0, (ch.mikstury[id] ?? 0) - wypite);
    if (!ch.mikstury[id]) delete ch.mikstury[id];
  }
}

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
    // Karta gracza: kiedy konto powstało, co o sobie napisał, w jakiej gildii stoi.
    // Gildii jeszcze nie ma w grze — pole istnieje, żeby karta nie kłamała, że jest.
    createdAt: Date.now(),
    bio: '',
    guild: null,
    settings: { ...C.ui.domyslne },
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
    // Paliwo odłożone do Pieca. Wytapianie nie pobiera już węgla z plecaka.
    smithFurnace: { coal: 0 },
    // Osobny ekwipunek profesji — nie zajmuje plecaka i nie daje statystyk walki.
    miningEquipment: {},
    miningInventory: [],
    // Wspólny kształt pod kolejne zestawy profesji. Pierwszy slice nie tworzy
    // osobnych magazynów Fishing/Farming.
    professionEquipment: {},
    // Osobny zestaw bojowy pod przyszłe walki PvP. Przedmioty są fizyczne:
    // wyposażenie ich tutaj zdejmuje poprzedni przedmiot do wspólnego plecaka.
    pvpEquipment: {},
    // Dwa zestawy PvE. `equipped` zawsze jest AKTYWNYM zestawem, a drugi leży
    // tutaj — dzięki temu cała istniejąca walka nie musi znać loadoutów.
    pveEquipmentB: {},
    pveLoadout: 'a',
    // Co gracz teraz kopie: { skill, res, since } albo null
    activity: null,
    // Bazy przedmiotów, które kiedykolwiek przeszły graczowi przez ręce.
    // Na tym stoi tabela dropów wyprawy i katalog w Kronice.
    discovered: {},
    buff: null,            // legacy; migrate() przenosi go do foodBuffs
    foodBuffs: { main_meal: null, drink: null, dessert: null },
    // Kto stoi w drużynie. Liczby to indeksy w collection.companions / .pets.
    team: { allies: [null, null, null], pet: null },
    unlocked: {},          // co już zostało odblokowane (sojusznik, pet)
    wyprawyZrobione: {},   // 'puszcza:pro' -> ile razy ukończona
    dungeonyZrobione: {},  // id dungeonu -> ile razy ukończony
    nagrodzone: {},        // piętra, za które wypłacono już punkty
    expedition: null,      // trwająca wyprawa albo null
    combatRunStats: null,  // suma walk bieżącego piętra / Wyprawy / Dungeonu
    // Skille bojowe. Rosną z tego, czym bijesz. Dają bonusy, NIE bramkują sprzętu.
    cskills: freshCombatSkills(),
    // Co wypadło z Przywołania. Drużyna czyta stąd pierwszego sojusznika.
    collection: { companions: [], pets: [] },
    // Mikstury: id rodzaju -> sztuki. Dziewięć rodzajów, patrz config.healing.mikstury.
    mikstury: { [C.healing.startowa]: C.healing.startingPotions },
    mode: 'auto',          // 'auto' | 'turowa'
    activeFight: null,
    // Umiejętności zwykłe dostajesz na start. ZAKLĘCIA nie są tu trzymane —
    // wynikają z podpiętej runy i poziomu Magii, patrz zaklecia().
    abilities: Object.entries(C.abilities).filter(([, a]) => !a.czar).map(([id]) => id),
    runa: null,            // podpięta runa: 'runaognia' | ... | null
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
  const max = C.skills[skill]?.maxLevel ?? Infinity;
  while (p.lvl < max && p.xp >= xpNeed(skill, p.lvl)) {
    p.xp -= xpNeed(skill, p.lvl); p.lvl++; awans++;
  }
  if (p.lvl >= max) p.xp = 0;
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

export function computeStats(ch, options = {}) {
  const a = { ...ch.attrs };
  let dmgFlat = 0, hpFlat = 0, armorFlat = 0, critChance = 0, critPower = 0,
      speedFlat = 0, accFlat = 0, evaFlat = 0, asFlat = 0,   // asFlat w SETNYCH AS
      resistSlash = 0, resistSmash = 0, resistPierce = 0, resistMagic = 0;

  // Drzewko Ekwipunku defensywnego podbija WARTOŚĆ AFIKSÓW Z BIŻUTERII —
  // dlatego bonus ze skilli trzeba znać ZANIM zsumujemy przedmioty.
  const K = combatSkillBonus(ch);
  const BIZU = new Set(['pierscien', 'amulet']);

  for (const [slot, item] of Object.entries(ch.equipped)) {
    if (!item) continue;
    const s = itemStatSummary(item);
    const m = BIZU.has(slot) ? 1 + (K.bizuPct ?? 0) : 1;
    a.sila += s.sila * m; a.precyzja += s.precyzja * m; a.intelekt += s.intelekt * m;
    a.zrecznosc += s.zrecznosc * m; a.szczescie += s.szczescie * m;
    // Stary afiks „Wytrzymałość" (s.wytrzymalosc) dolicza się do Witalności.
    a.witalnosc += (s.witalnosc + s.wytrzymalosc) * m;
    dmgFlat += s.dmgFlat * m; hpFlat += s.hpFlat * m; armorFlat += s.armorFlat * m;
    critChance += s.critChance * m; critPower += s.critPower * m;
    speedFlat += s.speed * m; accFlat += s.accuracy * m; evaFlat += s.evasion * m;
    asFlat += (s.attackSpeed ?? 0) * m;
    resistSlash += (s.resistSlash ?? 0) * m;
    resistSmash += (s.resistSmash ?? 0) * m;
    resistPierce += (s.resistPierce ?? 0) * m;
    resistMagic += (s.resistMagic ?? 0) * m;
  }

  // ATRYBUTY MUSZĄ BYĆ CAŁKOWITE. Mnożniki biżuterii (drzewko Obrony i plus
  // na pierścieniu) robiły z nich ułamki w rodzaju 9.851799999999999 —
  // liczba wychodziła poza kafelek i rozwalała układ na szerokim ekranie.
  for (const k of Object.keys(a)) a[k] = Math.round(a[k]);
  dmgFlat = Math.round(dmgFlat); hpFlat = Math.round(hpFlat); armorFlat = Math.round(armorFlat);

  const cc = C.character;
  // Wytrzymałość jest liniowa względem liczby punktów, ale jej WARTOŚĆ rośnie
  // z poziomem. Obrażenia potworów po 100 poziomie rosły szybciej niż stałe
  // 16 HP za punkt, przez co 149 Wytrzymałości kończyło się przy około 4,7k HP.
  // Wzrost per poziom daje takiej postaci około 7,6k HP bez pompowania startu.
  // Poziom postaci = najwyższe zdobyte piętro. Po skasowaniu skilla Zdrowie
  // to on niesie darmowy przyrost HP, żeby wieża nie robiła się coraz ostrzejsza
  // dla kogoś, kto nie wpakował wszystkiego w Wytrzymałość.
  const T = treeEffects(ch);
  // Main Meal, Drink i Dessert sumują efekty przypisane wyłącznie bohaterowi.
  // Dla wyliczenia bazy towarzyszy jedzenie bohatera jest świadomie pomijane.
  const B = options.food === false ? {} : foodEffects(ch);
  const staminaGrowth = Math.min(cc.hpStaminaGrowthMax ?? Infinity,
    1 + Math.max(0, poziom(ch) - (cc.hpStaminaGrowthStartLevel ?? 0))
      * (cc.hpStaminaGrowthPerLevel ?? 0));
  const staminaHp = a.witalnosc * cc.hpPerStamina * staminaGrowth;

  const maxHp = Math.round(
    (cc.startHp + staminaHp + poziom(ch) * cc.hpPerLevel + hpFlat)
    * (1 + T.hpPct + K.hpPct + (B.hpPct ?? 0))
  );

  // Obrażenia skalują się z atrybutami KLASY, nie z typu trzymanej broni — inaczej
  // trzy klasy mieszane nie mają jak istnieć. Każdy atrybut klasy liczy się w pełni,
  // a cena za elastyczność siedzi w dzielniku (config.classes[x].dmgDivisor).
  const cls = classOf(ch.klasa);
  const divisor = cls.dmgDivisor ?? cc.strDamageDivisor;

  // BROŃ decyduje, który atrybut niesie obrażenia: biała → Siła,
  // dystans → Zręczność, różdżka → Intelekt (i wtedy autoatak jest MAGICZNY).
  // Pozostałe atrybuty liczą się słabiej (offAttrWeight), żeby nie wrócił
  // martwy drop — pierścień z Intelektem dalej coś daje wojownikowi.
  const wtype = nowyWtype(ch.equipped?.bron) ?? 'jednoreczna';
  const glowny = cc.weaponAttr[wtype] ?? 'sila';
  const mainAttr = (cls.dmgAttrs ?? ['sila']).reduce((sum, attr) => {
    const waga = attr === glowny ? 1 : cc.offAttrWeight;
    return sum + (a[attr] ?? 0) * waga * (1 + (T.attrWeight[attr] ?? 0));
  }, 0);

  // SUROWY atak, PRZED zaokrągleniem. Potrzebny UI-owi do rozbicia „Twoje / sprzęt":
  // ten wkład liczy się jako różnica dwóch przebiegów computeStats (z ekwipunkiem
  // i z pustymi slotami), a odejmowanie dwóch OSOBNO zaokrąglonych liczb potrafi
  // zmaleć przy rosnącej statystyce — gracz dokładał punkt Siły i widział
  // „sprzęt +19" → „+18", choć jego atak właśnie wzrósł. Różnicę liczy się
  // teraz z tych surowych wartości, a zaokrągla DOPIERO na końcu.
  const damageRaw = (cc.baseDamage + dmgFlat) * (1 + mainAttr / divisor)
    * (1 + T.dmgPct + K.dmgPct + (B.dmgPct ?? 0));
  const damage = Math.round(damageRaw);
  // Attack Speed z afiksów wchodzi TU, przeliczony na jednostki silnika —
  // dzięki temu jest jedna skala i jedno miejsce, w którym się je łączy.
  // ZRĘCZNOŚĆ TEŻ PODBIJA AS: agiSpeedDivisor 200 to +0,5 speed za punkt,
  // czyli +0,025 AS.
  const speed = Math.round((C.combat.baseSpeed + speedFlat + T.speed + (K.speed ?? 0)
    + asDoSpeed(asFlat / 100)
    + a.zrecznosc / (cc.agiSpeedDivisor / 100)) * (1 + (B.attackSpeedPct ?? 0)));
  // Witalność nie daje już płaskiego pancerza — to teraz rola Twardej Skóry.
  const armor = Math.round((armorFlat + T.armorFlat)
    * (1 + T.armorPct + K.armorPct + (B.armorPct ?? 0)));

  // Celność niesie Precyzja (trafianie), nie Zręczność.
  const accuracy = cc.accuracyBase + a.precyzja * cc.accuracyPerAgi + accFlat / 100
    + T.accuracy + (K.accuracy ?? 0) + (B.accuracy ?? 0);
  const evasion = Math.min(cc.evasionMax, a.zrecznosc * cc.evasionPerAgi + evaFlat / 100
    + T.evasion + (K.evasion ?? 0));

  // Blok wymaga tarczy. Drzewko bez tarczy w ręce nie daje z niego nic.
  const maTarcze = ch.equipped.offhand?.wtype === 'tarcza';
  const block = maTarcze
    ? Math.min(C.combat.blockChanceMax, C.combat.blockChanceShield + T.block + K.block)
    : 0;

  // Mana pod zaklęcia. Rośnie z Intelektu, więc mag opłaca ją tym samym
  // atrybutem, którym bije — a wojownik po prostu jej nie potrzebuje.
  const maxMana = Math.round(cc.manaBase + a.intelekt * cc.manaPerInt + (K.manaFlat ?? 0));
  const capResist = (v) => Math.min(C.combat.resistanceMax, Math.max(0, v / 100));
  const resists = {
    slash: capResist(resistSlash), smash: capResist(resistSmash),
    pierce: capResist(resistPierce), magic: capResist(resistMagic),
  };

  return {
    maxHp,
    maxMana,
    manaRegen: Math.max(1, Math.round(cc.manaRegenPerTurn * (1 + (B.manaRegenPct ?? 0)))),
    hpRegen: Math.round(a.witalnosc * cc.hpRegenPerVit),
    hp: Math.max(1, maxHp - (ch.hpLost ?? 0)),
    damage: Math.max(1, damage),
    // Surowce dla rozbicia w UI — patrz komentarz przy damageRaw.
    raw: { damage: Math.max(1, damageRaw), maxHp, armor },
    speed: Math.max(20, speed),
    // Liczba, którą widzi gracz. Ta sama skala u mobów — patrz makeEnemy.
    attackSpeed: attackSpeed(Math.max(20, speed)),
    armor,
    accuracy: Math.min(C.combat.accuracyMax, accuracy),
    evasion,
    block,
    blockCut: C.combat.blockCut + T.blockCut,
    potionPct: T.potionPct,
    wtype,
    damageType: weaponDamageType(ch.equipped?.bron),
    damageSplit: weaponDamageSplit(ch.equipped?.bron),
    resists,
    // RZĄD I ZASIĘG BIORĄ SIĘ Z BRONI. Bijesz wręcz — stoisz z przodu i obrywasz.
    // Różdżka stawia Cię w środku, łuk z tyłu, więc sojusznik-wojownik naprawdę
    // Cię zasłania: wróg musi przejść jeden albo dwa kroki, żeby Cię dosięgnąć.
    row: C.formation.heroRow[wtype] ?? 1,
    reach: C.formation.reach[wtype] ?? 1,
    crit: C.combat.critBase + critChance / 100 + a.szczescie / cc.agiCritDivisor
      + T.critChance + (K.critChance ?? 0) + (B.critChance ?? 0),
    critMult: C.combat.critMultBase + critPower / 100 + T.critPower + (K.critPower ?? 0),
    // Pula pancerza w modelu bariery = pancerz × mnożnik gracza. To LICZBA,
    // którą realnie trzeba przebić — stat panel ma pokazywać ją, nie surowca.
    armorPool: C.combat.armorModel === 'barrier'
      ? Math.round(armor * C.combat.barrierPlayerArmorMult) : armor,
    attrs: a,
    // Baza z rozdanych punktów (bez sprzętu). UI liczy z tego wkład itemów:
    // ze sprzętu = attrs − attrsBase.
    attrsBase: { ...ch.attrs },
    power: Math.round(damage * 3 + maxHp * 0.5 + armor * 1.5),
    // Rozbicie do UI — pokazuje graczowi, SKĄD bierze się liczba, tym samym
    // wzorem, który liczy walkę. Same liczby, żadnej drugiej matematyki.
    breakdown: {
      glownyAttr: glowny,
      attrValue: Math.round(a[glowny] ?? 0),
      mainAttr: Math.round(mainAttr),
      divisor,
      offAttrWeight: cc.offAttrWeight,
      dmg: {
        plaskie: Math.round(cc.baseDamage + dmgFlat),
        attrMult: 1 + mainAttr / divisor,
        bonusMult: 1 + T.dmgPct + K.dmgPct + (B.dmgPct ?? 0),
        final: Math.max(1, damage),
      },
      hp: {
        baza: cc.startHp,
        zWytrzymalosci: Math.round(staminaHp),
        zPoziomu: poziom(ch) * cc.hpPerLevel,
        zAfiksow: Math.round(hpFlat),
        bonusMult: 1 + T.hpPct + K.hpPct + (B.hpPct ?? 0),
        final: maxHp,
      },
    },
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
  const out = {};
  const add = (k, v) => { if (k) out[k] = (out[k] ?? 0) + v; };

  // Rodzina broni JEST skillem. Kostur jest dwuręczny, ale jego rodzina to
  // Przyrządy magiczne — i to one rosną, nie Broń dwuręczna.
  const rodzina = bron ? nowyWtype(bron) : 'jednoreczna';   // gołe pięście = jednoręczna
  const tarcza = off?.wtype === 'tarcza';

  if (tarcza) { add(rodzina, 0.5); add('obrona', 0.5); }
  else add(rodzina, 1);

  // EKWIPUNEK DEFENSYWNY rośnie z samego udziału w walce, nawet bez tarczy —
  // nosisz pancerz, więc się w nim wprawiasz.
  add('obrona', tarcza ? 0 : 0.35);
  return out;
}

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
// Ile punktów drzewka daje ten skill i ile z nich zostało wydane.
export const punktySkilla = (ch, id) =>
  Math.max(0, ((ch.cskills?.[id]?.lvl ?? 1) - 1) * C.combatSkills.punktyNaPoziom);

export const wydanePunkty = (ch, id) =>
  (C.combatSkills.drzewka[id] ?? []).reduce((sum, n) => sum + (ch.ctree?.[n.id] ?? 0), 0);

export const wolnePunkty = (ch, id) => punktySkilla(ch, id) - wydanePunkty(ch, id);

// Wydanie punktu w drzewku skilla bojowego.
export function wydajPunktSkilla(ch, nodeId) {
  for (const [skill, wezly] of Object.entries(C.combatSkills.drzewka)) {
    const n = wezly.find(w => w.id === nodeId);
    if (!n) continue;
    if (wolnePunkty(ch, skill) <= 0) return { ok: false, reason: 'Brak punktów w tym skillu' };
    ch.ctree ??= {};
    const ranga = ch.ctree[nodeId] ?? 0;
    if (ranga >= C.combatSkills.rangaMax) return { ok: false, reason: 'Węzeł jest na maksimum' };
    ch.ctree[nodeId] = ranga + 1;
    return { ok: true, skill, ranga: ch.ctree[nodeId] };
  }
  return { ok: false, reason: 'Nie ma takiego węzła' };
}

// Zerowanie drzewka jednego skilla — punkty wracają w całości i za darmo.
// Skille bojowe rosną same z gry, więc kara za zmianę zdania byłaby karą
// za granie inną bronią.
export function resetDrzewkaSkilla(ch, skill) {
  const wezly = C.combatSkills.drzewka[skill];
  if (!wezly) return { ok: false, reason: 'Nie ma takiego skilla' };
  ch.ctree ??= {};
  let wrocilo = 0;
  for (const n of wezly) { wrocilo += ch.ctree[n.id] ?? 0; delete ch.ctree[n.id]; }
  return { ok: true, wrocilo };
}

// SUMA EFEKTÓW DRZEWEK BOJOWYCH. Węzły rodziny broni liczą się TYLKO wtedy,
// gdy trzymasz broń tej rodziny — punkty w Toporach nie pomagają łucznikowi.
// Dawny bonus „za sam poziom" (perLevel) został skasowany: exp dawał wtedy
// premię dwa razy, raz sam z siebie i raz przez drzewko.
export function combatSkillBonus(ch) {
  const out = { dmgPct: 0, armorPct: 0, hpPct: 0, block: 0, speed: 0,
                accuracy: 0, evasion: 0, critChance: 0, critPower: 0,
                manaFlat: 0, bizuPct: 0 };
  const trzymana = nowyWtype(ch.equipped?.bron) ?? 'jednoreczna';

  for (const [skill, wezly] of Object.entries(C.combatSkills.drzewka)) {
    // 'obrona' działa zawsze; rodziny broni tylko z odpowiednią bronią w ręce.
    if (skill !== 'obrona' && skill !== trzymana) continue;
    for (const n of wezly) {
      const ranga = ch.ctree?.[n.id] ?? 0;
      if (!ranga) continue;
      for (const [k, v] of Object.entries(n.eff)) out[k] = (out[k] ?? 0) + v * ranga;
    }
  }
  return out;
}

// Zaklęcia, które postać UMIE w tej chwili: podpięta runa daje żywioł,
// poziom skilla Magia decyduje, jak daleko w tym żywiole sięgasz.
export function zaklecia(ch) {
  if (!ch.runa) return [];
  const lvl = ch.cskills?.magia?.lvl ?? 1;
  return Object.entries(C.abilities)
    .filter(([, a]) => a.czar && a.czar.runa === ch.runa && lvl >= a.czar.magia)
    .map(([id]) => id);
}

// Wszystko, czym można zagrać w walce: zwykłe umiejętności + dostępne zaklęcia.
export const bojowe = (ch) => [...(ch.abilities ?? []), ...zaklecia(ch)];

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
  const reach = row === 1 ? C.formation.reach.jednoreczna : C.formation.maxRow;
  const B = foodEffects(wpis);
  const role = rodzaj === 'pet' ? C.allies.petRole : (C.allies.roles[klasa] ?? C.allies.roles.wojownik);
  const r = rodzaj === 'pet' ? {} : role;
  return {
    name: wpis.name,
    rarity: wpis.rarity,
    kind: rodzaj,
    klasa: rodzaj === 'pet' ? null : klasa,
    row, reach,
    rowLabel: ['—', 'Przód', 'Środek', 'Tył'][row] ?? `Rząd ${row}`,
    role: role.label,
    roleDesc: role.desc,
    dtype: klasa === 'mag' ? 'mag' : 'fiz',
    damageType: classDamageType(klasa, rodzaj),
    // Towarzysze już skalują HP i pancerz z bohatera. Odporności są częścią
    // tego samego przygotowania drużyny, więc przejmują połowę jego ochrony.
    resists: Object.fromEntries(Object.entries(hero.resists ?? {}).map(([k, v]) => [k, v * 0.5])),
    maxHp: Math.max(1, Math.round(hero.maxHp * base.hpPct * mult * (r.hp ?? 1) * (1 + (B.hpPct ?? 0)))),
    hp: Math.max(1, Math.round(hero.maxHp * base.hpPct * mult * (r.hp ?? 1) * (1 + (B.hpPct ?? 0)))),
    damage: Math.max(1, Math.round(hero.damage * base.dmgPct * mult * (r.dmg ?? 1) * (1 + (B.dmgPct ?? 0)))),
    armor: Math.round(hero.armor * base.armorPct * mult * (r.armor ?? 1) * (1 + (B.armorPct ?? 0))),
    speed: Math.round(base.speed * (r.speed ?? 1) * (1 + (B.attackSpeedPct ?? 0))),
    crit: C.combat.critBase + (r.crit ?? 0) + (B.critChance ?? 0),
    critMult: C.combat.critMultBase,
    accuracy: hero.accuracy + (r.accuracy ?? 0) + (B.accuracy ?? 0),
    evasion: 0,
    threatMult: r.threat ?? 1,
    basicHits: r.hits ?? 1,
    basicHitMult: r.hitMult ?? 1,
    armorPierce: r.pierce ?? 0,
    splashMult: r.splash ?? 0,
    supportHealPct: r.healPct ?? 0,
    supportHealCd: r.healCd ?? 0,
    exposeArmor: r.exposeArmor ?? 0,
    bleedMult: role.bleedMult ?? 0,
    bleedTurns: role.bleedTurns ?? 0,
  };
}

// Czy wolno już przywoływać. Piętro 3 otwiera sojuszników, piętro 10 — pety.
// To są progi na DOSTĘP, nie prezenty: towarzysza trzeba sobie wylosować kluczem.
export const canSummon = (ch, kind) =>
  kind === 'pets' ? petSlotOpen(ch) : slotOpen(ch, 0);

// Czy slot jest już otwarty.
//   slot 0 — poziom postaci
//   slot 1 — UKOŃCZONA wyprawa na wysokim ryzyku, nie kolejne piętro
//   slot 2 — poziom 30
export function slotOpen(ch, i) {
  if (C.allies.lockedSlots.includes(i)) return false;
  if (i === 0) return poziom(ch) >= C.allies.unlock.ally1;
  if (i === 1) return wyprawaZrobiona(ch, C.allies.unlock.ally2);
  if (i === 2) return poziom(ch) >= C.allies.unlock.ally3;
  return false;
}

// Czy ta wyprawa została ukończona na tym ryzyku. Klucz jest jeden i tutaj,
// żeby serwer i warunki odblokowania nie rozjechały się w zapisie.
export const kluczWyprawy = (id, risk) => `${id}:${risk}`;
export const wyprawaZrobiona = (ch, wpis) =>
  !!wpis && !!ch.wyprawyZrobione?.[kluczWyprawy(wpis.wyprawa, wpis.risk)];
export const petSlotOpen = (ch) => poziom(ch) >= C.allies.unlock.pet;

// Kto faktycznie wchodzi do walki. Tablica jest ZBITA (bez dziur), bo silnik
// nie ma co robić z pustym miejscem — ale każda jednostka niesie NUMER SLOTU:
// 0 to bohater, 1–3 sojusznicy, 4 pet. Bez tego pet z pustym slotem sojusznika
// lądował w arenie na miejscu sojusznika, z jego ikoną i podpisem.
export const SLOT_PETA = 4;

// Bohater jako jednostka walki. Jedno miejsce, z którego korzysta serwer
// i narzędzie do balansu — inaczej narzędzie stroiłoby innego bohatera
// niż ten, którym gra się naprawdę.
export function heroUnit(ch, st) {
  return {
    name: ch.name, kind: 'gracz', slot: 0,
    hp: Math.max(1, st.hp), maxHp: st.maxHp,
    damage: st.damage, speed: st.speed, armor: st.armor,
    crit: st.crit, critMult: st.critMult, accuracy: st.accuracy, evasion: st.evasion,
    block: st.block, blockCut: st.blockCut, potionPct: st.potionPct,
    // Rodzaj obrażeń bierze się z broni w ręce. Log walki koloruje po tym.
    dtype: st.wtype === 'magiczne' ? 'mag' : 'fiz',
    damageType: st.damageType,
    // Podział na główny + poboczny typ — silnik blenduje po nim odporności.
    damageSplit: st.damageSplit,
    hpRegen: st.hpRegen,
    resists: st.resists,
    // Szyk: bohater stoi tam, gdzie stawia go broń.
    row: st.row, reach: st.reach,
  };
}

export function teamUnits(ch, heroStats) {
  const out = [];
  (ch.team?.allies ?? []).forEach((idx, i) => {
    if (!slotOpen(ch, i)) return;              // zamknięty slot nie wystawia nikogo
    const w = ch.collection?.companions?.[idx];
    if (w) out.push({ ...allyStats(heroStats, w, 'ally'), slot: i + 1 });
  });
  const p = petSlotOpen(ch) ? ch.collection?.pets?.[ch.team?.pet] : null;
  if (p) out.push({ ...allyStats(heroStats, p, 'pet'), slot: SLOT_PETA });
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

export function pveGear(ch, id = 'a') {
  const active = ch.pveLoadout === 'b' ? 'b' : 'a';
  return id === active ? ch.equipped : (ch.pveEquipmentB ??= {});
}

export function switchPveLoadout(ch, id) {
  const target = id === 'b' ? 'b' : 'a';
  const active = ch.pveLoadout === 'b' ? 'b' : 'a';
  if (target === active) return { ok: true, active };
  const drugi = ch.pveEquipmentB ?? {};
  ch.pveEquipmentB = ch.equipped;
  ch.equipped = drugi;
  ch.pveLoadout = target;
  return { ok: true, active: target };
}

export function equip(ch, itemId, loadout = 'pve_a') {
  const idx = ch.backpack.findIndex(i => i.id === itemId);
  if (idx < 0) return { ok: false, reason: 'Nie ma takiego przedmiotu' };
  const item = ch.backpack[idx];
  const check = canEquip(ch, item);
  if (!check.ok) return check;

  const gear = loadout === 'pvp' ? (ch.pvpEquipment ??= {})
    : pveGear(ch, loadout === 'pve_b' ? 'b' : loadout === 'pve_a' ? 'a' : (ch.pveLoadout ?? 'a'));

  // Dwuręczna zajmuje obie ręce. Do drugiej ręki nic już nie wejdzie,
  // a to, co tam było, wraca do plecaka.
  if (item.slot === 'offhand' && handsOf(gear.bron) === 2) {
    return { ok: false, reason: 'Trzymasz broń dwuręczną — druga ręka jest zajęta' };
  }

  const old = gear[item.slot] ?? null;
  gear[item.slot] = item;
  ch.backpack.splice(idx, 1);
  if (old) ch.backpack.push(old);

  let zdjete = null;
  if (item.slot === 'bron' && handsOf(item) === 2 && gear.offhand) {
    zdjete = gear.offhand;
    ch.backpack.push(zdjete);
    delete gear.offhand;
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
  console.assert(dmg({ precyzja: 30 }) > dmg(), 'Precyzja daje obrazenia');

  // BRON decyduje, ktory atrybut niesie obrazenia. Startowa bron to topor (mele),
  // wiec Sila liczy sie w pelni, a reszta slabiej — ale nadal cos daje.
  const zSily = dmg({ sila: 900 }, true) - dmg({}, true);
  const zIntelektu = dmg({ intelekt: 900 }, true) - dmg({}, true);
  console.assert(zSily > zIntelektu, `z toporem Sila bije mocniej niz Intelekt (${zSily} vs ${zIntelektu})`);
  console.assert(zIntelektu > 0, 'atrybut poboczny NIE jest martwy — nie ma martwego dropu');

  // ...a rozdzka odwraca uklad: wtedy to Intelekt niesie obrazenia
  const zRozdzka = (add) => {
    const ch2 = newCharacter('T');
    ch2.equipped = { bron: { slot: 'bron', wtype: 'magia', hands: 1, affixes: [], damage: 10, armor: 0 } };
    for (const [k, v] of Object.entries(add)) ch2.attrs[k] += v;
    return computeStats(ch2).damage;
  };
  const magIntelekt = zRozdzka({ intelekt: 900 }) - zRozdzka({});
  const magSila = zRozdzka({ sila: 900 }) - zRozdzka({});
  console.assert(magIntelekt > magSila, `z rozdzka Intelekt bije mocniej niz Sila (${magIntelekt} vs ${magSila})`);

  // Mana rosnie z Intelektu i tylko z niego
  const bezInt = computeStats(newCharacter('T')).maxMana;
  const zInt = newCharacter('T'); zInt.attrs.intelekt = 20;
  console.assert(computeStats(zInt).maxMana > bezInt, 'Intelekt daje mane');
  const zSila = newCharacter('T'); zSila.attrs.sila = 20;
  console.assert(computeStats(zSila).maxMana === bezInt, 'Sila many nie daje');

  // Wytrzymałość nie jest osią obrażeń
  console.assert(dmg({ witalnosc: 30 }) === dmg(), 'Witalnosc nie daje obrazen');

  // Wartość Wytrzymałości rośnie razem z poziomem i nadąża za endgame.
  const hpNiski = newCharacter('HP1'); hpNiski.attrs.witalnosc = 100;
  const hpWysoki = newCharacter('HP200'); hpWysoki.attrs.witalnosc = 100; hpWysoki.maxFloor = 200;
  const niskiBezSta = newCharacter('HP1b');
  const wysokiBezSta = newCharacter('HP200b'); wysokiBezSta.maxFloor = 200;
  const wartoscStaNisko = computeStats(hpNiski).maxHp - computeStats(niskiBezSta).maxHp;
  const wartoscStaWysoko = computeStats(hpWysoki).maxHp - computeStats(wysokiBezSta).maxHp;
  console.assert(wartoscStaWysoko >= wartoscStaNisko * 2.9,
    `Wytrzymalosc na 200 poziomie daje prawie 3x HP (${wartoscStaNisko} -> ${wartoscStaWysoko})`);

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

  // ---- skille bojowe: RODZINA BRONI JEST SKILLEM ----
  const w2h = { slot: 'bron', wtype: 'dwureczna', hands: 2, affixes: [], damage: 10, armor: 0 };
  const w1h = { slot: 'bron', wtype: 'jednoreczna', hands: 1, affixes: [], damage: 6, armor: 0 };
  const rozdzka = { slot: 'bron', wtype: 'magiczne', hands: 1, affixes: [], damage: 6, armor: 0 };
  const kostur = { slot: 'bron', wtype: 'magiczne', hands: 2, affixes: [], damage: 10, armor: 0 };
  const luk = { slot: 'bron', wtype: 'dystansowe', hands: 2, affixes: [], damage: 9, armor: 0 };
  const tarcza = { slot: 'offhand', wtype: 'tarcza', affixes: [], damage: 0, armor: 5 };
  const kordelas = { slot: 'offhand', wtype: 'jednoreczna', hands: 1, affixes: [], damage: 4, armor: 0 };

  const podzial = (bron, off) => {
    const t = newCharacter('T');
    t.equipped = {}; if (bron) t.equipped.bron = bron; if (off) t.equipped.offhand = off;
    return skillSplit(t);
  };
  console.assert(podzial(w2h).dwureczna === 1, 'topor expi Bron dwureczna');
  console.assert(podzial(w1h).jednoreczna === 1, 'miecz expi Bron jednoreczna');
  console.assert(podzial(luk).dystansowe === 1, 'luk expi Bron dystansowa');
  // KOSTUR JEST DWURECZNY, ALE NIE EXPI BRONI DWURECZNEJ
  console.assert(podzial(kostur).magiczne === 1 && !podzial(kostur).dwureczna,
    'kostur expi Przyrzady magiczne, nie Bron dwureczna');
  console.assert(podzial(w1h, tarcza).jednoreczna === 0.5 && podzial(w1h, tarcza).obrona === 0.5,
    'jednoreczna + tarcza: 50/50 bron i Ekwipunek defensywny');
  console.assert(podzial(rozdzka, kordelas).magiczne === 1,
    'druga bron nie zmienia rodziny, ktora expisz');
  console.assert(podzial(null).jednoreczna === 1, 'gole piesci ida w jednoreczna');
  console.assert(podzial(w2h).obrona > 0, 'Ekwipunek defensywny rosnie z samego udzialu w walce');
  // WITALNOSC SKASOWANA
  console.assert(!C.combatSkills.list.witalnosc, 'Witalnosc skasowana');

  const wojak = newCharacter('T'); wojak.equipped = { bron: rozdzka };
  addCombatXp(wojak, 500);
  console.assert(wojak.cskills.magiczne.lvl > 1, 'rozdzka podbija Przyrzady magiczne');
  console.assert(wojak.cskills.dwureczna.lvl === 1, 'dwureczna stoi, gdy sie nia nie bije');

  // ---- drzewka skilli ----
  const drzew = newCharacter('T');
  drzew.equipped = { bron: rozdzka }; drzew.attrs.intelekt = 50;
  drzew.cskills.magiczne.lvl = 21;                 // 20 poziomow = 20 punktow
  console.assert(punktySkilla(drzew, 'magiczne') === 20, 'poziom daje punkt drzewka');
  const bezPunktow = computeStats(drzew).damage;
  for (let i = 0; i < 10; i++) wydajPunktSkilla(drzew, 'mg_moc');
  console.assert(wydanePunkty(drzew, 'magiczne') === 10, 'punkty sie zapisuja');
  console.assert(computeStats(drzew).damage > bezPunktow, 'wezel obrazen podbija obrazenia');
  console.assert(!wydajPunktSkilla(drzew, 'mg_moc').ok, 'wezel ma maksymalna range');

  // punkty z INNEJ rodziny nie pomagaja
  const zBroni = computeStats(drzew).damage;
  drzew.equipped = { bron: luk };
  console.assert(computeStats(drzew).damage < zBroni, 'drzewko rozdzki nie dziala przy luku');

  // reset oddaje punkty
  const r = resetDrzewkaSkilla(drzew, 'magiczne');
  console.assert(r.ok && r.wrocilo === 10 && wydanePunkty(drzew, 'magiczne') === 0, 'reset oddaje punkty');

  // Ekwipunek defensywny dziala ZAWSZE, niezaleznie od broni
  const tank = newCharacter('T');
  tank.equipped = { napiersnik: { slot: 'napiersnik', affixes: [], damage: 0, armor: 100 } };
  const bezOb = computeStats(tank).armor;
  tank.cskills.obrona.lvl = 11;
  for (let i = 0; i < 10; i++) wydajPunktSkilla(tank, 'ob_ciuchy');
  console.assert(computeStats(tank).armor > bezOb, 'Ciuchy podbijaja pancerz');

  // Dwureczna zdejmuje tarcze i nie wpuszcza nowej
  const rycerz = newCharacter('T');
  rycerz.maxFloor = 50;
  rycerz.equipped = { offhand: { ...tarcza, id: 'T1' } };
  rycerz.backpack = [{ ...w2h, id: 'D1', reqLevel: 1 }, { ...tarcza, id: 'T2', reqLevel: 1 }];
  const r1 = equip(rycerz, 'D1');
  console.assert(r1.ok && !rycerz.equipped.offhand, 'dwureczna zdejmuje tarcze');
  console.assert(rycerz.backpack.some(i => i.id === 'T1'), 'zdjeta tarcza wraca do plecaka');
  console.assert(!equip(rycerz, 'T2').ok, 'przy dwurecznej tarcza nie wchodzi');

  // Dwa zestawy PvE są fizycznie osobne, a przełączenie podmienia aktywny bez
  // kopiowania przedmiotów. Dungeon może więc wymusić drugą rodzinę broni.
  const load = newCharacter('Loadout');
  load.backpack = [{ ...w2h, id: 'B1', reqLevel: 1, base: 'Młot' }];
  console.assert(equip(load, 'B1', 'pve_b').ok, 'da sie ubrac nieaktywny zestaw B');
  console.assert(load.equipped.bron?.id !== 'B1' && pveGear(load, 'b').bron?.id === 'B1',
    'zestaw B nie zmienia aktywnego A podczas ubierania');
  switchPveLoadout(load, 'b');
  console.assert(load.pveLoadout === 'b' && load.equipped.bron?.id === 'B1',
    'przelaczenie aktywuje caly zestaw B');

  console.log('character.js — wszystkie testy przeszly');
}

if (process.argv[1] && process.argv[1].endsWith('character.js')) demo();
