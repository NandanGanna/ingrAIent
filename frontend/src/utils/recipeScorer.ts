import type { Recipe, PantryItem } from '../types';
import { getExpiryStatus } from './pantry';

export interface MatchScoreResult {
  matchPercentage: number;
  availableIngredients: string[];
  missingIngredients: string[];
  expiringIngredientsUsed: string[];
  explanation: string;
}

export function calculateRecipeMatch(
  recipe: Recipe,
  pantry: PantryItem[]
): MatchScoreResult {
  const pantryNames = pantry.map((item) => item.name.trim().toLowerCase());
  const pantryMap = new Map<string, PantryItem>();
  pantry.forEach((item) => pantryMap.set(item.name.trim().toLowerCase(), item));

  const available: string[] = [];
  const missing: string[] = [];
  const expiringUsed: string[] = [];

  let requiredCount = 0;
  let requiredAvailableCount = 0;
  let optionalCount = 0;
  let optionalAvailableCount = 0;

  for (const ing of recipe.ingredients) {
    const ingNameLower = ing.name.trim().toLowerCase();

    // Check if ingredient is in pantry
    const inPantry = pantryNames.some(
      (pName) =>
        pName === ingNameLower ||
        pName.includes(ingNameLower) ||
        ingNameLower.includes(pName)
    );

    const matchedPantryItem = pantry.find(
      (p) =>
        p.name.toLowerCase() === ingNameLower ||
        p.name.toLowerCase().includes(ingNameLower) ||
        ingNameLower.includes(p.name.toLowerCase())
    );

    if (inPantry) {
      available.push(ing.name);
      if (ing.required !== false) {
        requiredAvailableCount++;
      } else {
        optionalAvailableCount++;
      }

      // Check if it's expiring soon
      if (matchedPantryItem && matchedPantryItem.expiry) {
        const status = getExpiryStatus(matchedPantryItem.expiry);
        if (status && (status.level === 'today' || status.level === 'tomorrow' || status.level === 'soon')) {
          if (!expiringUsed.includes(matchedPantryItem.name)) {
            expiringUsed.push(matchedPantryItem.name);
          }
        }
      }
    } else {
      if (ing.required !== false) {
        missing.push(ing.name);
      }
    }

    if (ing.required !== false) {
      requiredCount++;
    } else {
      optionalCount++;
    }
  }

  // Scoring algorithm:
  // Required ingredients count for 80% of base weight
  // Optional ingredients count for 10%
  // Expiring ingredient bonus up to 10%
  const totalRequired = requiredCount > 0 ? requiredCount : 1;
  const requiredRatio = requiredAvailableCount / totalRequired;

  const totalOptional = optionalCount > 0 ? optionalCount : 1;
  const optionalRatio = optionalCount > 0 ? optionalAvailableCount / totalOptional : 1;

  let baseScore = (requiredRatio * 80) + (optionalRatio * 10);

  // Expiry bonus (up to 10%)
  const expiryBonus = Math.min(10, expiringUsed.length * 5);
  let finalScore = Math.round(baseScore + expiryBonus);

  // Bounds check
  finalScore = Math.max(10, Math.min(100, finalScore));

  // If 0 required ingredients available, cap at 20%
  if (requiredAvailableCount === 0 && requiredCount > 0) {
    finalScore = Math.min(finalScore, 20);
  }

  // Explanation generation
  let explanation = '';
  if (finalScore >= 90) {
    explanation = `Outstanding match! You have almost all ingredients`;
    if (expiringUsed.length > 0) {
      explanation += `, and it uses your ${expiringUsed.join(' and ')} that should be cooked soon.`;
    } else {
      explanation += ` ready in your pantry.`;
    }
  } else if (finalScore >= 70) {
    explanation = `Great match! Most key ingredients are in your kitchen`;
    if (missing.length > 0) {
      explanation += ` (missing: ${missing.slice(0, 2).join(', ')}).`;
    }
    if (expiringUsed.length > 0) {
      explanation += ` Helps use up your ${expiringUsed.join(', ')}.`;
    }
  } else if (finalScore >= 45) {
    explanation = `Moderate match. You'll need ${missing.length} ingredient${missing.length > 1 ? 's' : ''} (${missing.slice(0, 3).join(', ')}).`;
  } else {
    explanation = `Low match. Several key ingredients are currently missing from your pantry.`;
  }

  return {
    matchPercentage: finalScore,
    availableIngredients: available,
    missingIngredients: missing,
    expiringIngredientsUsed: expiringUsed,
    explanation,
  };
}

export function enrichRecipesWithPantry(
  recipes: Recipe[],
  pantry: PantryItem[]
): Recipe[] {
  return recipes.map((recipe) => {
    const scored = calculateRecipeMatch(recipe, pantry);
    return {
      ...recipe,
      matchScore: scored.matchPercentage,
      explanation: scored.explanation,
      expiringIngredientsUsed: scored.expiringIngredientsUsed,
      missingIngredients: scored.missingIngredients,
      ingredients: recipe.ingredients.map((ing) => ({
        ...ing,
        available: scored.availableIngredients.some(
          (a) => a.toLowerCase() === ing.name.toLowerCase()
        ),
      })),
    };
  });
}
