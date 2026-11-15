const catalog = require('../data/catalog.json');

const NON_FOOD_ITEMS = new Set([
  'rubber',
  'plastic',
  'paper',
  'glass',
  'metal',
  'iron',
  'steel',
  'soap',
  'detergent',
  'cleaning liquid',
  'cleaning liquids',
  'cleaner',
  'bleach',
  'battery',
  'batteries',
  'electronics',
  'phone',
  'wire',
  'wood',
  'stone',
  'rock',
  'sand',
  'mud',
  'cement',
  'paint',
  'gasoline',
  'petrol',
  'diesel',
  'chemical',
  'toxic chemicals',
  'pesticide',
  'pesticides',
  'shampoo',
  'lotion',
  'cosmetic',
  'coin',
  'cloth',
  'fabric',
  'sponge',
  'trash',
  'garbage'
]);

const catalogMap = new Map();
const aliasMap = new Map();

for (const item of catalog) {
  const norm = item.name.trim().toLowerCase();
  catalogMap.set(norm, item);
  aliasMap.set(norm, item);
  if (item.aliases) {
    for (const alias of item.aliases) {
      aliasMap.set(alias.trim().toLowerCase(), item);
    }
  }
}

function normalizeName(name) {
  return name.trim().toLowerCase().replace(/^(fresh|raw|dried|ground|powdered|sliced|chopped|organic)\s+/i, '');
}

function validateIngredientItem(rawInput) {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) {
    return { raw: rawInput, status: 'unrecognized', message: 'Empty ingredient' };
  }

  const norm = normalizeName(trimmed);

  // 1. Blacklist check
  if (NON_FOOD_ITEMS.has(norm) || Array.from(NON_FOOD_ITEMS).some(bad => norm.includes(bad))) {
    return {
      raw: trimmed,
      status: 'non_food',
      message: `"${trimmed}" is not recognized as a food ingredient.`
    };
  }

  // 2. Direct catalog & alias check
  const matched = aliasMap.get(norm) || catalogMap.get(norm);
  if (matched) {
    return {
      raw: trimmed,
      canonicalName: matched.name,
      category: matched.category,
      image: matched.image,
      status: 'valid'
    };
  }

  // 3. Substring matching
  for (const [key, item] of aliasMap.entries()) {
    if (norm.includes(key) || key.includes(norm)) {
      return {
        raw: trimmed,
        canonicalName: item.name,
        category: item.category,
        image: item.image,
        status: 'valid'
      };
    }
  }

  return {
    raw: trimmed,
    status: 'unrecognized',
    message: `"${trimmed}" is not recognized in our food catalog.`
  };
}

module.exports = {
  NON_FOOD_ITEMS,
  validateIngredientItem,
  catalog
};
