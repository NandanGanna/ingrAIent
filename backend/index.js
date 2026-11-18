const path = require('path');
const dotenv = require('dotenv');

// Reliably load .env regardless of working directory
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const express = require('express');
const cors = require('cors');
const sampleRecipes = require('./data/sampleRecipes.json');
const catalog = require('./data/catalog.json');
const { validateIngredientItem } = require('./validators/foodValidator');
const { generateRecipesWithGemini } = require('./services/geminiService');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// In-memory recipe cache to support GET /api/recipes/:id for both AI and sample recipes
const recipeCache = new Map();
sampleRecipes.forEach(r => recipeCache.set(r.id, { ...r, isDemo: true }));

// Health Check
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  res.json({
    status: 'ok',
    brand: 'IngrAIent',
    tagline: 'Turn ingredients into inspiration.',
    hasGeminiKey: hasKey,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    catalogItems: catalog.length,
    sampleRecipes: sampleRecipes.length,
    timestamp: new Date().toISOString()
  });
});

// Full Ingredient Catalog
app.get('/api/catalog', (req, res) => {
  res.json(catalog);
});

// Ingredient Validation Endpoint
app.post('/api/validate-ingredients', (req, res) => {
  const { rawText, items } = req.body;
  const list = [];

  if (Array.isArray(items)) {
    list.push(...items);
  } else if (typeof rawText === 'string') {
    list.push(...rawText.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean));
  }

  const valid = [];
  const invalid = [];
  const unrecognized = [];

  for (const item of list) {
    const result = validateIngredientItem(item);
    if (result.status === 'valid') {
      valid.push(result);
    } else if (result.status === 'non_food') {
      invalid.push(result);
    } else {
      unrecognized.push(result);
    }
  }

  res.json({
    totalChecked: list.length,
    hasInvalid: invalid.length > 0,
    valid,
    invalid,
    unrecognized,
    errorMessage: invalid.length > 0
      ? `Some items aren't recognized as food ingredients: ${invalid.map(i => i.raw).join(', ')}. Please add edible food ingredients.`
      : null
  });
});

// Get all recipes (sample + cached)
app.get('/api/recipes', (req, res) => {
  const all = Array.from(recipeCache.values());
  res.json({ recipes: all });
});

// Get single recipe by ID
app.get('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  const found = recipeCache.get(id);
  if (found) {
    return res.json(found);
  }
  return res.status(404).json({ error: `Recipe with ID "${id}" not found.` });
});

// Generate Recipes Endpoint
let requestCounter = 0;
async function handleGenerate(req, res) {
  const reqId = `req-${Date.now()}-${++requestCounter}`;
  const startTime = Date.now();
  const { pantryIngredients = [], useDemoIfNoKey = true } = req.body;
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());

  console.log(`[REQUEST_START] ID: ${reqId} | Endpoint: POST /api/recipes/generate | Pantry Items: ${pantryIngredients.length} | Time: ${new Date().toISOString()}`);

  if (!hasKey) {
    if (useDemoIfNoKey) {
      console.log(`[REQUEST_COMPLETE] ID: ${reqId} | Status: 200 (Demo Mode) | Duration: ${Date.now() - startTime}ms`);
      return res.json({
        isDemo: true,
        message: 'Serving curated culinary recipes (Demo Mode). Add your GEMINI_API_KEY to backend/.env for live AI recipe generation.',
        recipes: sampleRecipes.map(r => ({ ...r, isDemo: true }))
      });
    }
    console.warn(`[REQUEST_ERROR] ID: ${reqId} | Status: 400 | Category: MISSING_API_KEY | Duration: ${Date.now() - startTime}ms`);
    return res.status(400).json({
      error: 'GEMINI_API_KEY is not configured on the backend. Please add GEMINI_API_KEY to backend/.env.',
      code: 'MISSING_API_KEY'
    });
  }

  // Safety timer to prevent Express socket hanging indefinitely
  let responseSent = false;
  const timeoutGuard = setTimeout(() => {
    if (!responseSent) {
      responseSent = true;
      const duration = Date.now() - startTime;
      console.error(`[REQUEST_TIMEOUT] ID: ${reqId} | Status: 504 | Duration: ${duration}ms | Exceeded 45s safety limit`);
      res.status(504).json({
        error: 'Recipe generation timed out after 45 seconds. Please retry.',
        code: 'TIMEOUT'
      });
    }
  }, 45000);

  try {
    const generated = await generateRecipesWithGemini(req.body);
    if (responseSent) return;
    clearTimeout(timeoutGuard);
    responseSent = true;

    // Cache generated recipes
    generated.forEach(r => recipeCache.set(r.id, r));

    const duration = Date.now() - startTime;
    console.log(`[REQUEST_COMPLETE] ID: ${reqId} | Status: 200 (Live AI) | Recipes: ${generated.length} | Duration: ${duration}ms`);

    res.json({
      isDemo: false,
      recipes: generated
    });
  } catch (err) {
    if (responseSent) return;
    clearTimeout(timeoutGuard);
    responseSent = true;

    const duration = Date.now() - startTime;
    const category = err.code || (err.status === 503 ? 'UNAVAILABLE_503' : 'GENERATION_ERROR');

    let statusCode = 500;
    if (category === 'MISSING_API_KEY' || category === 'NO_VALID_INGREDIENTS') statusCode = 400;
    else if (category === 'INVALID_API_KEY') statusCode = 401;
    else if (category === 'STRICT_ALLOWLIST_VIOLATION') statusCode = 422;
    else if (category === 'QUOTA_EXCEEDED') statusCode = 429;
    else if (category === 'UNAVAILABLE_503') statusCode = 503;
    else if (category === 'TIMEOUT') statusCode = 504;

    console.error(`[REQUEST_ERROR] ID: ${reqId} | Status: ${statusCode} | Category: ${category} | Duration: ${duration}ms | Message: ${err.message}`);

    res.status(statusCode).json({
      error: err.message || 'Failed to generate recipes with Gemini AI.',
      code: category,
      details: err.details
    });
  }
}

app.post('/api/recipes/generate', handleGenerate);
app.post('/api/generate', handleGenerate);
// Also support GET /api/generate for direct browser viewing / fallback
app.get('/api/generate', (req, res) => {
  res.json({
    recipes: Array.from(recipeCache.values())
  });
});

const distPath = path.resolve(__dirname, '../frontend/dist');
const fs = require('fs');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`IngrAIent Backend running on port ${PORT}`);
  console.log(`Brand: IngrAIent — Turn ingredients into inspiration.`);
  console.log(`Gemini API configured: ${Boolean(process.env.GEMINI_API_KEY)}`);
  console.log(`Gemini Model: ${process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'}`);
  console.log(`===============================================`);
});
