import catalog from '../data/ingredients/catalog.json';

// Explicit non-food items blacklist (lowercase)
export const NON_FOOD_ITEMS = new Set([
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

// Map of normalized name and aliases to Catalog item
export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  aliases: string[];
  image: string;
}

const catalogMap = new Map<string, CatalogItem>();
const aliasMap = new Map<string, CatalogItem>();

for (const item of (catalog as CatalogItem[])) {
  const normName = item.name.trim().toLowerCase();
  catalogMap.set(normName, item);
  aliasMap.set(normName, item);

  if (item.aliases) {
    for (const alias of item.aliases) {
      aliasMap.set(alias.trim().toLowerCase(), item);
    }
  }
}

export type ValidationStatus = 'valid' | 'non_food' | 'unrecognized';

export interface IngredientValidationResult {
  raw: string;
  parsedName: string;
  quantity: number;
  unit: string;
  status: ValidationStatus;
  canonicalName?: string;
  category?: string;
  image?: string;
  message?: string;
}

export function normalizeIngredientName(name: string): string {
  return name.trim().toLowerCase().replace(/^(fresh|raw|dried|ground|powdered|sliced|chopped|organic)\s+/i, '');
}

export function validateSingleIngredient(rawInput: string): IngredientValidationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      raw: rawInput,
      parsedName: '',
      quantity: 1,
      unit: 'pcs',
      status: 'unrecognized',
      message: 'Empty ingredient'
    };
  }

  // Regex parse: e.g. "200g paneer", "2 pieces tomato", "1 onion", "500 ml milk", "salt"
  const regex = /^([\d./]+)?\s*([a-zA-Z]+)?\s+(.+)$/i;
  const match = trimmed.match(regex);

  let quantity = 1;
  let unit = 'pcs';
  let ingredientName = trimmed;

  const standardUnits = new Set(['g', 'kg', 'ml', 'l', 'pieces', 'piece', 'pcs', 'cup', 'cups', 'tbsp', 'tsp', 'pinch', 'can', 'bunch', 'clove', 'cloves']);

  if (match) {
    const rawQty = match[1];
    const potentialUnit = match[2]?.toLowerCase();
    const rest = match[3];

    if (rawQty) {
      if (rawQty.includes('/')) {
        const [num, den] = rawQty.split('/').map(Number);
        quantity = den ? num / den : 1;
      } else {
        quantity = parseFloat(rawQty) || 1;
      }

      if (potentialUnit && standardUnits.has(potentialUnit)) {
        unit = potentialUnit === 'piece' ? 'pcs' : potentialUnit;
        ingredientName = rest;
      } else if (potentialUnit) {
        ingredientName = `${potentialUnit} ${rest}`;
      } else {
        ingredientName = rest;
      }
    }
  } else {
    // Check if there is attached unit like 200g
    const compactMatch = trimmed.match(/^(\d+)(g|kg|ml|l)\s+(.+)$/i);
    if (compactMatch) {
      quantity = parseFloat(compactMatch[1]) || 1;
      unit = compactMatch[2].toLowerCase();
      ingredientName = compactMatch[3];
    }
  }

  const cleanName = ingredientName.trim();
  const normalized = normalizeIngredientName(cleanName);

  // 1. Check non-food blacklist
  if (NON_FOOD_ITEMS.has(normalized) || Array.from(NON_FOOD_ITEMS).some(bad => normalized.includes(bad))) {
    return {
      raw: trimmed,
      parsedName: cleanName,
      quantity,
      unit,
      status: 'non_food',
      message: `"${cleanName}" is not an edible food ingredient.`
    };
  }

  // 2. Check catalog & aliases
  const matchedItem = aliasMap.get(normalized) || catalogMap.get(normalized);
  if (matchedItem) {
    return {
      raw: trimmed,
      parsedName: cleanName,
      canonicalName: matchedItem.name,
      category: matchedItem.category,
      image: matchedItem.image,
      quantity,
      unit,
      status: 'valid'
    };
  }

  // 3. Partial substring matching against recognized catalog
  for (const [key, item] of aliasMap.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        raw: trimmed,
        parsedName: cleanName,
        canonicalName: item.name,
        category: item.category,
        image: item.image,
        quantity,
        unit,
        status: 'valid'
      };
    }
  }

  // 4. Unrecognized item
  return {
    raw: trimmed,
    parsedName: cleanName,
    quantity,
    unit,
    status: 'unrecognized',
    message: `"${cleanName}" is not recognized in our verified food catalog. Please select a valid food or adjust spelling.`
  };
}

export function parseAndValidateIngredients(rawText: string): {
  valid: IngredientValidationResult[];
  invalid: IngredientValidationResult[];
  unrecognized: IngredientValidationResult[];
} {
  const parts = rawText
    .split(/[,;\n]+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const valid: IngredientValidationResult[] = [];
  const invalid: IngredientValidationResult[] = [];
  const unrecognized: IngredientValidationResult[] = [];

  for (const part of parts) {
    const result = validateSingleIngredient(part);
    if (result.status === 'valid') {
      valid.push(result);
    } else if (result.status === 'non_food') {
      invalid.push(result);
    } else {
      unrecognized.push(result);
    }
  }

  return { valid, invalid, unrecognized };
}
