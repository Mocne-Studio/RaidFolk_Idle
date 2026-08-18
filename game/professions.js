// Czysta logika Górnictwa i Kowalstwa. Każde losowanie przyjmuje RNG,
// dzięki czemu serwer może zapisać ziarno, a testy wymusić konkretny wynik.
import CONFIG from './config.js';

const C = CONFIG;
const clamp01 = n => Math.max(0, Math.min(1, Number(n) || 0));

export function miningBonuses(ch) {
  const out = { miningSpeed: 0, miningXp: 0, gemFind: 0, doubleOre: 0,
                rareGemFind: 0, doubleGem: 0 };
  for (const item of Object.values(ch.miningEquipment ?? {})) {
    for (const [id, value] of Object.entries(item?.bonuses ?? {})) {
      if (id in out) out[id] += Number(value) || 0;
    }
  }
  return out;
}

export function miningCycleMs(ch, resource) {
  const food = foodEffects(ch);
  return Math.max(500, Math.round(resource.ms /
    (1 + Math.max(0, miningBonuses(ch).miningSpeed) + Math.max(0, food.gatheringSpeedPct ?? 0))));
}

export const effectiveGemChance = bonuses =>
  clamp01(C.mining.baseGemChance * (1 + Math.max(0, bonuses?.gemFind ?? 0)));

function gemFromPool(pool, rareBonus, rng) {
  if (!pool?.length) return null;
  // Wyższe pozycje są rzadsze. rareGemFind wzmacnia wyłącznie ich wagę,
  // nie zmienia bazowej szansy trafienia jakiegokolwiek klejnotu.
  const weights = pool.map((_, i) => {
    const rare = pool.length <= 1 ? 0 : i / (pool.length - 1);
    return (1 / (1 + i * 1.5)) * (1 + Math.max(0, rareBonus) * rare);
  });
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) if ((roll -= weights[i]) <= 0) return pool[i];
  return pool.at(-1);
}

export function mineOutcome(resource, bonuses = {}, rng = Math.random) {
  const ore = 1 + (rng() < clamp01(bonuses.doubleOre) ? 1 : 0);
  let gem = null, gems = 0;
  if (resource.kind === 'ore' && rng() < effectiveGemChance(bonuses)) {
    gem = gemFromPool(resource.gems, bonuses.rareGemFind, rng);
    gems = gem ? 1 + (rng() < clamp01(bonuses.doubleGem) ? 1 : 0) : 0;
  }
  return { ore, gem, gems, xp: Math.max(1, Math.round(resource.xp * (1 + Math.max(0, bonuses.miningXp ?? 0)))) };
}

export function qualityChances(smithLevel, recipeLevel) {
  const over = Math.max(0, smithLevel - recipeLevel);
  const anchors = C.smithing.qualityAnchors;
  let lo = anchors[0], hi = anchors.at(-1);
  for (let i = 0; i < anchors.length - 1; i++) {
    if (over >= anchors[i].over && over <= anchors[i + 1].over) {
      lo = anchors[i]; hi = anchors[i + 1]; break;
    }
  }
  if (over >= anchors.at(-1).over) lo = hi = anchors.at(-1);
  const t = lo === hi ? 0 : (over - lo.over) / (hi.over - lo.over);
  const ids = Object.keys(C.smithing.qualities);
  return Object.fromEntries(ids.map((id, i) => [id,
    Math.round((lo.chances[i] + (hi.chances[i] - lo.chances[i]) * t) * 100) / 100]));
}

export function rollQuality(smithLevel, recipeLevel, rng = Math.random) {
  const chances = qualityChances(smithLevel, recipeLevel);
  let roll = rng() * 100;
  for (const [id, chance] of Object.entries(chances)) if ((roll -= chance) <= 0) return id;
  return 'normal';
}

export const smithRecipe = id => C.smithing.recipes.find(r => r.id === id) ?? null;

export const furnaceCoal = ch => Math.max(0, Math.floor(Number(ch.smithFurnace?.coal) || 0));

// Węgiel w Piecu jest osobnym, trwałym zasobnikiem. Przenoszenie nie tworzy
// ani nie usuwa surowca — zmienia tylko miejsce, z którego korzysta wytapianie.
export function transferFurnaceCoal(ch, direction, amount = 'all') {
  ch.materials ??= {};
  ch.smithFurnace ??= { coal: 0 };
  ch.smithFurnace.coal = furnaceCoal(ch);
  const source = direction === 'withdraw' ? ch.smithFurnace.coal : Math.max(0, Math.floor(ch.materials.wegiel ?? 0));
  const wanted = amount === 'all' ? source : Math.max(0, Math.floor(Number(amount) || 0));
  const moved = Math.min(source, wanted);
  if (moved < 1) return { error: direction === 'withdraw' ? 'Piec jest pusty' : 'Nie masz węgla' };

  if (direction === 'withdraw') {
    ch.smithFurnace.coal -= moved;
    ch.materials.wegiel = (ch.materials.wegiel ?? 0) + moved;
  } else {
    ch.materials.wegiel -= moved;
    if (ch.materials.wegiel <= 0) delete ch.materials.wegiel;
    ch.smithFurnace.coal += moved;
  }
  return { ok: true, moved, coal: ch.smithFurnace.coal };
}

export function consumeFurnaceFuel(ch, amount) {
  const needed = Math.max(0, Math.floor(Number(amount) || 0));
  if (furnaceCoal(ch) < needed) return false;
  ch.smithFurnace.coal = furnaceCoal(ch) - needed;
  return true;
}

export function craftProduct(recipe, smithLevel, rng = Math.random, id = String(Date.now())) {
  if (!recipe?.output || recipe.output.type === 'material') return null;
  const special = !!recipe.special;
  const quality = special ? 'normal' : rollQuality(smithLevel, recipe.lvl, rng);
  const qualityDef = C.smithing.qualities[quality];
  const qualityMult = qualityDef.mult;
  const out = recipe.output;
  const item = {
    id, canonicalId: recipe.id, base: out.base ?? recipe.label, name: recipe.label,
    source: special ? 'boss_crafted' : 'crafted', quality, qualityMult,
    rarity: out.rarity ?? 'common', plus: 0,
  };
  if (out.type === 'mining') {
    item.profession = 'mining'; item.slot = out.slot;
    item.reqMiningLevel = recipe.lvl;
    item.bonuses = Object.fromEntries(Object.entries(out.bonuses ?? {})
      .map(([k, v]) => [k, Math.round(v * qualityMult * 10000) / 10000]));
    return item;
  }
  item.slot = out.slot; item.wtype = out.wtype; item.hands = out.hands;
  item.ilvl = recipe.lvl; item.reqLevel = recipe.lvl; item.energy = 0; item.affixes = [];
  item.damage = 0; item.armor = 0;
  const slot = C.gear.slots[item.slot];
  if (slot.base === 'damage' || slot.base === 'mixed') {
    item.damage = Math.max(1, Math.round((C.gear.weaponDamageBase + C.gear.weaponDamagePerIlvl * recipe.lvl)
      * slot.mult * (out.power ?? 1) * qualityMult));
  }
  if (slot.base === 'armor' || slot.base === 'mixed') {
    item.armor = Math.max(1, Math.round((C.gear.armorBase + C.gear.armorPerIlvl * recipe.lvl)
      * slot.mult * (out.power ?? 1) * qualityMult));
  }
  return item;
}

export function equipMining(ch, itemId, slotHint = null) {
  ch.miningInventory ??= [];
  ch.miningEquipment ??= {};
  if (!itemId) {
    const slot = String(slotHint ?? '');
    const old = ch.miningEquipment[slot];
    if (!old) return { error: 'Ten slot jest pusty' };
    if (ch.miningInventory.length >= C.mining.inventorySize) return { error: 'Magazyn górniczy jest pełny' };
    ch.miningInventory.push(old); delete ch.miningEquipment[slot];
    return { ok: true, slot };
  }
  const index = ch.miningInventory.findIndex(i => i.id === String(itemId));
  if (index < 0) return { error: 'Nie ma takiego sprzętu górniczego' };
  const item = ch.miningInventory[index];
  if (!C.mining.slots[item.slot]) return { error: 'Nieprawidłowy slot górniczy' };
  const miningLevel = ch.prof?.gornictwo?.lvl ?? 1;
  if ((item.reqMiningLevel ?? 1) > miningLevel) {
    return { error: `Wymaga Górnictwa ${item.reqMiningLevel} — masz ${miningLevel}` };
  }
  ch.miningInventory.splice(index, 1);
  const old = ch.miningEquipment[item.slot];
  if (old) ch.miningInventory.push(old);
  ch.miningEquipment[item.slot] = item;
  return { ok: true, slot: item.slot };
}

// ---------------------------------------------------------------- LIFE SKILLS

// Nowy sprzęt profesji może później użyć tego samego kształtu bez budowania
// drugiego inventory: ch.professionEquipment[skill][slot].bonuses.
export function professionBonuses(ch, skill) {
  const out = {};
  for (const item of Object.values(ch.professionEquipment?.[skill] ?? {})) {
    for (const [id, value] of Object.entries(item?.bonuses ?? {})) {
      out[id] = (out[id] ?? 0) + (Number(value) || 0);
    }
  }
  return out;
}

export function foodFightCount(food) {
  if (food?.walki) return Math.max(1, Math.floor(food.walki));
  if (food?.expiresAt && food?.startedAt) {
    return Math.max(1, Math.round((food.expiresAt - food.startedAt) / (90 * 1000)));
  }
  return Math.max(1, Math.round((food?.durationMs ?? 15 * 60_000) / (90 * 1000)));
}

export function cleanupFoodBuffs(unit) {
  unit.foodBuffs ??= { main_meal: null, drink: null, dessert: null };
  for (const slot of ['main_meal', 'drink', 'dessert']) {
    const b = unit.foodBuffs[slot];
    if (!b) continue;
    // Migracja z pierwszej wersji czasowej: zachowujemy potrawę, ale od teraz
    // jej trwałość schodzi wyłącznie ukończonymi walkami danej jednostki.
    b.walki ??= foodFightCount(b);
    delete b.expiresAt;
    delete b.startedAt;
    if (b.walki <= 0) unit.foodBuffs[slot] = null;
  }
  return unit.foodBuffs;
}

export function foodEffects(unit) {
  const out = {};
  cleanupFoodBuffs(unit);
  for (const b of Object.values(unit.foodBuffs ?? {})) {
    if (!b || b.walki <= 0) continue;
    for (const [id, value] of Object.entries(b.effects ?? {})) {
      out[id] = (out[id] ?? 0) + (Number(value) || 0);
    }
  }
  return out;
}

const masteryBonus = (ch, skill) => (ch.prof?.[skill]?.lvl ?? 1) >= 100 ? 0.05 : 0;

export function professionCycleMs(ch, skill, resource) {
  if (skill === 'gornictwo') return miningCycleMs(ch, resource);
  const food = foodEffects(ch);
  const gear = professionBonuses(ch, skill);
  let speed = 0;
  if (skill === 'rybolowstwo') speed += gear.fishingSpeed ?? 0;
  if (skill === 'rolnictwo') speed += gear.growthSpeed ?? 0;
  if (skill === 'gotowanie') speed += gear.cookingSpeed ?? 0;
  if (['rybolowstwo', 'rolnictwo'].includes(skill)) speed += food.gatheringSpeedPct ?? 0;
  if (['rybolowstwo', 'gotowanie'].includes(skill)) speed += masteryBonus(ch, skill);
  return Math.max(500, Math.round(resource.ms / (1 + Math.max(0, speed))));
}

function weighted(entries, weightOf, rng) {
  const total = entries.reduce((sum, x) => sum + Math.max(0, weightOf(x)), 0);
  if (!entries.length || total <= 0) return null;
  let roll = rng() * total;
  for (const x of entries) if ((roll -= Math.max(0, weightOf(x))) <= 0) return x;
  return entries.at(-1);
}

export function fishingOutcome(spot, fishingLevel, bonuses = {}, rng = Math.random) {
  const available = (spot?.catchTable ?? []).filter(x => fishingLevel >= x.lvl);
  const rareBoost = Math.max(0, bonuses.rareCatchChance ?? 0);
  const caught = weighted(available, x => x.weight *
    (['rare', 'mystic'].includes(x.rarity) ? 1 + rareBoost : 1), rng);
  if (!caught) return null;
  const count = 1 + (rng() < clamp01(bonuses.doubleCatchChance) ? 1 : 0);
  const xp = Math.max(1, Math.round(caught.xp * (1 + Math.max(0, bonuses.fishingXp ?? 0))));
  return { id: caught.id, label: caught.label, rarity: caught.rarity, count, xp };
}

export function farmingOutcome(production, bonuses = {}, rng = Math.random) {
  const mult = 1 + Math.max(0, bonuses.yieldPct ?? 0)
    + (production?.category === 'animals' ? Math.max(0, bonuses.animalProductYield ?? 0) : 0);
  const outputs = (production?.outputs ?? []).map(out => {
    const [lo, hi] = out.yield ?? [1, 1];
    const rolled = lo + Math.floor(rng() * (hi - lo + 1));
    return { id: out.id, label: out.label, count: Math.max(1, Math.round(rolled * mult)) };
  });
  return { outputs, xp: Math.max(1, Math.round((production?.xp ?? 1) *
    (1 + Math.max(0, bonuses.farmingXp ?? 0)))) };
}

export function canAfford(materials, koszt) {
  return Object.entries(koszt ?? {}).every(([id, n]) => (materials?.[id] ?? 0) >= n);
}

export function cookFood(ch, recipe) {
  if (!recipe?.food) return { error: 'To nie jest receptura jedzenia' };
  if (!canAfford(ch.materials, recipe.koszt)) return { error: 'Brak składników' };
  for (const [id, n] of Object.entries(recipe.koszt ?? {})) {
    ch.materials[id] -= n;
    if (ch.materials[id] <= 0) delete ch.materials[id];
  }
  ch.materials[recipe.id] = (ch.materials[recipe.id] ?? 0) + 1;
  return { ok: true, id: recipe.id, label: recipe.label, count: 1 };
}

export function foodUnit(ch, target = {}) {
  if (!target || target.kind === 'hero' || target.kind === 'gracz') return ch;
  const idx = Number(target.idx);
  if (!Number.isInteger(idx) || idx < 0) return null;
  if (target.kind === 'ally') return ch.collection?.companions?.[idx] ?? null;
  if (target.kind === 'pet') return ch.collection?.pets?.[idx] ?? null;
  return null;
}

export function eatFood(ch, id, target = { kind: 'hero' }) {
  const recipe = C.skills.gotowanie.resources.find(r => r.id === id && r.food);
  if (!recipe) return { error: 'Tego nie da się zjeść' };
  if ((ch.materials?.[id] ?? 0) < 1) return { error: 'Nie masz tego' };
  const unit = foodUnit(ch, target);
  if (!unit) return { error: 'Nie ma takiej jednostki' };
  ch.materials[id]--;
  if (ch.materials[id] <= 0) delete ch.materials[id];
  cleanupFoodBuffs(unit);
  const slot = recipe.food.buffSlot;
  const buff = {
    id, label: recipe.label, category: recipe.food.category, slot,
    effects: { ...recipe.food.effects }, walki: foodFightCount(recipe.food),
  };
  unit.foodBuffs[slot] = buff;
  return { ok: true, buff, slot, target };
}
