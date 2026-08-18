// Regresja łupu Wypraw: równe sloty, niezmienione rzadkości i jedno losowanie dropu.

import assert from 'node:assert/strict';
import C from './config.js';
import { mulberry32, rollItem, rollDrops } from './content.js';

const pool = C.expedition.lista.puszcza.drops;
const slots = ['bron', 'offhand', 'helm', 'napiersnik', 'buty', 'rekawice', 'pierscien', 'amulet'];
const counts = Object.fromEntries(slots.map(x => [x, 0]));
const N = 80_000;

for (let seed = 1; seed <= N; seed++) {
  const item = rollItem(mulberry32(seed), {
    ilvl: 10, weights: C.loot.weightsNormal, pool, zakres: [1, 10],
  });
  counts[item.slot]++;
}

for (const slot of slots) {
  const share = counts[slot] / N;
  assert.ok(share > 0.118 && share < 0.132,
    `${slot} powinien mieć około 12,5%, ma ${(share * 100).toFixed(2)}%`);
}

// Rzadkości zostały dokładnie takie jak przed zmianą rozkładu slotów.
assert.deepEqual(C.loot.weightsNormal,
  { common: 45000, uncommon: 49000, unique: 5000, heroic: 1000,
    legendary: 0, mystic: 0, god: 0 });
assert.deepEqual(C.loot.weightsBoss,
  { common: 44599, uncommon: 49000, unique: 5000, heroic: 1000,
    legendary: 300, mystic: 100, god: 1 });

const args = { floor: 10, variant: 'plus', pool, zakres: [1, 10] };
assert.equal(rollDrops(123, { ...args, dropChance: 0 }).length, 0,
  '0% bonusu nie przechodzi przez ukryte drugie losowanie');
assert.equal(rollDrops(123, { ...args, dropChance: 1 }).length, 1,
  '100% szansy daje dokładnie jeden drop bez drugiego rzutu 55%');
const boss = rollDrops(123, { ...args, variant: 'boss', dropChance: 0 });
assert.ok(boss.length >= C.loot.bossDropCount[0] && boss.length <= C.loot.bossDropCount[1],
  'boss zawsze otwiera skrzynię 3–6 przedmiotów');

// Dungeon wykonuje osobny rzut dla każdego moba. Ta tabela świadomie kończy
// się na Unique, nawet gdy globalna tabela zwykłego łupu dopuszcza Heroic.
const dungeonPool = C.dungeons.lista.gniazdocierni.drops;
const mobRarities = new Set();
let mobDrops = 0;
for (let seed = 1; seed <= 5000; seed++) {
  const rolled = rollDrops(seed, {
    floor: 10, variant: 'normal', pool: dungeonPool, zakres: [1, 25],
    customWeights: C.dungeons.weightsMob, dropChance: C.dungeons.mobDropChance,
  });
  mobDrops += rolled.length;
  for (const item of rolled) mobRarities.add(item.rarity);
}
assert.ok(mobDrops > 330 && mobDrops < 470,
  `8% na moba powinno dać około 400/5000 dropów, jest ${mobDrops}`);
assert.ok([...mobRarities].every(r => ['common', 'uncommon', 'unique'].includes(r)),
  'zwykły mob nigdy nie wyrzuca Heroic, Legendary, Mystic ani God');
assert.ok(mobRarities.has('unique'), 'zwykły mob ma realną szansę wyrzucić Unique');

console.log('loot-distribution.test.js — wszystkie testy przeszły');
