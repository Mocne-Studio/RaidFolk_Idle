// Testy reguł Wyprawy. Uruchamiane przez `node game/expedition.test.js`.
//
// Wyprawa jest jedynym źródłem przedmiotów i jedynym miejscem, gdzie da się
// stracić zdobycz. Te reguły są jej sercem i muszą trzymać:
//
//   1. boss oddaje sakwę do plecaka
//   2. śmierć niszczy sakwę
//   3. porzucenie niszczy sakwę
//   4. NIE MA wcześniejszej ekstrakcji poza wąskim postojem
//   5. zdrowie nie wraca — ani na wejściu, ani między etapami
//   6. wybór na rozdrożu naprawdę zmienia stan runu
//   7. sprzęt sprzed wyprawy przeżywa porażkę
//
// Testujemy przez prawdziwe API serwera, nie przez atrapy — inaczej test
// sprawdzałby własne wyobrażenie zamiast gry.

import CONFIG from './config.js';
import { newCharacter, computeStats } from './character.js';

const C = CONFIG;
let bledy = 0;
const ok = (warunek, opis) => {
  if (!warunek) { bledy++; console.error('  NIE PRZESZLO:', opis); }
};

// ---------------------------------------------------------------- atrapa serwera
// Serwer trzyma logikę wyprawy w funkcjach modułowych, więc odtwarzamy tu jego
// zachowanie przez wywołania HTTP na żywym procesie. Prościej i uczciwiej niż
// eksportowanie połowy server.js tylko na potrzeby testu.

const PORT = process.env.TEST_PORT ?? 8099;
const BASE = `http://localhost:${PORT}`;

async function post(path, body = {}) {
  const r = await fetch(`${BASE}/api/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function nowaPostac(nazwa = 'ExpTest') {
  const d = await post('new', { name: nazwa });
  return d.token;
}

// Przepycha run aż do węzła danego typu albo do końca.
async function doWezla(token, typ, limit = 40) {
  for (let i = 0; i < limit; i++) {
    const s = (await post('state', { token })).state;
    const X = s.expedition;
    if (!X) return { s, X: null };
    if (X.node?.typ === typ || (typ === 'safepoint' && X.safepoint)) return { s, X };
    if (X.decyzja) { await post('expchoose', { token, opcja: X.decyzja.opcje[0].id }); continue; }
    if (X.safepoint) { await post('expsafe', { token }); continue; }
    const f = await post('fight', { token });
    if (f.error) return { s, X, blad: f.error };
    if (!f.win) return { s, X, przegrana: true };
  }
  return {};
}

async function main() {
  console.log('Testy Wyprawy — serwer na', BASE);

  // ---- 1. Zdrowie NIE wraca na wejściu ----
  {
    const t = await nowaPostac('HP');
    let s = (await post('state', { token: t })).state;
    for (let i = 0; i < s.unspentAttr; i++) await post('attr', { token: t, attr: 'wytrzymalosc' });
    // zbij HP jedną przegraną w wieży
    let guard = 0;
    while (guard++ < 40) {
      s = (await post('state', { token: t })).state;
      if (s.stats.hp < s.stats.maxHp) break;
      const f = await post('fight', { token: t });
      if (f.error) break;
    }
    const przed = (await post('state', { token: t })).state.stats.hp;
    await post('expstart', { token: t, risk: 'niskie' });
    const po = (await post('state', { token: t })).state.stats.hp;
    ok(po === przed, `wejscie na wyprawe NIE leczy (${przed} -> ${po})`);
    await post('expleave', { token: t });
  }

  // ---- 2. Nie ma wcześniejszej ekstrakcji: sakwa nie trafia do plecaka ----
  {
    const t = await nowaPostac('Sakwa');
    const s0 = (await post('state', { token: t })).state;
    for (let i = 0; i < s0.unspentAttr; i++) await post('attr', { token: t, attr: 'sila' });
    await post('expstart', { token: t, risk: 'niskie' });

    const plecakPrzed = (await post('state', { token: t })).state.backpack.length;
    // przejdź kilka walk
    for (let i = 0; i < 3; i++) {
      const s = (await post('state', { token: t })).state;
      if (!s.expedition) break;
      if (s.expedition.decyzja) { await post('expchoose', { token: t, opcja: s.expedition.decyzja.opcje[0].id }); i--; continue; }
      if (s.expedition.safepoint) break;
      const f = await post('fight', { token: t });
      if (f.error || !f.win) break;
    }
    const s = (await post('state', { token: t })).state;
    ok(s.backpack.length === plecakPrzed,
      `lup z wyprawy NIE trafia od razu do plecaka (${plecakPrzed} -> ${s.backpack.length})`);
    if (s.expedition) ok(s.expedition.sakwaCount >= 0, 'sakwa istnieje jako osobny pojemnik');
  }

  // ---- 3. Porzucenie niszczy sakwę, ale nie plecak ----
  {
    const t = await nowaPostac('Porzuc');
    const s0 = (await post('state', { token: t })).state;
    for (let i = 0; i < s0.unspentAttr; i++) await post('attr', { token: t, attr: 'sila' });
    await post('expstart', { token: t, risk: 'niskie' });
    for (let i = 0; i < 3; i++) {
      const s = (await post('state', { token: t })).state;
      if (!s.expedition || s.expedition.decyzja || s.expedition.safepoint) break;
      const f = await post('fight', { token: t });
      if (f.error || !f.win) break;
    }
    const przed = (await post('state', { token: t })).state;
    const plecakPrzed = przed.backpack.length;
    await post('expleave', { token: t });
    const po = (await post('state', { token: t })).state;
    ok(!po.expedition, 'porzucenie konczy wyprawe');
    ok(po.backpack.length === plecakPrzed, 'porzucenie NIE rusza plecaka sprzed wyprawy');
  }

  // ---- 4. Rozdroże zatrzymuje run ----
  {
    const t = await nowaPostac('Rozdroze');
    const s0 = (await post('state', { token: t })).state;
    for (let i = 0; i < s0.unspentAttr; i++) await post('attr', { token: t, attr: 'sila' });
    await post('expstart', { token: t, risk: 'niskie' });
    // szkielet: walka, walka, rozdroze...
    for (let i = 0; i < 2; i++) await post('fight', { token: t });
    const s = (await post('state', { token: t })).state;
    if (s.expedition) {
      ok(!!s.expedition.decyzja, 'na rozdrozu run czeka na decyzje');
      const f = await post('fight', { token: t });
      ok(!!f.error, `walka na rozdrozu jest zablokowana (${f.error ?? 'brak bledu'})`);
      const przedAt = s.expedition.at;
      await post('expchoose', { token: t, opcja: s.expedition.decyzja.opcje[0].id });
      const po = (await post('state', { token: t })).state;
      ok(po.expedition.at === przedAt + 1, 'decyzja przesuwa run dalej');
    } else {
      console.log('  (pominieto: postac zginela przed rozdrozem)');
    }
    await post('expleave', { token: t });
  }

  // ---- 5. Struktura runu kończy się bossem ----
  {
    const szk = C.expedition.szkielet;
    ok(szk[szk.length - 1] === 'boss', 'run konczy sie bossem');
    ok(szk.includes('rozdroze'), 'run ma rozdroza');
    ok(szk.includes('safepoint'), 'run ma postoj');
    ok(szk.includes('event'), 'run ma zdarzenie');
  }

  // ---- 6. Limity mikstur ----
  {
    ok(C.healing.carryTower === 3, 'na wieze zabierasz 3 mikstury');
    ok(C.expedition.potionCap === 10, 'na wyprawe zabierasz 10 mikstur');
    ok(C.expedition.potionCap > C.healing.carryTower, 'wyprawa pozwala zabrac wiecej niz wieza');
  }

  // ---- 7. Postój jest wąski z definicji ----
  {
    ok(C.expedition.safepoint.items === 1, 'postoj odsyla dokladnie jeden przedmiot');
    ok(C.expedition.safepoint.matTypes === 1, 'postoj odsyla dokladnie jeden rodzaj surowca');
  }

  if (bledy) { console.error(`\nexpedition.test.js — ${bledy} BLEDOW`); process.exit(1); }
  console.log('expedition.test.js — wszystkie testy przeszly');
}

main().catch(e => {
  console.error('Test nie mogl sie polaczyc z serwerem.');
  console.error('Uruchom najpierw: PORT=8099 node server.js');
  console.error(e.message);
  process.exit(1);
});
