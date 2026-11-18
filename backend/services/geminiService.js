const { GoogleGenAI } = require('@google/genai');
const { z } = require('zod');
const { validateIngredientItem } = require('../validators/foodValidator');

const RecipeIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number().default(1),
  unit: z.string().default('pcs'),
  available: z.boolean().default(true),
  required: z.boolean().default(true),
  optional: z.boolean().default(false),
  category: z.string().optional(),
  notes: z.string().optional(),
});

const RecipeStepSchema = z.object({
  instruction: z.string(),
  durationMinutes: z.number().optional().default(5),
});

const RecipeSubstitutionSchema = z.object({
  original: z.string(),
  substitute: z.string(),
  ratio: z.string().optional().default("1:1"),
  notes: z.string().optional().default(""),
});

const RecipeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  cuisine: z.string().default('Continental'),
  prepTimeMinutes: z.number().default(10),
  cookTimeMinutes: z.number().default(15),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Easy'),
  servings: z.number().default(2),
  ingredients: z.array(RecipeIngredientSchema),
  steps: z.array(RecipeStepSchema),
  tags: z.array(z.string()).default([]),
  substitutions: z.array(RecipeSubstitutionSchema).default([]),
  image: z.string().optional(),
});

const GeneratedResponseSchema = z.object({
  recipes: z.array(RecipeSchema),
});

// Helper to normalize ingredient strings for exact/fuzzy allowlist matching
function normalizeIng(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build allowed tokens and canonical variations from user pantry
function buildAllowlistIndex(validPantry) {
  const allowedNorms = new Set();
  const allowedRoots = new Set();

  for (const item of validPantry) {
    const rawNorm = normalizeIng(item.name);
    allowedNorms.add(rawNorm);

    // Also check canonical name from validator
    const val = validateIngredientItem(item.name);
    if (val.canonicalName) {
      allowedNorms.add(normalizeIng(val.canonicalName));
    }

    // Split words for partial matching (e.g. "red tomato" -> "tomato")
    rawNorm.split(' ').forEach(w => {
      if (w.length > 2) allowedRoots.add(w);
    });
  }

  return {
    isAllowed(ingredientName) {
      const norm = normalizeIng(ingredientName);
      if (allowedNorms.has(norm)) return true;

      // Check canonical match
      const val = validateIngredientItem(ingredientName);
      if (val.canonicalName && allowedNorms.has(normalizeIng(val.canonicalName))) {
        return true;
      }

      // Check substring match (e.g. "chopped tomato" containing "tomato")
      for (const allowed of allowedNorms) {
        if (norm.includes(allowed) || allowed.includes(norm)) {
          return true;
        }
      }

      // Check root word match (e.g. "tomatoes" vs "tomato")
      for (const root of allowedRoots) {
        if (norm.startsWith(root) || norm.includes(root)) {
          return true;
        }
      }

      return false;
    }
  };
}

async function callGeminiWithTimeout(ai, modelName, contents, timeoutMs = 28000) {
  const apiCallPromise = ai.models.generateContent({
    model: modelName,
    contents,
    config: {
      responseMimeType: 'application/json',
    }
  });

  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(`Gemini generation timed out after ${Math.round(timeoutMs / 1000)}s on model ${modelName}`);
      err.code = 'TIMEOUT';
      reject(err);
    }, timeoutMs);
    apiCallPromise.finally(() => clearTimeout(timer));
  });

  return Promise.race([apiCallPromise, timeoutPromise]);
}

async function generateRecipesWithGemini(requestData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    const error = new Error('GEMINI_API_KEY is not configured in backend environment.');
    error.code = 'MISSING_API_KEY';
    throw error;
  }

  const ai = new GoogleGenAI({ apiKey });

  const {
    pantryIngredients = [],
    cuisinePreference = 'Any',
    dietaryPreference = 'Any',
    servings = 2,
    maxTimeMinutes = 45,
    mealType = 'Any',
    difficulty = 'Any',
    additionalInstructions = '',
    quickFilter = ''
  } = requestData;

  // Filter valid edible pantry items
  const validPantry = [];
  const expiringPantry = [];
  const now = new Date();

  for (const item of pantryIngredients) {
    const val = validateIngredientItem(item.name);
    if (val.status === 'valid') {
      const entry = {
        name: val.canonicalName || item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiry: item.expiry
      };
      validPantry.push(entry);

      if (item.expiry) {
        const expDate = new Date(item.expiry);
        const diffDays = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 3) {
          expiringPantry.push(entry);
        }
      }
    }
  }

  if (validPantry.length === 0) {
    const error = new Error('No valid edible food ingredients selected in pantry.');
    error.code = 'NO_VALID_INGREDIENTS';
    throw error;
  }

  const allowlistIndex = buildAllowlistIndex(validPantry);
  const pantryListStr = validPantry.map(i => `- ${i.name} (${i.quantity} ${i.unit})${i.expiry ? ` [Expiry: ${i.expiry}]` : ''}`).join('\n');
  const allowedNamesList = validPantry.map(i => i.name).join(', ');

  const expiringStr = expiringPantry.length > 0 
    ? `PRIORITY EXPIRING INGREDIENTS (MUST PRIORITIZE USING THESE FIRST):\n${expiringPantry.map(i => `- ${i.name}`).join('\n')}`
    : 'None expiring urgently.';

  function constructPrompt(violationNotice = '') {
    return `You are IngrAIent, an elite culinary AI chef specializing in kitchen intelligence and zero food waste.
Your mission is to invent 3 DISTINCT, delicious recipes utilizing ONLY the user's available pantry ingredients.

${violationNotice ? `⚠️ REGENERATION CORRECTION REQUIRED:\n${violationNotice}\n` : ''}

CRITICAL ZERO-ASSUMPTION INGREDIENT RESTRICTION (STRICT ALLOWLIST):
1. You may ONLY use ingredients that are explicitly listed in the USER PANTRY INVENTORY below: [${allowedNamesList}].
2. You MUST NOT add, assume, or introduce ANY unlisted ingredients—including salt, black pepper, cooking oil, butter, ghee, water, garlic, onions, sugar, or unlisted spices—UNLESS they appear in the allowed list above.
3. Every single ingredient in your recipes MUST be chosen from the allowed list. Do NOT invent staples.
4. Adapt cooking methods (dry roasting, steaming, grilling, searing in the food's natural juices) to make incredible dishes using STRICTLY the provided ingredients.
5. All ingredients in the recipe MUST have "available": true.
6. Only propose real, edible culinary food. Never propose non-food items.
7. Provide practical cooking steps with approximate durationMinutes.

USER PREFERENCES:
- Cuisine: ${cuisinePreference}
- Dietary constraint: ${dietaryPreference}
- Servings: ${servings}
- Max cooking time: ${maxTimeMinutes} minutes
- Meal Type: ${mealType}
- Target Difficulty: ${difficulty}
${quickFilter ? `- Quick Filter Goal: ${quickFilter}` : ''}
${additionalInstructions ? `- Special Instructions: ${additionalInstructions}` : ''}

USER PANTRY INVENTORY (THE ONLY ALLOWED INGREDIENTS):
${pantryListStr}

${expiringStr}

Return a JSON object conforming strictly to this format:
{
  "recipes": [
    {
      "id": "recipe-unique-slug",
      "title": "Dish Title",
      "description": "Engaging description explaining flavor profile and how it uses the selected ingredients",
      "cuisine": "${cuisinePreference !== 'Any' ? cuisinePreference : 'Continental'}",
      "prepTimeMinutes": number,
      "cookTimeMinutes": number,
      "difficulty": "Easy" | "Medium" | "Hard",
      "servings": ${servings},
      "tags": ["Tag1", "Tag2"],
      "ingredients": [
        {
          "name": "Ingredient Name (MUST be from the allowed pantry list)",
          "quantity": number,
          "unit": "g" | "kg" | "ml" | "L" | "pcs" | "tbsp" | "tsp" | "cup" | "cloves",
          "available": true,
          "required": true,
          "optional": false,
          "notes": "optional prep note like 'sliced'"
        }
      ],
      "steps": [
        {
          "instruction": "Clear cooking step using ONLY allowed ingredients",
          "durationMinutes": number
        }
      ],
      "substitutions": []
    }
  ]
}`;
  }

  const requestedModel = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  // High-speed low-latency models with graceful fallbacks
  const modelCandidates = [
    requestedModel,
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.8-flash'
  ].filter((v, i, a) => a.indexOf(v) === i);

  let rawParsed = null;
  let validationErrors = null;
  let lastError = null;

  // Outer loop: up to 2 attempts (initial attempt + 1 controlled retry if allowlist violation occurs)
  for (let generationRound = 1; generationRound <= 2; generationRound++) {
    const violationMsg = validationErrors ? `Previous response included unallowed ingredients: ${validationErrors.join(', ')}. Please strictly use ONLY: ${allowedNamesList}.` : '';
    const promptText = constructPrompt(violationMsg);

    let responseText = '';
    for (const modelName of modelCandidates) {
      const callStart = Date.now();
      try {
        console.log(`[GEMINI_START] Invoking model: ${modelName} | Round: ${generationRound}/2 | Time: ${new Date().toISOString()}`);
        const response = await callGeminiWithTimeout(ai, modelName, promptText, 28000);
        responseText = response.text;
        const callDuration = Date.now() - callStart;
        console.log(`[GEMINI_COMPLETE] Model ${modelName} responded successfully in ${callDuration}ms`);
        lastError = null;
        break; // Success on this candidate
      } catch (apiError) {
        const callDuration = Date.now() - callStart;
        lastError = apiError;
        const errMsg = apiError.message || '';
        console.warn(`[GEMINI_WARN] Model ${modelName} failed after ${callDuration}ms: ${errMsg}`);

        if (errMsg.includes('API_KEY_INVALID') || (apiError.status === 400 && errMsg.includes('key'))) {
          const err = new Error('Invalid Gemini API key. Please check your credentials in backend/.env.');
          err.code = 'INVALID_API_KEY';
          throw err;
        }

        if (apiError.status === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
          const err = new Error('Gemini API quota exceeded. Please retry in a few moments.');
          err.code = 'QUOTA_EXCEEDED';
          throw err;
        }

        // If timeout or 503, try next candidate
        continue;
      }
    }

    if (!responseText) {
      if (lastError?.code === 'TIMEOUT') {
        const err = new Error('Recipe generation timed out. The AI servers took too long to respond. Please retry.');
        err.code = 'TIMEOUT';
        throw err;
      }
      const err = new Error(
        lastError?.status === 503 || lastError?.message?.includes('503')
          ? 'Google AI servers are currently experiencing high demand. Please click Retry.'
          : `Gemini API call failed: ${lastError ? lastError.message : 'No response received'}`
      );
      err.code = lastError?.status === 503 ? 'UNAVAILABLE_503' : (lastError?.code || 'GEMINI_CALL_FAILED');
      throw err;
    }

    // Parse JSON
    try {
      rawParsed = JSON.parse(responseText);
    } catch (jsonErr) {
      console.error('[PARSE_ERROR] Model did not return valid JSON:', responseText.slice(0, 200));
      if (generationRound === 1) {
        validationErrors = ['Malformed JSON response from model'];
        continue;
      }
      const err = new Error('The AI generated an incompatible recipe format. Please click Retry.');
      err.code = 'MALFORMED_AI_OUTPUT';
      throw err;
    }

    // Zod schema check
    const zodResult = GeneratedResponseSchema.safeParse(rawParsed);
    if (!zodResult.success) {
      console.warn('[ZOD_VALIDATION_WARN] Zod schema mismatch:', zodResult.error.issues);
      if (generationRound === 1) {
        validationErrors = ['Schema validation mismatch'];
        continue;
      }
      const err = new Error('Generated recipes did not match strict validation schema.');
      err.code = 'SCHEMA_VALIDATION_FAILED';
      err.details = zodResult.error.format();
      throw err;
    }

    // Validate ingredients against strict pantry allowlist
    const recipes = zodResult.data.recipes;
    const roundViolations = [];
    const safeRecipes = [];

    for (let idx = 0; idx < recipes.length; idx++) {
      const rec = recipes[idx];
      const validIngredients = [];
      let recipeHasDisallowed = false;

      for (const ing of rec.ingredients) {
        const foodCheck = validateIngredientItem(ing.name);
        if (foodCheck.status === 'non_food') {
          console.warn(`[ALLOWLIST_REJECT] Non-food ingredient detected: ${ing.name}`);
          roundViolations.push(ing.name);
          recipeHasDisallowed = true;
          break;
        }

        const isAllowed = allowlistIndex.isAllowed(ing.name);
        if (!isAllowed) {
          console.warn(`[ALLOWLIST_REJECT] Ingredient not in user pantry: "${ing.name}" for recipe "${rec.title}"`);
          roundViolations.push(ing.name);
          recipeHasDisallowed = true;
          break;
        }

        validIngredients.push({
          ...ing,
          name: foodCheck.canonicalName || ing.name,
          available: true
        });
      }

      if (!recipeHasDisallowed && validIngredients.length >= 1) {
        safeRecipes.push({
          ...rec,
          id: rec.id || `recipe-${Date.now()}-${idx}`,
          ingredients: validIngredients,
          isDemo: false
        });
      }
    }

    if (safeRecipes.length > 0) {
      console.log(`[VALIDATION_SUCCESS] Generated ${safeRecipes.length} recipes strictly satisfying the pantry allowlist.`);
      return safeRecipes;
    }

    // If all recipes had violations, record violations and retry once if round 1
    console.warn(`[ROUND_${generationRound}_FAILED] All recipes contained unallowed ingredients: ${roundViolations.join(', ')}`);
    validationErrors = roundViolations;
  }

  // If both rounds failed to strictly satisfy allowlist
  const err = new Error('Could not generate recipes using strictly the selected ingredients. Please select a few more ingredients or kitchen staples.');
  err.code = 'STRICT_ALLOWLIST_VIOLATION';
  throw err;
}

module.exports = {
  generateRecipesWithGemini
};
