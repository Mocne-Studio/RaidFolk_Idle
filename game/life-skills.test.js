import assert from 'node:assert/strict';
import CONFIG from './config.js';
import { newCharacter, canGather, computeStats, migrate } from './character.js';
import {
  fishingOutcome, farmingOutcome, cookFood, eatFood, foodEffects,
  professionCycleMs, cleanupFoodBuffs,
} from './professions.js';

const seq = (...values) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

const fish = CONFIG.skills.rybolowstwo;
const farm = CONFIG.skills.rolnictwo;
const cooking = CONFIG.skills.gotowanie;

// Trzy profesje mają niezależną drabinkę 1–100 i dane domenowe w config.
assert.equal(fish.maxLevel, 100);
assert.equal(farm.maxLevel, 100);
assert.equal(cooking.maxLevel, 100);
assert.ok(fish.resources.length >= 4);
assert.ok(farm.resources.length >= 35);
assert.ok(cooking.resources.length >= 30);

// Level gating korzysta ze wspólnego canGather().
const gated = newCharacter('Bramki');
assert.equal(canGather(gated, 'rybolowstwo', 'staw').ok, true);
assert.match(canGather(gated, 'rybolowstwo', 'wybrzeze').reason, /Wymaga Wędkarstwo 5/);
assert.equal(canGather(gated, 'rolnictwo', 'ziemniak').ok, true);
assert.match(canGather(gated, 'rolnictwo', 'krowa_mleko').reason, /25/);
assert.match(canGather(gated, 'gotowanie', 'pieczonylosos').reason, /40/);

// Fishing: deterministyczna tabela wagowa, zwykła ryba nie znika na wysokim
// poziomie, rare boost zmienia wynik i double catch daje dwie sztuki.
const pond = fish.resources.find(x => x.id === 'staw');
assert.deepEqual(fishingOutcome(pond, 1, {}, seq(0, 0.9)),
  { id: 'sardynka', label: 'Sardynka', rarity: 'common', count: 1, xp: 8 });
assert.equal(fishingOutcome(pond, 100, {}, seq(0, 0.9)).id, 'sardynka');
assert.equal(fishingOutcome(pond, 100, { doubleCatchChance: 1 }, seq(0, 0)).count, 2);
const rareSpot = { catchTable: [
  { id: 'c', label: 'Common', lvl: 1, weight: 99, xp: 1, rarity: 'common' },
  { id: 'r', label: 'Rare', lvl: 1, weight: 1, xp: 5, rarity: 'rare' },
] };
assert.equal(fishingOutcome(rareSpot, 1, {}, seq(0.75, 1)).id, 'c');
assert.equal(fishingOutcome(rareSpot, 1, { rareCatchChance: 100 }, seq(0.75, 1)).id, 'r');

// Farming: zakres plonu, wiele outputów jednego zwierzęcia i bonus wydajności.
const potato = farm.resources.find(x => x.id === 'ziemniak');
assert.equal(farmingOutcome(potato, {}, () => 0).outputs[0].count, 4);
assert.equal(farmingOutcome(potato, {}, () => 0.999).outputs[0].count, 7);
assert.equal(farmingOutcome(potato, { yieldPct: 0.5 }, () => 0).outputs[0].count, 6);
const sheep = farm.resources.find(x => x.id === 'owca_produkty');
const sheepOut = farmingOutcome(sheep, {}, () => 0);
assert.deepEqual(sheepOut.outputs.map(x => x.id), ['mlekoowcze', 'welna']);
assert.equal(sheep.animalMode, 'renewable');
assert.equal(farm.resources.find(x => x.id === 'krowa_mieso').animalMode, 'harvest');

// Składniki mikstur nie mogą dziedziczyć minutowego tempa zwykłych upraw.
// Alchemia jest jedynym źródłem leczenia, więc cały zestaw ziół ma krótki cykl.
for (const id of ['ziolo', 'ziologorzk', 'korzennocny', 'kwiatciern']) {
  assert.ok(farm.resources.find(x => x.id === id).ms <= 22_000,
    `${id} powinno nadawać się do bieżącej produkcji mikstur`);
}

// Cooking: brak składników niczego nie niszczy; poprawny craft konsumuje oba
// źródła i tworzy przewidywalny Food Item bez jakości i failure.
const flow = newCharacter('Flow');
const sardineMeal = cooking.resources.find(x => x.id === 'sardynkazziemniakiem');
assert.match(cookFood(flow, sardineMeal).error, /Brak/);
flow.materials = { sardynka: 1, ziemniak: 1 };
assert.equal(cookFood(flow, sardineMeal).ok, true);
assert.equal(flow.materials.sardynka, undefined);
assert.equal(flow.materials.ziemniak, undefined);
assert.equal(flow.materials.sardynkazziemniakiem, 1);

// Jeden Main Meal zastępuje poprzedni. Drink i Dessert nie ruszają Main Meal
// ani siebie nawzajem; wszystko przeżywa JSON persistence.
const salmon = cooking.resources.find(x => x.id === 'pieczonylosos');
const beef = cooking.resources.find(x => x.id === 'stekzwarzywami');
const drink = cooking.resources.find(x => x.id === 'herbataziolowa');
const dessert = cooking.resources.find(x => x.id === 'ciastomiodowe');
flow.materials = { [salmon.id]: 1, [beef.id]: 1, [drink.id]: 1, [dessert.id]: 1 };
assert.equal(eatFood(flow, salmon.id).slot, 'main_meal');
assert.equal(flow.foodBuffs.main_meal.id, salmon.id);
assert.equal(eatFood(flow, beef.id).slot, 'main_meal');
assert.equal(flow.foodBuffs.main_meal.id, beef.id);
eatFood(flow, drink.id);
eatFood(flow, dessert.id);
assert.equal(flow.foodBuffs.main_meal.id, beef.id);
assert.equal(flow.foodBuffs.drink.id, drink.id);
assert.equal(flow.foodBuffs.dessert.id, dessert.id);
const restored = JSON.parse(JSON.stringify(flow));
assert.equal(restored.foodBuffs.drink.walki, flow.foodBuffs.drink.walki);

// Generyczne efekty mają trzy różne tożsamości domenowe.
const fishBuild = newCharacter('Fish'); fishBuild.materials[salmon.id] = 1;
const fishSpeed = computeStats(fishBuild).attackSpeed;
eatFood(fishBuild, salmon.id);
assert.ok(computeStats(fishBuild).attackSpeed > fishSpeed, 'Fish Meal podbija Attack Speed');

const meatBuild = newCharacter('Meat'); meatBuild.materials[beef.id] = 1;
const meatBase = computeStats(meatBuild);
eatFood(meatBuild, beef.id);
const meatBuffed = computeStats(meatBuild);
assert.ok(meatBuffed.maxHp > meatBase.maxHp && meatBuffed.damage > meatBase.damage,
  'Meat Meal podbija HP i Atak');

const veg = cooking.resources.find(x => x.id === 'warzywnecurry');
const gatherer = newCharacter('Veg'); gatherer.materials[veg.id] = 1;
const baseCycle = professionCycleMs(gatherer, 'rolnictwo', potato);
eatFood(gatherer, veg.id);
assert.ok(professionCycleMs(gatherer, 'rolnictwo', potato) < baseCycle,
  'Vegetarian Meal przyspiesza profesje zamiast udawać Meat Meal');

// Jedzenie przypisuje się konkretnej jednostce i nie wzmacnia właściciela.
const assigned = newCharacter('Assigned');
assigned.collection.companions.push({ name: 'Grom', rarity: 'common' });
assigned.materials[salmon.id] = 1;
assert.equal(eatFood(assigned, salmon.id, { kind: 'ally', idx: 0 }).slot, 'main_meal');
assert.equal(foodEffects(assigned).attackSpeedPct, undefined);
assert.ok(foodEffects(assigned.collection.companions[0]).attackSpeedPct > 0);
assert.equal(assigned.collection.companions[0].foodBuffs.main_meal.walki, salmon.food.walki);
assigned.collection.companions[0].foodBuffs.main_meal.walki = 0;
cleanupFoodBuffs(assigned.collection.companions[0]);
assert.equal(assigned.collection.companions[0].foodBuffs.main_meal, null);

// Stan aktywności jest offline-safe: start i koniec przeżywają serializację.
flow.activity = { skill: 'rolnictwo', res: 'ziemniak', since: 1000, finishAt: 31_000, ms: 30_000 };
assert.deepEqual(JSON.parse(JSON.stringify(flow)).activity, flow.activity);

// Patch skracający profesję aktualizuje też timer, który był już zapisany.
const legacyTimer = newCharacter('Stary timer');
legacyTimer.activity = { skill: 'rolnictwo', res: 'ziolo', since: 1000, finishAt: 41_000, ms: 40_000 };
migrate(legacyTimer);
assert.equal(legacyTimer.activity.ms, 8_000);
assert.equal(legacyTimer.activity.finishAt, 9_000);

console.log('life-skills.test.js — wszystkie testy przeszły');
