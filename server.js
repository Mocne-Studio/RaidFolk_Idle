// RaidFolk_idle — serwer. Node 22+, zero zależności.
//   node server.js            → http://localhost:8080
//   PORT=3000 node server.js

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

import CONFIG from './game/config.js';
import { floorInfo, makeEnemy, rollDrops, actForFloor, ACTS } from './game/content.js';
import { createFight, step, beginTurn, runToEnd, summary, hitChance,
         STRENGTHS, ABILITIES, ULTIMATES } from './game/combat.js';
import * as DB from './game/db.js';
import {
  newCharacter, computeStats, awardFightExp, equip, canEquip,
  expSplit, skillExpToNext,
} from './game/character.js';

const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(here, 'public');
const PORT = Number(process.env.PORT ?? 8080);
const C = CONFIG;

// ---------------------------------------------------------------- regeneracja

const REGEN_PCT_PER_MIN = 0.02;

function applyRegen(ch) {
  const now = Date.now();
  if (!ch.lastSeen) { ch.lastSeen = now; return; }
  const mins = (now - ch.lastSeen) / 60000;
  ch.lastSeen = now;
  if (mins <= 0 || !ch.hpLost) return;
  const st = computeStats(ch);
  const back = Math.floor(st.maxHp * REGEN_PCT_PER_MIN * mins);
  if (back > 0) ch.hpLost = Math.max(0, ch.hpLost - back);
}

// ---------------------------------------------------------------- widok dla klienta

let nextItemId = Date.now();
const giveId = (it) => { it.id = String(nextItemId++); return it; };

function view(ch) {
  const st = computeStats(ch);
  const info = floorInfo(ch.floor);
  const act = actForFloor(ch.floor);
  const { main, isShield } = expSplit(ch);

  const skills = {};
  for (const [k, v] of Object.entries(ch.skills)) {
    skills[k] = { level: v.level, exp: v.exp, next: skillExpToNext(v.level) };
  }

  return {
    name: ch.name, klasa: ch.klasa, klasaLabel: C.classes[ch.klasa].label, crest: ch.crest,
    floor: ch.floor, maxFloor: ch.maxFloor, fight: ch.fight,
    fightsOnFloor: info.fights, isBoss: info.isBoss, isPlus: info.isPlus,
    actName: act.name, actId: act.id, bossName: info.bossName,
    stats: st, skills, mainSkill: main, shield: isShield,
    attrs: ch.attrs, unspentAttr: ch.unspentAttr, treePoints: ch.treePoints,
    gold: ch.gold, currency: ch.currency, potions: ch.potions,
    equipped: ch.equipped, backpack: ch.backpack,
    backpackMax: C.gear.backpackSize,
    nextEnemy: makeEnemy(ch.floor, ch.fight),
    rarities: C.rarities,
    slots: C.gear.slots,
    mode: ch.mode ?? 'auto',
    strengths: Object.fromEntries(Object.entries(STRENGTHS).map(([k, v]) => [k, {
      ...v, chance: hitChance(st.accuracy, k, makeEnemy(ch.floor, ch.fight).evasion ?? 0),
    }])),
    abilities: (ch.abilities ?? Object.keys(C.abilities)).map(id => ({ id, ...C.abilities[id] })),
    ultimate: { ...(ULTIMATES[st.wtype] ?? ULTIMATES.mele), wtype: st.wtype },
    chargeMax: C.combat.chargeMax,
    activeFight: ch.activeFight && !ch.activeFight.over ? summary(ch.activeFight) : null,
  };
}

// ---------------------------------------------------------------- akcje

// Rozpoczyna walkę. W trybie auto od razu ją rozgrywa,
// w turowym zapisuje stan i oddaje sterowanie graczowi.
function startFight(ch) {
  const info = floorInfo(ch.floor);
  if (ch.fight >= info.fights) return { error: 'Piętro zdobyte — idź wyżej' };
  if (ch.activeFight && !ch.activeFight.over) return { error: 'Walka już trwa' };

  const enemy = makeEnemy(ch.floor, ch.fight);
  const st = computeStats(ch);
  const seed = (Date.now() ^ (ch.floor * 7919) ^ (ch.fight * 104729)) >>> 0;

  // W wieży wchodzisz w każdą walkę z pełnym HP.
  // Wyczerpanie między falami to mechanika wypraw — tam HP nie wraca.
  const F = createFight({
    party: [{
      name: ch.name, kind: 'gracz', hp: st.maxHp, maxHp: st.maxHp,
      damage: st.damage, speed: st.speed, armor: st.armor,
      crit: st.crit, critMult: st.critMult, accuracy: st.accuracy, evasion: st.evasion,
    }],
    // TODO: tu wejdą sojusznicy i pet — układ jest już na to gotowy
    enemies: [enemy],
    potions: ch.potions,
    wtype: st.wtype,
    abilities: ch.abilities ?? Object.keys(ABILITIES),
  }, seed, ch.mode ?? 'auto');
  F.enemyMeta = { variant: enemy.variant, gold: enemy.gold, floor: ch.floor, fightIdx: ch.fight };
  ch.activeFight = F;

  if ((ch.mode ?? 'auto') === 'auto') { runToEnd(F); return resolveFight(ch); }

  beginTurn(F);           // przewiń wrogie ciosy do pierwszej decyzji gracza
  if (F.over) return resolveFight(ch);
  return { fight: summary(F), enemy, awaiting: true };
}

// Jedna akcja gracza w trybie turowym.
function actFight(ch, action) {
  const F = ch.activeFight;
  if (!F || F.over) return { error: 'Nie ma trwającej walki' };
  step(F, action);
  if (F.over) return resolveFight(ch);
  return { fight: summary(F), enemy: F.enemies[0], awaiting: true };
}

// Rozliczenie zakończonej walki: exp, złoto, łup, postęp piętra.
function resolveFight(ch) {
  const F = ch.activeFight;
  const res = summary(F);
  const meta = F.enemyMeta;
  const info = floorInfo(ch.floor);

  ch.potions = res.potionsLeft;
  ch.hpLost = 0;
  ch.activeFight = null;

  const out = { ...res, enemy: F.enemies[0], loot: [], levelUps: [], gold: 0,
                floorCleared: false, awaiting: false };

  if (res.win) {
    out.levelUps = awardFightExp(ch, ch.floor);
    out.gold = meta.gold;
    ch.gold += meta.gold;

    const drops = rollDrops((F.seed ^ 31337) >>> 0, { floor: meta.floor, variant: meta.variant });
    for (const d of drops) {
      if (ch.backpack.length >= C.gear.backpackSize) { out.backpackFull = true; break; }
      giveId(d); ch.backpack.push(d); out.loot.push(d);
    }

    ch.fight++;
    if (ch.fight >= info.fights) out.floorCleared = true;
  }
  // Przegrana nie karze niczym poza czasem i zużytymi miksturami.
  // Kara za śmierć należy do wypraw.

  return out;
}

function doAdvance(ch) {
  const info = floorInfo(ch.floor);
  if (ch.fight < info.fights) return { error: 'Piętro jeszcze niezdobyte' };

  const gained = { tree: info.isBoss ? C.tower.treePointsPerBoss : C.tower.treePointsPerFloor,
                   attr: C.character.attrPointsPerFloor,
                   currency: info.isBoss ? 1 : 0 };

  ch.treePoints += gained.tree;
  ch.unspentAttr += gained.attr;
  ch.currency += gained.currency;

  ch.floor++;
  ch.fight = 0;
  ch.maxFloor = Math.max(ch.maxFloor, ch.floor);
  return { ok: true, gained, floor: ch.floor };
}

// ---------------------------------------------------------------- HTTP

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
               '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
               '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const json = (res, code, body) => {
  const s = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(s);
};

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    // ---------------- API ----------------
    if (path.startsWith('/api/')) {
      const body = req.method === 'POST' ? await readBody(req) : {};
      const token = body.token || url.searchParams.get('token');

      if (path === '/api/roster') return json(res, 200, { roster: DB.roster() });

      if (path === '/api/classes') {
        return json(res, 200, {
          classes: Object.entries(C.classes).map(([id, c]) => ({
            id, label: c.label, skill: c.skill, expBonus: c.expBonus, attrs: c.attrs,
          })),
          acts: ACTS.map(a => ({ id: a.id, name: a.name, families: a.families })),
        });
      }

      if (path === '/api/new') {
        const name = String(body.name ?? '').trim().slice(0, 20);
        if (!name) return json(res, 400, { error: 'Podaj imię' });
        const klasa = C.classes[body.klasa] ? body.klasa : 'wedrowiec';
        const cr = body.crest && typeof body.crest === 'object'
          ? { shape: String(body.crest.shape ?? 'tarcza').slice(0, 20),
              symbol: String(body.crest.symbol ?? 'miecz').slice(0, 20),
              color: String(body.crest.color ?? 'mosiadz').slice(0, 20) }
          : null;
        const ch = newCharacter(name, klasa, cr);
        const t = DB.newToken();
        DB.save(t, name, ch);
        return json(res, 200, { token: t, state: view(ch) });
      }

      // dalej wymagany token
      const ch = token ? DB.load(token) : null;
      if (!ch) return json(res, 401, { error: 'Nie znaleziono postaci' });
      applyRegen(ch);

      let result = {};
      switch (path) {
        case '/api/state':   break;
        case '/api/fight':   result = startFight(ch); break;
        case '/api/act':     result = actFight(ch, body.action ?? { type: 'attack', strength: 'srednio' }); break;
        case '/api/mode': {
          const m = body.mode === 'turowa' ? 'turowa' : 'auto';
          if (ch.activeFight && !ch.activeFight.over) { result = { error: 'Najpierw dokończ walkę' }; break; }
          ch.mode = m;
          result = { ok: true, mode: m };
          break;
        }
        case '/api/advance': result = doAdvance(ch); break;
        case '/api/equip':   result = equip(ch, String(body.itemId)); break;
        case '/api/potion': {
          if (ch.potions <= 0) { result = { error: 'Brak mikstur' }; break; }
          const st = computeStats(ch);
          ch.potions--;
          ch.hpLost = Math.max(0, ch.hpLost - Math.round(st.maxHp * C.healing.potionHealPct));
          result = { ok: true };
          break;
        }
        case '/api/buypotion': {
          const cost = 40 + ch.maxFloor * 6;
          if (ch.gold < cost) { result = { error: `Brakuje złota (${cost})` }; break; }
          ch.gold -= cost; ch.potions++;
          result = { ok: true, cost };
          break;
        }
        case '/api/attr': {
          const a = String(body.attr);
          if (!(a in ch.attrs)) { result = { error: 'Nieznany atrybut' }; break; }
          if (ch.unspentAttr <= 0) { result = { error: 'Brak punktów' }; break; }
          ch.attrs[a]++; ch.unspentAttr--;
          result = { ok: true };
          break;
        }
        case '/api/sell': {
          const idx = ch.backpack.findIndex(i => i.id === String(body.itemId));
          if (idx < 0) { result = { error: 'Nie ma takiego przedmiotu' }; break; }
          const it = ch.backpack[idx];
          const val = Math.round(it.ilvl * 4 * C.rarities[it.rarity].mult);
          ch.gold += val; ch.backpack.splice(idx, 1);
          result = { ok: true, gold: val };
          break;
        }
        case '/api/selljunk': {
          // sprzedaje wszystko, co jest gorsze od noszonego na tym samym slocie
          const scoreOf = (it) => (it.damage ?? 0) * 3 + (it.armor ?? 0) * 1.5
            + (it.affixes ?? []).reduce((n, a) => n + a.value * (a.pct ? 3 : 1.2), 0);
          let gold = 0, n = 0;
          ch.backpack = ch.backpack.filter(it => {
            const worn = ch.equipped[it.slot];
            if (worn && scoreOf(worn) >= scoreOf(it)) {
              gold += Math.round(it.ilvl * 4 * C.rarities[it.rarity].mult); n++;
              return false;
            }
            return true;
          });
          ch.gold += gold;
          result = { ok: true, gold, count: n };
          break;
        }
        default: return json(res, 404, { error: 'Nieznany endpoint' });
      }

      DB.save(token, ch.name, ch);
      return json(res, 200, { ...result, state: view(ch) });
    }

    // APK leży w katalogu projektu, nie w public/ — inaczej pakowałby sam siebie do siebie
    if (path === '/RaidFolk.apk') {
      const apk = await readFile(join(here, 'RaidFolk.apk'));
      res.writeHead(200, {
        'content-type': 'application/vnd.android.package-archive',
        'content-disposition': 'attachment; filename="RaidFolk.apk"',
        'cache-control': 'no-store',
      });
      return res.end(apk);
    }

    // ---------------- pliki ----------------
    let file = path === '/' ? '/index.html' : path;
    const safe = normalize(file).replace(/^(\.\.[/\\])+/, '');
    const full = join(PUBLIC, safe);
    if (!full.startsWith(PUBLIC)) { res.writeHead(403); return res.end('nie'); }

    const data = await readFile(full);
    res.writeHead(200, { 'content-type': MIME[extname(full)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);

  } catch (err) {
    if (err.code === 'ENOENT') { res.writeHead(404); return res.end('404'); }
    console.error(err);
    json(res, 500, { error: String(err.message ?? err) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`RaidFolk_idle — http://localhost:${PORT}`);
  console.log(`w sieci lokalnej: http://<adres-laptopa>:${PORT}`);
});
