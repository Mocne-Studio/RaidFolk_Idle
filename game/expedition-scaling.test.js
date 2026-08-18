// Regresja skalowania Wypraw. Test czysty: nie uruchamia serwera i nie dotyka bazy.

import CONFIG from './config.js';
import { expeditionEnemyLevel } from './content.js';
import { playerArmorEffect } from './combat.js';

let errors = 0;
const ok = (condition, message) => {
  if (!condition) { errors++; console.error('  NIE PRZESZLO:', message); }
};

const list = Object.values(CONFIG.expedition.lista);
const ranges = list.map(x => x.ilvl.join('-'));

ok(ranges.join(',') === '1-10,10-20,20-30,30-40,40-50,50-60,60-70,70-80,80-90,90-100,100-125,125-150,150-175,175-200',
  'lista wypraw pokrywa droge od 1 do 200, a powyzej 100 idzie co 25 poziomow');

for (let i = 1; i < list.length; i++) {
  ok(list[i - 1].ilvl[1] === list[i].ilvl[0],
    `brak przerwy miedzy ${list[i - 1].label} i ${list[i].label}`);
}

const puszcza = CONFIG.expedition.lista.puszcza;
const ruiny = CONFIG.expedition.lista.ruiny;
const tron = CONFIG.expedition.lista.tronkonca;

ok(expeditionEnemyLevel(puszcza.ilvl, 0, 12, 0) === 1, 'Puszcza zaczyna sie mobem poziomu 1');
ok(expeditionEnemyLevel(puszcza.ilvl, 11, 12, 0) === 10, 'boss Puszczy ma poziom 10');
ok(expeditionEnemyLevel(ruiny.ilvl, 0, 24, 0) === 100, 'Prastare Ruiny zaczynaja sie na 100');
ok(expeditionEnemyLevel(ruiny.ilvl, 23, 24, 0) === 125, 'Prastare Ruiny koncza sie na 125');
ok(expeditionEnemyLevel(tron.ilvl, 47, 48, 3) === 203, 'Profesjonalista na koncu Tronu ma poziom 203');
ok(expeditionEnemyLevel(puszcza.ilvl, 0, 12, -2) === 1, 'offset niskiego ryzyka nie schodzi ponizej 1');

// Boss ma dużo zdrowia, ale nie może dziedziczyć tego samego mnożnika obrażeń.
// Na Profesjonaliście dawny układ dawał 1,30 × 2,40 = 3,12 bazowego ataku.
ok(CONFIG.expedition.bossHpMult === 2.4, 'boss zachowuje mnoznik zdrowia 2,40');
ok(CONFIG.expedition.bossDmgMult === 1, 'boss nie dostaje dodatkowego mnoznika obrazen');
ok(Math.abs(CONFIG.expedition.risks.pro.mob * CONFIG.expedition.bossDmgMult - 1.30) < 1e-9,
  'boss Profesjonalisty zadaje 1,30 bazowego ataku zamiast 3,12');
ok(CONFIG.expedition.healAfterWinPct === 0.08,
  'wygrana walka wyprawy odnawia 8% maksymalnego HP');
ok(CONFIG.combat.playerArmorEffectMult === 1.25,
  'Obrona gracza ma do 25% wieksza skutecznosc');
ok(playerArmorEffect(10) === 1, 'poczatek Wiezy nie dostaje buffa Obrony');
ok(playerArmorEffect(100) === 1.25, 'od poziomu 100 dziala pelny buff Obrony');

if (errors) {
  console.error(`\nexpedition-scaling.test.js — ${errors} BLEDOW`);
  process.exit(1);
}
console.log('expedition-scaling.test.js — wszystkie testy przeszly');
