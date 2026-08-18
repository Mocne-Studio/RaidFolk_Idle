// Kontrakt Dungeonów: jawna pula sprzętu, pięć komnat i prototyp posiłków.
import CONFIG from './config.js';

const C = CONFIG;
let bledy = 0;
const ok = (warunek, opis) => {
  if (!warunek) { bledy++; console.error('  NIE PRZESZLO:', opis); }
};

const PORT = process.env.TEST_PORT ?? 8099;
const BASE = `http://localhost:${PORT}`;
async function post(path, body = {}) {
  const r = await fetch(`${BASE}/api/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return r.json();
}

async function main() {
  console.log('Testy Dungeonów — serwer na', BASE);
  const lista = Object.values(C.dungeons.lista);
  ok(lista.length === 8, 'jest 8 dungeonow pokrywajacych poziomy 1–200');
  ok(C.dungeons.nodes.join(',') === 'walka,walka,elita,walka,boss', 'run ma dokladnie 5 ustalonych komnat');
  ok(C.dungeons.normalDropChance === 0.30, 'zwykla komnata ma 30% szansy');
  ok(C.dungeons.eliteDropChance === 1, 'elita gwarantuje przedmiot');
  ok(C.dungeons.mobDropChance === 0.08 && C.dungeons.eliteMobDropChance === 0.15,
    'kazdy mob ma osobny rzut, a elita ma wyzsza szanse');
  ok(C.dungeons.weightsMob.unique === 2000 && C.dungeons.weightsMob.heroic === 0,
    'drop z moba dochodzi do Unique, ale nie wchodzi w nagrody bossa');
  ok(C.dungeons.packs.walka.length === 1, 'zwykla komnata ma glownego wroga i wartownika');
  ok(C.dungeons.packs.elita.length === 1, 'elita ma ochroniarza');
  ok(C.dungeons.packs.boss.length === 2, 'boss ma dwoch straznikow');
  const prototyp = C.dungeons.lista.gniazdocierni;
  ok(prototyp.rooms.length === 5, 'Gniazdo ma piec etapow wyniszczenia');
  ok(prototyp.rooms.reduce((n, r) => n + r.enemies, 0) === 88, 'caly run ma 88 przeciwnikow');
  ok(prototyp.rooms.every(r => r.active === 5), 'kazdy etap wystawia pieciu aktywnych');
  ok(prototyp.rooms[0].unitHp >= 0.38 && prototyp.rooms[0].unitDmg >= 0.18,
    'zwykle posilki nie sa papierowymi atrapami');
  ok(prototyp.rooms[3].unitHp > prototyp.rooms[0].unitHp
    && prototyp.rooms[3].unitDmg > prototyp.rooms[0].unitDmg,
    'glebsze komnaty sa mocniejsze od wejscia');
  ok(C.dungeons.partyHpPerExtra === 0.16 && C.dungeons.partyDmgPerExtra === 0.08,
    'pelna druzyna wzmacnia loch, ale mniej niz wnosi dodatkowa jednostka');
  ok(prototyp.rooms[2].hazard?.reflectByType?.slash === 0.08, 'elita ma jawny Cierniowy Odwet');
  ok(prototyp.resists.slash === 0.35 && prototyp.resists.smash === -0.25,
    'profil wymusza zmiane Slash na Smash');
  ok(lista.every(d => d.drops.length === 12), 'kazdy dungeon pokazuje 12 konkretnych przedmiotow');
  ok(lista.every(d => d.drops.some(x => /^Młot /.test(x.base))), 'kazdy dungeon ma bron Smash w jawnej puli');
  ok(lista.every(d => d.drops.some(x => x.slot === 'bron') && d.drops.some(x => x.slot === 'napiersnik')),
    'kazda pula zawiera bron i pancerz');
  ok(lista.at(-1).ilvl[1] === 200, 'ostatni dungeon domyka poziom 200');

  const created = await post('new', { name: `DungeonTest${Date.now()}` });
  const start = await post('dungeonstart', { token: created.token, id: 'gniazdocierni' });
  ok(!start.error, `endpoint uruchamia dungeon (${start.error ?? 'ok'})`);
  const state = (await post('state', { token: created.token })).state;
  ok(state.expedition?.kind === 'dungeon', 'stan rozroznia dungeon od wyprawy');
  ok(state.expedition?.enemies?.length === 5, 'pierwsza komnata pokazuje pieciu aktywnych przeciwnikow');
  ok(state.expedition?.encounter?.enemies === 20 && state.expedition?.encounter?.queued === 15,
    'API pokazuje pelna kolejke pierwszej komnaty');
  ok(state.expedition?.encounter?.resists?.slash === 0.35, 'API ujawnia odpornosci przed walka');
  ok(state.expedition?.nodes.length === 5, 'API zwraca piec komnat');
  const dungeonView = state.dungeonLista.find(x => x.id === 'gniazdocierni');
  ok(dungeonView?.mobChance === 0.08 && dungeonView?.eliteMobChance === 0.15,
    'API jawnie pokazuje szanse dropu z kazdego moba');
  ok(state.expedition?.sakwaCount === 0 && state.expedition?.mats.length === 0, 'dungeon zaczyna z pusta skrzynia bez materialow');
  const loadout = await post('pveloadout', { token: created.token, id: 'b' });
  ok(loadout.active === 'b' && loadout.state?.pveLoadout === 'b', 'miedzy komnatami mozna aktywowac zestaw PvE B');
  await post('expleave', { token: created.token });

  if (bledy) { console.error(`\ndungeons.test.js — ${bledy} BLEDOW`); process.exit(1); }
  console.log('dungeons.test.js — wszystkie testy przeszly');
}

main().catch(e => { console.error('Test nie mogl sie polaczyc z serwerem:', e.message); process.exit(1); });
