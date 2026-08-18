import assert from 'node:assert/strict';
import CONFIG from './config.js';
import { newCharacter, addSkillXp, equip } from './character.js';
import { miningBonuses, miningCycleMs, effectiveGemChance, mineOutcome,
         qualityChances, rollQuality, smithRecipe, craftProduct, equipMining,
         furnaceCoal, transferFurnaceCoal, consumeFurnaceFuel } from './professions.js';

const seq = (...values) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

// Dokładna drabinka rud 1–90; poziom 100 jest mistrzostwem bez nowej rudy.
const ores = CONFIG.skills.gornictwo.resources.filter(r => r.kind === 'ore');
assert.deepEqual(ores.map(r => r.lvl), [1, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
assert.deepEqual(ores.map(r => r.id),
  ['miedz', 'zelazo', 'wegiel', 'srebro', 'zloto', 'mithril', 'adamantyt', 'runite', 'mistycznaruda', 'niebianskaruda']);
const magicNodes = CONFIG.skills.gornictwo.resources.filter(r => r.kind === 'magic');
assert.deepEqual(magicNodes.map(r => r.lvl), [4, 9, 23, 41, 67]);
assert.ok(magicNodes.every(r => r.category === 'magic'));

// Każdy cykl zawsze daje rudę i XP; kontrolowany RNG wymusza podwójną rudę,
// konkretny klejnot i jego podwojenie.
const copper = ores[0];
const mined = mineOutcome(copper,
  { doubleOre: 1, gemFind: 999, rareGemFind: 0, doubleGem: 1, miningXp: 0.5 },
  seq(0, 0, 0, 0));
assert.deepEqual(mined, { ore: 2, gem: 'topaz', gems: 2, xp: 12 });
assert.equal(effectiveGemChance({ gemFind: 2 }), 0.003, 'gem find jest mnożnikiem bazowego 0,10%');

// Wyposażenie profesji jest oddzielone od bojowego plecaka i rzeczywiście
// przyspiesza cykl, także po serializacji istniejącego save JSON.
const ch = newCharacter('Tester');
const mithrilPick = smithRecipe('mithril_pickaxe');
const pick = craftProduct(mithrilPick, 100, () => 0.80, 'pick-1');
assert.equal(pick.profession, 'mining');
assert.equal(pick.quality, 'superior');
assert.equal(pick.reqMiningLevel, 60);
ch.miningInventory.push(pick);
assert.match(equipMining(ch, pick.id).error, /Wymaga Górnictwa 60/);
ch.prof.gornictwo.lvl = 100;
assert.equal(equipMining(ch, pick.id).ok, true);
assert.equal(ch.backpack.length, 0);
assert.ok(miningBonuses(ch).miningSpeed > 0);
assert.ok(miningCycleMs(ch, ores[5]) < ores[5].ms);
const restored = JSON.parse(JSON.stringify(ch));
assert.equal(restored.miningEquipment.pickaxe.canonicalId, 'mithril_pickaxe');

// Piec przechowuje Węgiel osobno. Przeniesienie zachowuje łączną liczbę,
// a wytop pobiera paliwo wyłącznie z zasobnika pieca.
ch.materials.wegiel = 17;
assert.equal(transferFurnaceCoal(ch, 'deposit', 10).moved, 10);
assert.equal(ch.materials.wegiel, 7);
assert.equal(furnaceCoal(ch), 10);
assert.equal(consumeFurnaceFuel(ch, 2), true);
assert.equal(furnaceCoal(ch), 8);
assert.equal(consumeFurnaceFuel(ch, 9), false);
assert.equal(furnaceCoal(ch), 8);
assert.equal(transferFurnaceCoal(ch, 'withdraw', 'all').moved, 8);
assert.equal(ch.materials.wegiel, 15);
assert.equal(furnaceCoal(ch), 0);
const copperBar = smithRecipe('sztabamiedzi');
const mithrilBar = smithRecipe('sztabamithril');
assert.deepEqual(copperBar.koszt, { miedz: 3 });
assert.equal(copperBar.fuel, 1);
assert.deepEqual(mithrilBar.koszt, { mithril: 3 });
assert.equal(mithrilBar.fuel, 2);

// PvE, PvP i Skill są trzema niezależnymi zestawami. PvP korzysta ze wspólnego
// plecaka bojowego, ale nie podmienia aktywnego zestawu używanego w przygodach.
const pvpItem = { id: 'pvp-1', name: 'Testowy miecz PvP', base: 'Testowy miecz PvP',
  slot: 'bron', wtype: 'jednoreczna', hands: 1, reqLevel: 1, rarity: 'common',
  ilvl: 1, plus: 0, damage: 10, armor: 0, affixes: [] };
ch.backpack.push(pvpItem);
const pveWeapon = ch.equipped.bron;
assert.equal(equip(ch, pvpItem.id, 'pvp').ok, true);
assert.equal(ch.pvpEquipment.bron.id, pvpItem.id);
assert.equal(ch.equipped.bron.id, pveWeapon.id);
assert.equal(ch.miningEquipment.pickaxe.id, pick.id);

// Kotwice jakości i wstrzykiwany RNG.
assert.deepEqual(qualityChances(50, 50), { normal: 75, fine: 20, superior: 4.5, masterwork: 0.5 });
assert.deepEqual(qualityChances(80, 50), { normal: 45, fine: 35, superior: 17, masterwork: 3 });
assert.equal(rollQuality(100, 50, () => 0.99), 'masterwork');

// Jakość nigdy nie awansuje zwykłego craftu do kanonicznej rzadkości bossa.
const generic = craftProduct(mithrilPick, 100, () => 0.999, 'pick-2');
assert.equal(generic.quality, 'masterwork');
assert.equal(generic.rarity, 'common');
assert.equal(generic.source, 'crafted');

// Receptura specjalna wymaga rdzenia w danych kosztu, ma stałe Unique i nie
// przechodzi przez generic quality niezależnie od RNG.
const bossRecipe = smithRecipe('straznik_cierni');
assert.equal(bossRecipe.koszt.cierniowyrdzen, 1);
const withoutBossMat = { sztabamithril: 99, rubin: 99 };
assert.equal(Object.entries(bossRecipe.koszt).every(([id, n]) => (withoutBossMat[id] ?? 0) >= n), false);
withoutBossMat.cierniowyrdzen = 1;
assert.equal(Object.entries(bossRecipe.koszt).every(([id, n]) => (withoutBossMat[id] ?? 0) >= n), true);
const bossItem = craftProduct(bossRecipe, 100, () => 0.999, 'boss-1');
assert.equal(bossItem.rarity, 'unique');
assert.equal(bossItem.source, 'boss_crafted');
assert.equal(bossItem.quality, 'normal');

// Profesje 1–100 nie przelewają XP powyżej limitu.
ch.prof.gornictwo = { lvl: 99, xp: 0 };
addSkillXp(ch, 'gornictwo', 1_000_000);
assert.deepEqual(ch.prof.gornictwo, { lvl: 100, xp: 0 });

console.log('professions.test.js — wszystkie testy przeszły');
