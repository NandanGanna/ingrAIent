const { GoogleGenAI } = require('@google/genai');
const { z } = require('zod');
const { validateIngredientItem } = require('../validators/foodValidator');

const RecipeIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  available: z.boolean().default(false),
  required: z.boolean().default(true),
  optional: z.boolean().default(false),
  category: z.string().optional(),
  notes: z.string().optional(),
});

const RecipeStepSchema = z.object({
  instruction: z.string(),
  durationMinutes: z.number().optional(),
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
  cuisine: z.string(),
  prepTimeMinutes: z.number().default(15),
  cookTimeMinutes: z.number().default(20),
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

const DISH_IMAGE_REGISTRY = [
  { keywords: ['paneer bhurji', 'cottage cheese scramble'], url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['paneer', 'cottage cheese'], url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['yellow dal', 'dal tadka', 'tadka dal', 'lentil dal', 'lentil soup', 'dal'], url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['matar pulao', 'vegetable pulao', 'pulao', 'pilaf', 'biryani'], url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['egg fried rice', 'fried rice', 'wok rice'], url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['pasta', 'penne', 'spaghetti', 'fettuccine', 'fusilli', 'macaroni'], url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['noodles', 'ramen', 'chow mein', 'pad thai'], url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['masala omelette', 'omelette', 'omelet'], url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['shakshuka', 'frittata', 'scrambled egg', 'scramble'], url: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['egg', 'eggs'], url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['soup', 'broth', 'stew', 'chowder'], url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['salad', 'bowl', 'lettuce', 'slaw'], url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['chicken', 'tikka', 'poultry'], url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['fish', 'salmon', 'prawn', 'shrimp', 'seafood'], url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['sandwich', 'toast', 'burger', 'wrap'], url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['curry', 'masala', 'sabzi', 'stir fry', 'vegetable'], url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80' },
];

const DISH_IMAGE_FALLBACKS = [
  'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
];

// Persistent image cache to ensure reopening the same recipe displays the exact same image
const recipeImageCache = new Map();

function getDishImage(title, cuisine = '', index = 0) {
  const normKey = title.trim().toLowerCase();
  if (recipeImageCache.has(normKey)) {
    return recipeImageCache.get(normKey);
  }

  // Find exact keyword matches from registry
  for (const entry of DISH_IMAGE_REGISTRY) {
    if (entry.keywords.some(k => normKey.includes(k))) {
      recipeImageCache.set(normKey, entry.url);
      return entry.url;
    }
  }

  // Fallback deterministically by hash of title
  let hash = 0;
  for (let i = 0; i < normKey.length; i++) {
    hash = (hash << 5) - hash + normKey.charCodeAt(i);
    hash |= 0;
  }
  const fallbackIndex = Math.abs(hash + index) % DISH_IMAGE_FALLBACKS.length;
  const selected = DISH_IMAGE_FALLBACKS[fallbackIndex];
  recipeImageCache.set(normKey, selected);
  return selected;
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

  // Filter valid pantry items and separate expiring ones
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
    const error = new Error('No valid edible food ingredients provided in pantry.');
    error.code = 'NO_VALID_INGREDIENTS';
    throw error;
  }

  // Construct prompt
  const pantryListStr = validPantry.map(i => `- ${i.name} (${i.quantity} ${i.unit})${i.expiry ? ` [Expiry: ${i.expiry}]` : ''}`).join('\n');
  const expiringStr = expiringPantry.length > 0 
    ? `PRIORITY EXPIRING INGREDIENTS (MUST PRIORITIZE USING THESE FIRST):\n${expiringPantry.map(i => `- ${i.name}`).join('\n')}`
    : 'None expiring urgently.';

  const systemPrompt = `You are IngrAIent, an elite culinary AI chef specializing in kitchen intelligence and zero food waste.
Your mission is to invent 3 DISTINCT, mouthwatering recipes utilizing the user's available pantry ingredients, prioritizing those expiring soon.

CRITICAL FOOD SAFETY & HYGIENE RULES:
1. ONLY propose real, edible culinary food ingredients. Never include non-food items, household chemicals, or dangerous items.
2. Every ingredient MUST be a realistic culinary item.
3. Clearly mark each recipe's ingredients:
   - "available": true if the user already has this ingredient in their pantry list
   - "required": true if essential to the dish, false if optional/garnish
   - "optional": true if it can be omitted without ruining the dish
4. Always provide 2-3 realistic substitutions for ingredients that might be missing or optional.
5. All cooking steps MUST have practical instructions and approximate durationMinutes.

USER PREFERENCES:
- Cuisine: ${cuisinePreference}
- Dietary constraint: ${dietaryPreference}
- Servings: ${servings}
- Max cooking time: ${maxTimeMinutes} minutes
- Meal Type: ${mealType}
- Target Difficulty: ${difficulty}
${quickFilter ? `- Quick Filter Goal: ${quickFilter}` : ''}
${additionalInstructions ? `- Special Instructions: ${additionalInstructions}` : ''}

USER PANTRY INVENTORY:
${pantryListStr}

${expiringStr}

Return a JSON object conforming strictly to this format:
{
  "recipes": [
    {
      "id": "recipe-unique-slug",
      "title": "Dish Title",
      "description": "Engaging description explaining flavor profile and how it uses pantry ingredients",
      "cuisine": "Indian" | "Italian" | "Mexican" | "Asian" | "Continental" | etc.,
      "prepTimeMinutes": number,
      "cookTimeMinutes": number,
      "difficulty": "Easy" | "Medium" | "Hard",
      "servings": ${servings},
      "tags": ["Tag1", "Tag2"],
      "ingredients": [
        {
          "name": "Ingredient Name",
          "quantity": number,
          "unit": "g" | "kg" | "ml" | "L" | "pcs" | "tbsp" | "tsp" | "cup" | "cloves",
          "available": boolean,
          "required": boolean,
          "optional": boolean,
          "notes": "optional preparation note like 'finely diced'"
        }
      ],
      "steps": [
        {
          "instruction": "Clear step instruction",
          "durationMinutes": number
        }
      ],
      "substitutions": [
        {
          "original": "Ingredient",
          "substitute": "Alternative",
          "ratio": "1:1",
          "notes": "Why this substitution works"
        }
      ]
    }
  ]
}`;

  // Prefer gemini-3.5-flash for fastest, most stable responses; fallback to gemini-3.8-flash on demand spikes
  const requestedModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const modelCandidates = [
    requestedModel,
    requestedModel === 'gemini-3.5-flash' ? 'gemini-3.8-flash' : 'gemini-3.5-flash'
  ];

  let responseText = '';
  let lastError = null;

  for (const modelName of modelCandidates) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[GEMINI_REQUEST] Invoking model: ${modelName} (attempt ${attempt}/2)`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: systemPrompt,
          config: {
            responseMimeType: 'application/json',
          }
        });
        responseText = response.text;
        lastError = null;
        console.log(`[GEMINI_SUCCESS] Received response from model: ${modelName}`);
        break;
      } catch (apiError) {
        lastError = apiError;
        const errMsg = apiError.message || '';
        console.warn(`[GEMINI_WARN] Model ${modelName} attempt ${attempt}/2 failed: ${errMsg}`);
        
        // Check for non-retryable errors immediately
        if (errMsg.includes('API_KEY_INVALID') || apiError.status === 400 && errMsg.includes('key')) {
          const err = new Error('Invalid Gemini API key. Please check your credentials.');
          err.code = 'INVALID_API_KEY';
          throw err;
        }

        if (apiError.status === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
          const err = new Error('Gemini API quota exceeded. Please retry in a few moments.');
          err.code = 'QUOTA_EXCEEDED';
          throw err;
        }

        // On 503 demand spike or timeout, back off briefly or try alternative model
        if (attempt === 1 && (apiError.status === 503 || errMsg.includes('503') || errMsg.includes('demand'))) {
          console.log(`[GEMINI_RETRY] Temporary demand spike on ${modelName}, waiting 1s before retry...`);
          await new Promise(res => setTimeout(res, 1000));
        } else {
          // Break to next candidate model
          break;
        }
      }
    }
    if (responseText) break;
  }

  if (lastError || !responseText) {
    const err = new Error(
      lastError?.message?.includes('503')
        ? 'Gemini servers are currently experiencing high demand. Please retry.'
        : `Gemini API call failed: ${lastError ? lastError.message : 'No response received'}`
    );
    err.code = lastError?.status === 503 ? 'UNAVAILABLE_503' : (lastError?.code || 'GEMINI_CALL_FAILED');
    throw err;
  }

  // Parse JSON
  let rawParsed;
  try {
    rawParsed = JSON.parse(responseText);
  } catch (jsonErr) {
    const err = new Error('Model did not return valid JSON');
    err.code = 'MALFORMED_AI_OUTPUT';
    throw err;
  }

  // Zod validate structure
  const parseResult = GeneratedResponseSchema.safeParse(rawParsed);
  if (!parseResult.success) {
    console.error('AI response failed Zod validation:', parseResult.error);
    const err = new Error('Generated recipes did not match strict validation schema');
    err.code = 'SCHEMA_VALIDATION_FAILED';
    err.details = parseResult.error.format();
    throw err;
  }

  // Post-validate ingredients against non-food blacklist & food safety
  const safeRecipes = [];
  for (let idx = 0; idx < parseResult.data.recipes.length; idx++) {
    const rec = parseResult.data.recipes[idx];
    const sanitizedIngredients = [];

    for (const ing of rec.ingredients) {
      const val = validateIngredientItem(ing.name);
      if (val.status === 'non_food') {
        console.warn(`Rejecting non-food ingredient generated by AI: ${ing.name}`);
        continue; // omit non-food items strictly!
      }
      sanitizedIngredients.push({
        ...ing,
        name: val.canonicalName || ing.name,
      });
    }

    if (sanitizedIngredients.length >= 2) {
      safeRecipes.push({
        ...rec,
        id: rec.id || `ai-recipe-${Date.now()}-${idx}`,
        image: rec.image || getDishImage(rec.title, rec.cuisine, idx),
        ingredients: sanitizedIngredients,
        isDemo: false
      });
    }
  }

  if (safeRecipes.length === 0) {
    const err = new Error('AI generated recipes contained invalid ingredients.');
    err.code = 'UNSAFE_RECIPES';
    throw err;
  }

  return safeRecipes;
}

module.exports = {
  generateRecipesWithGemini,
  getDishImage
};
