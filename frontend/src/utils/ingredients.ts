import catalog from '../data/ingredients/catalog.json';
import type { CatalogItem } from './validation';

export const CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Dairy',
  'Protein',
  'Grains',
  'Spices',
  'Condiments',
  'Others',
] as const;

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  Vegetables: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',
  Fruits: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=400&q=80',
  Dairy: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=400&q=80',
  Protein: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
  Grains: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
  Spices: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80',
  Condiments: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
  Others: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=400&q=80',
};

const catalogList = catalog as CatalogItem[];

export function getAllCatalogItems(): CatalogItem[] {
  return catalogList;
}

export function getIngredientImage(name: string, category?: string): string {
  const norm = name.trim().toLowerCase();
  if (!norm) {
    const cat = category && CATEGORY_FALLBACK_IMAGES[category] ? category : 'Others';
    return CATEGORY_FALLBACK_IMAGES[cat];
  }
  
  // 1. Exact match on canonical name or alias
  const exact = catalogList.find(
    (item) =>
      item.name.toLowerCase() === norm ||
      item.id.toLowerCase() === norm.replace(/\s+/g, '_') ||
      item.aliases?.some((a) => a.toLowerCase() === norm)
  );

  if (exact) {
    return exact.image;
  }

  // 2. Tokenized match (ensures whole words match, preventing 'ice' -> 'rice' or 'apple' -> 'pineapple')
  const inputWords = norm.split(/[\s,._-]+/).filter(Boolean);
  const tokenMatch = catalogList.find((item) => {
    const itemWords = item.name.toLowerCase().split(/[\s,._-]+/);
    const aliasWords = item.aliases?.flatMap(a => a.toLowerCase().split(/[\s,._-]+/)) || [];
    return inputWords.some(w => itemWords.includes(w) || aliasWords.includes(w));
  });

  if (tokenMatch) {
    return tokenMatch.image;
  }

  // 3. Fallback to appropriate category-specific culinary photography
  const cat = category && CATEGORY_FALLBACK_IMAGES[category] ? category : getIngredientCategory(name);
  return CATEGORY_FALLBACK_IMAGES[cat] || CATEGORY_FALLBACK_IMAGES['Others'];
}

export function getIngredientCategory(name: string): string {
  const norm = name.trim().toLowerCase();
  const found = catalogList.find(
    (item) =>
      item.name.toLowerCase() === norm ||
      item.aliases?.some((a) => a.toLowerCase() === norm)
  );
  return found?.category || 'Others';
}
