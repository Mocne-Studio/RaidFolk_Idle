// Stan postaci: atrybuty, skille, ekwipunek, statystyki wynikowe.

import CONFIG from './config.js';
import { itemStatSummary } from './content.js';

const C = CONFIG;

// Wyprawka klasowa — Common ilvl 1, bez afiksów. Ma tylko wyciągnąć gracza z gołych pięści.
function starterItem(name, slot, wtype) {
  const def = C.gear.slots[slot];
  const it = {
    id: null, slot, wtype, name, rarity: 'common', ilvl: 1, plus: 0, energy: 0,
    reqLevel: 1, reqSkill: 1, damage: 0, armor: 0, affixes: [],
  };
  if (def.base === 'damage' || def.base === 'mixed') {
    it.damage = Math.round((C.gear.weaponDamageBase + C.gear.weaponDamagePerIlvl) * def.mult);
  }
  if (def.base === 'armor' || def.base === 'mixed') {
    it.armor = Math.round((C.gear.armorBase + C.gear.armorPerIlvl) * def.mult);
  }
  return it;
}

export function newCharacter(name, klasa = 'wedrowiec', crest = null) {
  const cls = C.classes[klasa];
  if (!cls) throw new Error('nieznana klasa: ' + klasa);

  const attrs = { ...C.character.startingAttrs };
  for (const [k, v] of Object.entries(cls.attrs)) attrs[k] += v;

  const skills = {};
  for (const s of C.skills.list) skills[s] = { level: 1, exp: 0 };

  const equipped = {};
  if (cls.startWeapon)  equipped.bron    = starterItem(cls.startWeapon, 'bron', cls.startWtype);
  if (cls.startOffhand) equipped.offhand = starterItem(cls.startOffhand, 'offhand', 'tarcza');

  return {
    name, klasa,
    crest: crest ?? { shape: 'tarcza', symbol: 'miecz', color: 'mosiadz', border: 'smola', ink: 'smola' },
    floor: 1, fight: 0, maxFloor: 1,
    attrs, unspentAttr: 0,
    treePoints: 0,
    skills,
    gold: 0, currency: 0,
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

// ---------------------------------------------------------------- exp skilli

export function skillExpToNext(level) {
  return Math.round(C.skills.expBase * Math.pow(C.skills.expGrowth, level - 1));
}

export function grantSkillExp(ch, skill, amount) {
  const s = ch.skills[skill];
  if (!s) return [];
  const ups = [];
  s.exp += amount;
  while (s.exp >= skillExpToNext(s.level)) {
    s.exp -= skillExpToNext(s.level);
    s.level++;
    ups.push({ skill, level: s.level });
  }
  return ups;
}

// Który skill bojowy rośnie zależnie od ekwipunku.
// Zasada: liczy się druga ręka. Tarcza dzieli exp na pół z Obroną.
const WTYPE_SKILL = { mele: 'atak', dystans: 'dystansowy', magia: 'magia' };

export function expSplit(ch) {
  const weapon = ch.equipped.bron;
  const off = ch.equipped.offhand;
  const isShield = off && off.wtype === 'tarcza';

  let main = 'atak';
  if (weapon?.wtype) main = WTYPE_SKILL[weapon.wtype] ?? 'atak';
  if (!weapon) {
    if (ch.klasa === 'mag') main = 'magia';
    if (ch.klasa === 'lucznik') main = 'dystansowy';
  }

  const split = {};
  if (isShield) {
    split[main] = C.skills.shieldSplit;
    split.obrona = C.skills.shieldSplit;
  } else {
    split[main] = 1;
  }
  return { main, isShield, split };
}

export function awardFightExp(ch, mobLevel) {
  const { split } = expSplit(ch);
  const cls = C.classes[ch.klasa];
  const ups = [];

  for (const [skill, share] of Object.entries(split)) {
    const lvl = ch.skills[skill].level;
    const diff = Math.max(0, lvl - mobLevel);
    const falloff = Math.max(C.skills.expFalloffMin, 1 - diff * C.skills.expFalloffPerLevel);
    let amount = C.skills.expPerFight * share * falloff;
    if (cls.skill === skill) amount *= (1 + cls.expBonus);
    ups.push(...grantSkillExp(ch, skill, Math.max(1, Math.round(amount))));
  }

  // Zdrowie rośnie zawsze, cokolwiek robisz
  const zLvl = ch.skills.zdrowie.level;
  const zDiff = Math.max(0, zLvl - mobLevel);
  const zFall = Math.max(C.skills.expFalloffMin, 1 - zDiff * C.skills.expFalloffPerLevel);
  let zAmt = C.skills.expPerFight * C.skills.zdrowieShare * zFall;
  if (cls.skill === 'zdrowie') zAmt *= (1 + cls.expBonus);
  ups.push(...grantSkillExp(ch, 'zdrowie', Math.max(1, Math.round(zAmt))));

  return ups;
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
  const maxHp = Math.round(
    cc.startHp + a.wytrzymalosc * cc.hpPerStamina + ch.skills.zdrowie.level * cc.hpPerLevel + hpFlat
  );

  // Każdy styl walki ma swój atrybut skalujący. Bez tego łucznik
  // pakował punkty w Zręczność i nie dostawał z nich ani jednego obrażenia.
  const main = expSplit(ch).main;
  const ATTR_FOR = { atak: 'sila', magia: 'intelekt', dystansowy: 'zrecznosc' };
  const DIV_FOR = { atak: cc.strDamageDivisor, magia: cc.intMagicDivisor, dystansowy: cc.agiDamageDivisor };
  const mainAttr = a[ATTR_FOR[main] ?? 'sila'];
  const divisor = DIV_FOR[main] ?? cc.strDamageDivisor;

  const damage = Math.round((cc.baseDamage + dmgFlat) * (1 + mainAttr / divisor));
  const speed = Math.round(C.combat.baseSpeed + speedFlat + a.zrecznosc / (cc.agiSpeedDivisor / 100));
  const armor = Math.round(armorFlat + a.wytrzymalosc * cc.staArmorPerPoint);

  const accuracy = cc.accuracyBase + a.zrecznosc * cc.accuracyPerAgi + accFlat / 100;
  const evasion = Math.min(cc.evasionMax, a.zrecznosc * cc.evasionPerAgi + evaFlat / 100);

  return {
    maxHp,
    hp: Math.max(1, maxHp - (ch.hpLost ?? 0)),
    damage: Math.max(1, damage),
    speed: Math.max(20, speed),
    armor,
    accuracy: Math.min(C.combat.accuracyMax, accuracy),
    evasion,
    wtype: ch.equipped.bron?.wtype ?? 'mele',
    crit: C.combat.critBase + critChance / 100 + a.zrecznosc / cc.agiCritDivisor,
    critMult: C.combat.critMultBase + critPower / 100,
    attrs: a,
    power: Math.round(damage * 3 + maxHp * 0.5 + armor * 1.5),
  };
}

// ---------------------------------------------------------------- ekwipunek

export function canEquip(ch, item) {
  if (item.reqLevel > ch.maxFloor) {
    return { ok: false, reason: `Wymaga poziomu ${item.reqLevel} — masz ${ch.maxFloor}` };
  }
  const def = C.gear.slots[item.slot];
  let gate = def.gate;
  if (gate === 'weapon') gate = WTYPE_SKILL[item.wtype] ?? 'atak';
  if (gate === 'offhand') gate = item.wtype === 'tarcza' ? 'obrona' : 'atak';

  if (gate === 'any') {
    const best = Math.max(...C.skills.list.filter(s => s !== 'zdrowie').map(s => ch.skills[s].level));
    if (best < item.reqSkill) return { ok: false, reason: `Wymaga dowolnego skilla bojowego ${item.reqSkill}` };
    return { ok: true, gate: 'dowolny' };
  }
  if (ch.skills[gate].level < item.reqSkill) {
    return { ok: false, reason: `Wymaga ${gate} ${item.reqSkill} — masz ${ch.skills[gate].level}`, gate };
  }
  return { ok: true, gate };
}

export function equip(ch, itemId) {
  const idx = ch.backpack.findIndex(i => i.id === itemId);
  if (idx < 0) return { ok: false, reason: 'Nie ma takiego przedmiotu' };
  const item = ch.backpack[idx];
  const check = canEquip(ch, item);
  if (!check.ok) return check;

  const old = ch.equipped[item.slot] ?? null;
  ch.equipped[item.slot] = item;
  ch.backpack.splice(idx, 1);
  if (old) ch.backpack.push(old);
  return { ok: true, equipped: item, unequipped: old };
}
