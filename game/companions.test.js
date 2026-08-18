import assert from 'node:assert/strict';
import { newCharacter, allyStats, slotOpen } from './character.js';
import { createFight, runToEnd, pickTarget, summary } from './combat.js';
import { makeEnemy } from './content.js';

const ch = newCharacter('Dowódca');
const hero = {
  maxHp: 1000, hp: 1000, damage: 100, armor: 200, speed: 100,
  crit: 0.05, critMult: 1.5, accuracy: 0.90, evasion: 0,
};

const warrior = allyStats(hero, { name: 'Tarczownik', rarity: 'common', klasa: 'wojownik' });
const mage = allyStats(hero, { name: 'Iskra', rarity: 'common', klasa: 'mag' });
const paladin = allyStats(hero, { name: 'Świt', rarity: 'common', klasa: 'paladyn' });
const pet = allyStats(hero, { name: 'Wilk', rarity: 'common' }, 'pet');

// Common ma już realną skalę i mechanikę klasy.
assert.equal(warrior.maxHp, 720);
assert.equal(warrior.armor, 144);
assert.equal(warrior.role, 'Obrońca');
assert.equal(warrior.row, 1);
assert.equal(mage.dtype, 'mag');
assert.equal(mage.row, 2);
assert.equal(mage.armorPierce, 0.30);
assert.equal(pet.role, 'Drapieżnik');
assert.ok(pet.bleedMult > 0);

// Trzeci sojusznik otwiera się równo na poziomie 30, nigdy wcześniej.
ch.maxFloor = 29;
assert.equal(slotOpen(ch, 2), false);
ch.maxFloor = 30;
assert.equal(slotOpen(ch, 2), true);

// Przedni obrońca generuje więcej zagrożenia niż bohater i rzeczywiście go zasłania.
const napastnik = { name: 'Wróg', reach: 1, advance: 0, taunt: null };
const cel = pickTarget(napastnik, [
  { ...hero, name: 'Bohater', idx: 0, row: 1, alive: true, threatMult: 1 },
  { ...warrior, idx: 1, row: 1, alive: true },
]);
assert.equal(cel.name, 'Tarczownik');

const dummyHero = { ...hero, name: 'Bohater', damage: 1, speed: 30, row: 1, reach: 1 };
const enemy = (name, row = 1) => ({
  name, hp: 600, maxHp: 600, damage: 1, armor: 100, speed: 30,
  crit: 0, accuracy: 0.9, evasion: 0, row, reach: row === 1 ? 1 : 3,
});

// Mag uderza falą także drugi cel, pet zakłada krwawienie, a paladyn leczy.
const magFight = runToEnd(createFight({ party: [dummyHero, mage],
  enemies: [enemy('Przód'), enemy('Tył', 3)], poziom: 20 }, 123));
assert.ok(magFight.log.some(x => /fala/.test(x.text)), 'mag powinien razić grupę');

const petFight = runToEnd(createFight({ party: [dummyHero, pet], enemies: [enemy('Cel')], poziom: 20 }, 456));
assert.ok(petFight.log.some(x => /krwawi/.test(x.text)), 'pet powinien nakładać krwawienie');
assert.ok(petFight.log.some(x => /Krwawienie/.test(x.text)), 'krwawienie powinno zadawać obrażenia');

const woundedHero = { ...dummyHero, hp: 300 };
const healFight = runToEnd(createFight({ party: [woundedHero, paladin], enemies: [enemy('Manekin')], poziom: 20 }, 789));
assert.ok(healFight.log.some(x => x.kind === 'heal' && /Strażnik/.test(x.text)),
  'paladyn powinien leczyć ranną drużynę');

// API walki nie może ponownie zgubić rzędu, slotu ani roli potrzebnych arenie.
const publicFight = summary(magFight);
assert.equal(publicFight.party[1].row, 2);
assert.equal(publicFight.party[1].role, 'Arkanista');
assert.equal(publicFight.party[1].slot, 1);

// Wojownik przeciwnika ma zasięg wręcz, więc tylny rząd naprawdę jest dalej.
const frontEnemy = makeEnemy(3, 0, 'normal');
if (frontEnemy.row === 1) assert.equal(frontEnemy.reach, 1);

console.log('companions.test.js — wszystkie testy przeszły');
