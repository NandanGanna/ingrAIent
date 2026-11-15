import { PantryItemSchema, type PantryItem } from '../types';

export type { PantryItem };

const STORAGE_KEY = 'ingraient-pantry-v2';
const SAVED_RECIPES_KEY = 'ingraient-saved-recipes-v2';
const COOKING_HISTORY_KEY = 'ingraient-cooking-history-v2';

export const INITIAL_DEMO_PANTRY: PantryItem[] = [
  {
    id: 'demo-pantry-1',
    name: 'Tomato',
    category: 'Vegetables',
    quantity: 4,
    unit: 'pcs',
    purchaseDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    expiry: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0], // tomorrow
    notes: 'Ripe organic tomatoes',
  },
  {
    id: 'demo-pantry-2',
    name: 'Paneer',
    category: 'Dairy',
    quantity: 300,
    unit: 'g',
    purchaseDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    expiry: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], // 2 days
    notes: 'Fresh dairy block',
  },
  {
    id: 'demo-pantry-3',
    name: 'Onion',
    category: 'Vegetables',
    quantity: 3,
    unit: 'pcs',
    purchaseDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    expiry: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
    notes: 'Red onions',
  },
  {
    id: 'demo-pantry-4',
    name: 'Milk',
    category: 'Dairy',
    quantity: 500,
    unit: 'ml',
    purchaseDate: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    expiry: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], // 2 days
    notes: 'Full cream milk',
  },
  {
    id: 'demo-pantry-5',
    name: 'Green Peas',
    category: 'Vegetables',
    quantity: 200,
    unit: 'g',
    purchaseDate: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    expiry: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
  },
  {
    id: 'demo-pantry-6',
    name: 'Basmati Rice',
    category: 'Grains',
    quantity: 1000,
    unit: 'g',
    purchaseDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    expiry: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
  },
  {
    id: 'demo-pantry-7',
    name: 'Garlic',
    category: 'Vegetables',
    quantity: 1,
    unit: 'bunch',
    purchaseDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    expiry: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
  },
  {
    id: 'demo-pantry-8',
    name: 'Ginger',
    category: 'Vegetables',
    quantity: 50,
    unit: 'g',
    purchaseDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    expiry: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
  },
  {
    id: 'demo-pantry-9',
    name: 'Cooking Oil',
    category: 'Condiments',
    quantity: 1,
    unit: 'L',
    purchaseDate: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
    expiry: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
  },
  {
    id: 'demo-pantry-10',
    name: 'Turmeric',
    category: 'Spices',
    quantity: 100,
    unit: 'g',
    purchaseDate: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
    expiry: new Date(Date.now() + 200 * 86400000).toISOString().split('T')[0],
  },
  {
    id: 'demo-pantry-11',
    name: 'Salt',
    category: 'Condiments',
    quantity: 500,
    unit: 'g',
    purchaseDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    expiry: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
  },
  {
    id: 'demo-pantry-12',
    name: 'Green Chilli',
    category: 'Vegetables',
    quantity: 6,
    unit: 'pcs',
    purchaseDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    expiry: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], // 3 days
  }
];

export function getPantry(): PantryItem[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    savePantry(INITIAL_DEMO_PANTRY);
    return INITIAL_DEMO_PANTRY;
  }
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return INITIAL_DEMO_PANTRY;

    const validated: PantryItem[] = [];
    for (const item of parsed) {
      const res = PantryItemSchema.safeParse(item);
      if (res.success) {
        validated.push(res.data);
      }
    }
    return validated.length > 0 ? validated : INITIAL_DEMO_PANTRY;
  } catch (err) {
    console.error('Error reading pantry from LocalStorage:', err);
    return INITIAL_DEMO_PANTRY;
  }
}

export function savePantry(items: PantryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Error saving pantry:', err);
  }
}

export function resetPantryToDemo(): PantryItem[] {
  savePantry(INITIAL_DEMO_PANTRY);
  return INITIAL_DEMO_PANTRY;
}

export interface ExpiryStatus {
  daysRemaining: number;
  label: string;
  badgeColor: string;
  level: 'today' | 'tomorrow' | 'soon' | 'safe' | 'expired';
}

export function getExpiryStatus(expiryDateStr?: string): ExpiryStatus | null {
  if (!expiryDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exp = new Date(expiryDateStr);
  exp.setHours(0, 0, 0, 0);

  const diffMs = exp.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      daysRemaining: diffDays,
      label: `Expired ${Math.abs(diffDays)}d ago`,
      badgeColor: 'bg-rose-100 text-rose-950 border-rose-300 font-bold',
      level: 'expired',
    };
  }
  if (diffDays === 0) {
    return {
      daysRemaining: 0,
      label: 'Expires Today',
      badgeColor: 'bg-rose-100 text-rose-950 border-rose-300 font-bold',
      level: 'today',
    };
  }
  if (diffDays === 1) {
    return {
      daysRemaining: 1,
      label: 'Expires Tomorrow',
      badgeColor: 'bg-amber-100 text-amber-950 border-amber-300 font-bold',
      level: 'tomorrow',
    };
  }
  if (diffDays <= 3) {
    return {
      daysRemaining: diffDays,
      label: `Expires in ${diffDays} days`,
      badgeColor: 'bg-amber-100 text-amber-950 border-amber-300 font-bold',
      level: 'soon',
    };
  }
  return {
    daysRemaining: diffDays,
    label: `${diffDays} days left`,
    badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold',
    level: 'safe',
  };
}

export function getSavedRecipes(): string[] {
  const data = localStorage.getItem(SAVED_RECIPES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as string[];
  } catch {
    return [];
  }
}

export function toggleSaveRecipe(recipeId: string): boolean {
  const current = getSavedRecipes();
  let updated: string[];
  let isSaved = false;
  if (current.includes(recipeId)) {
    updated = current.filter(id => id !== recipeId);
    isSaved = false;
  } else {
    updated = [...current, recipeId];
    isSaved = true;
  }
  localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(updated));
  return isSaved;
}

export interface CookingRecord {
  id: string;
  recipeId: string;
  recipeTitle: string;
  cookedAt: string;
  servingsCooked: number;
  ingredientsUsed: { name: string; quantity: number; unit: string }[];
}

export function getCookingHistory(): CookingRecord[] {
  const data = localStorage.getItem(COOKING_HISTORY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function recordCookedRecipe(record: CookingRecord): void {
  const history = getCookingHistory();
  history.unshift(record);
  localStorage.setItem(COOKING_HISTORY_KEY, JSON.stringify(history));
}
