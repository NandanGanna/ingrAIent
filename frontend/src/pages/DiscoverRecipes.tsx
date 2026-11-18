import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Clock, 
  ChefHat, 
  AlertTriangle, 
  Bookmark, 
  CheckCircle2, 
  RefreshCw, 
  ChevronRight, 
  Info
} from 'lucide-react';
import { getPantry, getSavedRecipes, toggleSaveRecipe, getExpiryStatus, type PantryItem } from '../utils/pantry';
import { generateRecipesApi, fetchAllRecipes, checkBackendHealth } from '../services/api';
import { enrichRecipesWithPantry } from '../utils/recipeScorer';
import type { Recipe, GenerateRecipeRequest } from '../types';

export default function DiscoverRecipes() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean | null>(null);
  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Filter Form State
  const [cuisine, setCuisine] = useState<string>('Any');
  const [dietary, setDietary] = useState<string>('Any');
  const [servings, setServings] = useState<number>(2);
  const [maxTime, setMaxTime] = useState<number>(45);
  const [mealType, setMealType] = useState<string>('Any');
  const [difficulty, setDifficulty] = useState<string>('Any');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestPayloadRef = useRef<GenerateRecipeRequest | null>(null);
  const requestIdRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  // Clean up timer and abort controller on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Check health and load initial pantry & recipes
  useEffect(() => {
    async function init() {
      const currentPantry = getPantry();
      setPantry(currentPantry);
      setSavedRecipeIds(getSavedRecipes());

      // Check backend health for API key status
      try {
        const health = await checkBackendHealth();
        setHasGeminiKey(health.hasGeminiKey);
      } catch (e) {
        console.warn('Backend health check error:', e);
      }

      // Read query params if arriving from Dashboard
      const filterParam = searchParams.get('filter');
      const searchParam = searchParams.get('search');

      if (filterParam === 'expiring') {
        setActiveQuickFilter('Use Expiring Ingredients');
      }
      if (searchParam) {
        setCustomPrompt(`Recipe with ${searchParam}`);
      }

      // Initial load: fetch recipes & calculate deterministic matches against pantry
      try {
        setLoading(true);
        const initial = await fetchAllRecipes();
        const scored = enrichRecipesWithPantry(initial, currentPantry);
        scored.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        setRecipes(scored);
      } catch (err) {
        console.error('Error fetching initial recipes:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [searchParams]);

  const expiringPantryItems = pantry.filter(item => {
    const s = getExpiryStatus(item.expiry);
    return s && (s.level === 'today' || s.level === 'tomorrow' || s.level === 'soon');
  });

  async function handleGenerate(quickActionName?: string, isRetry = false) {
    if (loading) return; // Prevent duplicate concurrent submissions

    const reqId = ++requestIdRef.current;

    // Abort previous pending request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setElapsedSeconds(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);

    const action = quickActionName !== undefined ? quickActionName : activeQuickFilter;

    const requestPayload: GenerateRecipeRequest = isRetry && lastRequestPayloadRef.current
      ? lastRequestPayloadRef.current
      : {
          pantryIngredients: pantry.map(p => ({
            name: p.name,
            quantity: p.quantity,
            unit: p.unit,
            expiry: p.expiry
          })),
          cuisinePreference: cuisine,
          dietaryPreference: dietary,
          servings,
          maxTimeMinutes: maxTime,
          mealType,
          difficulty,
          additionalInstructions: customPrompt,
          quickFilter: action
        };

    lastRequestPayloadRef.current = requestPayload;

    try {
      const response = await generateRecipesApi(requestPayload, controller.signal);

      // Discard stale responses if a newer request was dispatched
      if (requestIdRef.current !== reqId) return;

      setIsDemoMode(response.isDemo);

      // Score and enrich against current pantry
      const scored = enrichRecipesWithPantry(response.recipes, pantry);
      scored.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      setRecipes(scored);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return; // Request was cleanly cancelled by a newer submission
      }
      if (requestIdRef.current !== reqId) return; // Discard stale error

      console.error('Recipe generation error:', err);

      const code = err.response?.data?.code || err.code;
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout') || err.message?.includes('exceeded') || code === 'TIMEOUT';

      if (isTimeout) {
        setError('Recipe generation timed out. The AI servers took too long to respond. Please click Retry.');
      } else if (code === 'MISSING_API_KEY') {
        setError('Gemini API key is not configured on the backend. Please add GEMINI_API_KEY to backend/.env.');
      } else if (code === 'INVALID_API_KEY') {
        setError('Gemini API key is invalid or unauthorized. Please verify your credentials in backend/.env.');
      } else if (code === 'QUOTA_EXCEEDED') {
        setError('Gemini API quota exceeded. Please wait a moment and retry.');
      } else if (code === 'UNAVAILABLE_503') {
        setError('Google AI servers are currently experiencing high demand. Please click Retry.');
      } else if (code === 'STRICT_ALLOWLIST_VIOLATION') {
        setError(err.response?.data?.error || 'Could not generate recipes using strictly the selected ingredients. Please select a few more ingredients or kitchen staples.');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Network error: unable to connect to IngrAIent server. Please check your backend connection.');
      } else if (code === 'SCHEMA_VALIDATION_FAILED' || code === 'MALFORMED_AI_OUTPUT') {
        setError('The AI generated an incompatible recipe format. Please click Retry.');
      } else {
        setError(
          err.response?.data?.error ||
          err.message ||
          'Could not generate recipes right now. Please click Retry.'
        );
      }
    } finally {
      if (requestIdRef.current === reqId) {
        clearInterval(timerRef.current);
        setLoading(false);
      }
    }
  }

  function handleToggleSave(e: React.MouseEvent, recipeId: string) {
    e.stopPropagation();
    toggleSaveRecipe(recipeId);
    setSavedRecipeIds(getSavedRecipes());
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#242A25] tracking-tight">
            Discover & Generate Recipes
          </h1>
          <p className="text-sm text-[#66756A] mt-1">
            Intelligent culinary discovery strictly prioritizing your available pantry ingredients and items expiring soon.
          </p>
        </div>

        {/* AI Key Status Tag */}
        <div className="flex items-center gap-2">
          {hasGeminiKey === true ? (
            <div className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Gemini AI Connected
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold flex items-center gap-1.5" title="Add GEMINI_API_KEY to backend/.env for real-time generative recipes">
              <Info className="w-3.5 h-3.5 text-amber-600" />
              Demo Catalog Mode (Key Not Configured)
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Presets Bar */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#66756A] mr-1 shrink-0">
          Quick Actions:
        </span>
        {[
          { label: 'Cook with My Pantry', filter: 'Cook with My Pantry' },
          { label: `Use Expiring (${expiringPantryItems.length})`, filter: 'Use Expiring Ingredients' },
          { label: 'Quick 15-min Meals', filter: 'Quick 15-min Meals' },
          { label: 'Vegetarian Favorites', filter: 'Vegetarian' },
          { label: 'High Protein', filter: 'High Protein' },
        ].map((action) => {
          const isActive = activeQuickFilter === action.filter;
          return (
            <button
              key={action.filter}
              disabled={loading}
              onClick={() => {
                const next = isActive ? '' : action.filter;
                setActiveQuickFilter(next);
                handleGenerate(next);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                isActive
                  ? 'bg-[#244C3A] text-[#D9E9A5]'
                  : 'bg-white border border-[#E7E9E1] text-[#242A25] hover:border-[#244C3A]'
              }`}
            >
              {action.label}
            </button>
          );
        })}
      </div>

      {/* Filter and Generator Control Box */}
      <div className="bg-white rounded-3xl p-6 border border-[#E7E9E1] shadow-sm space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#66756A] uppercase tracking-wider mb-1">
              Cuisine
            </label>
            <select
              value={cuisine}
              disabled={loading}
              onChange={(e) => setCuisine(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-[#E7E9E1] bg-[#F8F7F1] text-[#242A25] font-semibold focus:outline-none disabled:opacity-60"
            >
              <option value="Any">Any Cuisine</option>
              <option value="Indian">Indian</option>
              <option value="Italian">Italian</option>
              <option value="Asian">Asian</option>
              <option value="Mexican">Mexican</option>
              <option value="Continental">Continental</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#66756A] uppercase tracking-wider mb-1">
              Dietary
            </label>
            <select
              value={dietary}
              disabled={loading}
              onChange={(e) => setDietary(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-[#E7E9E1] bg-[#F8F7F1] text-[#242A25] font-semibold focus:outline-none disabled:opacity-60"
            >
              <option value="Any">No Restrictions</option>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Vegan">Vegan</option>
              <option value="Gluten-Free">Gluten-Free</option>
              <option value="High-Protein">High Protein</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#66756A] uppercase tracking-wider mb-1">
              Servings
            </label>
            <select
              value={servings}
              disabled={loading}
              onChange={(e) => setServings(Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-xl border border-[#E7E9E1] bg-[#F8F7F1] text-[#242A25] font-semibold focus:outline-none disabled:opacity-60"
            >
              <option value={1}>1 Person</option>
              <option value={2}>2 People</option>
              <option value={4}>4 People</option>
              <option value={6}>6+ People</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#66756A] uppercase tracking-wider mb-1">
              Max Time
            </label>
            <select
              value={maxTime}
              disabled={loading}
              onChange={(e) => setMaxTime(Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-xl border border-[#E7E9E1] bg-[#F8F7F1] text-[#242A25] font-semibold focus:outline-none disabled:opacity-60"
            >
              <option value={15}>15 mins (Speedy)</option>
              <option value={30}>30 mins (Standard)</option>
              <option value={45}>45 mins</option>
              <option value={60}>60+ mins</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#66756A] uppercase tracking-wider mb-1">
              Meal Type
            </label>
            <select
              value={mealType}
              disabled={loading}
              onChange={(e) => setMealType(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-[#E7E9E1] bg-[#F8F7F1] text-[#242A25] font-semibold focus:outline-none disabled:opacity-60"
            >
              <option value="Any">Any Meal</option>
              <option value="Breakfast">Breakfast</option>
              <option value="Lunch">Lunch</option>
              <option value="Dinner">Dinner</option>
              <option value="Snack">Snack</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#66756A] uppercase tracking-wider mb-1">
              Difficulty
            </label>
            <select
              value={difficulty}
              disabled={loading}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-[#E7E9E1] bg-[#F8F7F1] text-[#242A25] font-semibold focus:outline-none disabled:opacity-60"
            >
              <option value="Any">Any Level</option>
              <option value="Easy">Easy (Beginner)</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard (Chef)</option>
            </select>
          </div>
        </div>

        {/* Custom prompt input & Generate Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <input
            type="text"
            value={customPrompt}
            disabled={loading}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Special prompt: e.g. 'Crispy snacks', 'Comfort soup', 'Low carb dinner'..."
            className="flex-1 w-full text-xs p-3.5 rounded-2xl border border-[#E7E9E1] bg-[#F8F7F1] text-[#242A25] focus:outline-none focus:border-[#244C3A] disabled:opacity-60"
          />

          <button
            onClick={() => handleGenerate()}
            disabled={loading}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-md flex items-center justify-center gap-2.5 transition-all whitespace-nowrap ${
              loading 
                ? 'bg-[#1b382b] text-[#A8BDA5] cursor-not-allowed opacity-90' 
                : 'bg-[#244C3A] text-white hover:bg-[#1e3f30] hover:shadow-xl active:scale-95'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#D9E9A5]" />
                <span>Crafting Recipes with IngrAIent... ({elapsedSeconds}s)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#D9E9A5]" />
                <span>Generate Smart Recipes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => handleGenerate(undefined, true)}
            disabled={loading}
            className="px-4 py-1.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-60 transition-colors shrink-0 shadow-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Recipes Result Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-[#66756A]">
          <span>
            Showing <strong className="text-[#242A25]">{recipes.length}</strong> intelligent recipe recommendations
          </span>
          {isDemoMode && (
            <span className="italic text-amber-700 font-medium">
              * Displaying curated culinary recipes (Demo Mode). Add GEMINI_API_KEY to generate new live recipes.
            </span>
          )}
        </div>

        {loading ? (
          /* Text-based, image-free editorial loading skeletons */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div 
                key={n} 
                className="bg-white rounded-3xl p-6 border border-[#E7E9E1] animate-pulse space-y-4 flex flex-col justify-between shadow-sm min-h-[360px]"
              >
                <div className="space-y-4">
                  {/* Header badges skeleton */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded-full w-24" />
                      <div className="h-6 bg-gray-100 rounded-lg w-16" />
                    </div>
                    <div className="h-8 bg-gray-100 rounded-xl w-8" />
                  </div>

                  {/* Title & Description skeleton */}
                  <div className="space-y-2 pt-2">
                    <div className="h-7 bg-gray-200 rounded-xl w-4/5" />
                    <div className="h-4 bg-gray-100 rounded-lg w-full" />
                    <div className="h-4 bg-gray-100 rounded-lg w-2/3" />
                  </div>

                  {/* Meta Stat Row skeleton */}
                  <div className="h-8 bg-gray-100 rounded-xl w-full" />

                  {/* Ingredients chips skeleton */}
                  <div className="space-y-2 pt-1">
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                    <div className="flex flex-wrap gap-1.5">
                      <div className="h-6 bg-gray-100 rounded-lg w-16" />
                      <div className="h-6 bg-gray-100 rounded-lg w-20" />
                      <div className="h-6 bg-gray-100 rounded-lg w-14" />
                    </div>
                  </div>
                </div>

                {/* Footer action button skeleton */}
                <div className="h-10 bg-gray-100 rounded-xl w-full mt-4" />
              </div>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-[#E7E9E1] space-y-3">
            <ChefHat className="w-10 h-10 text-[#A8BDA5] mx-auto" />
            <h3 className="text-lg font-bold text-[#242A25]">No matching recipes found</h3>
            <p className="text-xs text-[#66756A] max-w-sm mx-auto">
              Try adjusting your filters or click "Generate Smart Recipes" to craft new dishes strictly from your available pantry.
            </p>
          </div>
        ) : (
          /* Editorial image-free Recipe Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => {
              const isSaved = savedRecipeIds.includes(recipe.id);
              const availableCount = recipe.ingredients.filter(i => i.available).length;
              const totalCount = recipe.ingredients.length;

              return (
                <div
                  key={recipe.id}
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                  className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm border border-[#E7E9E1] hover:shadow-xl hover:border-[#244C3A] transition-all flex flex-col justify-between"
                >
                  <div className="p-6 space-y-4">
                    {/* Card Header: Match Badge, Cuisine, Bookmark */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5 ${
                          (recipe.matchScore || 0) >= 80 
                            ? 'bg-[#244C3A] text-[#D9E9A5]' 
                            : (recipe.matchScore || 0) >= 60
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-[#F8F7F1] text-[#242A25] border border-[#E7E9E1]'
                        }`}>
                          <Sparkles className="w-3.5 h-3.5 text-[#D9E9A5]" />
                          <span>{recipe.matchScore || 85}% Match</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F8F7F1] text-[#66756A] border border-[#E7E9E1]">
                          {recipe.cuisine}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleToggleSave(e, recipe.id)}
                        className={`p-2 rounded-xl transition-all border ${
                          isSaved 
                            ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm' 
                            : 'bg-[#F8F7F1] text-gray-500 border-[#E7E9E1] hover:bg-gray-100'
                        }`}
                        title={isSaved ? 'Unsave recipe' : 'Save recipe'}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-rose-600' : ''}`} />
                      </button>
                    </div>

                    {/* Recipe Title & Description */}
                    <div className="space-y-1.5">
                      <h3 className="text-xl font-extrabold text-[#242A25] group-hover:text-[#244C3A] transition-colors leading-snug">
                        {recipe.title}
                      </h3>
                      <p className="text-xs text-[#66756A] line-clamp-2 leading-relaxed">
                        {recipe.description}
                      </p>
                    </div>

                    {/* Metadata Stats Row (Prep, Cook, Difficulty) */}
                    <div className="flex items-center gap-3 pt-1 text-xs text-[#66756A] border-y border-[#F0F2EB] py-2.5">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#A8BDA5]" />
                        <span>Prep: {recipe.prepTimeMinutes || 10}m</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#244C3A]" />
                        <span>Cook: {recipe.cookTimeMinutes || 15}m</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <span className="font-semibold text-[#244C3A]">{recipe.difficulty}</span>
                    </div>

                    {/* Match Explanation */}
                    {recipe.explanation && (
                      <div className="p-2.5 rounded-xl bg-[#F8F7F1] border border-[#E7E9E1] text-[11px] text-[#244C3A] font-medium flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{recipe.explanation}</span>
                      </div>
                    )}

                    {/* Ingredients Preview */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#66756A]">
                        <span>Ingredients used:</span>
                        <span className="text-[#244C3A] font-bold">
                          {availableCount} of {totalCount}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recipe.ingredients.slice(0, 5).map((ing, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border flex items-center gap-1 ${
                              ing.available
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {ing.available && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                            {ing.name}
                          </span>
                        ))}
                        {recipe.ingredients.length > 5 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] text-gray-500 bg-[#F8F7F1] border border-[#E7E9E1] font-semibold">
                            +{recipe.ingredients.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-6 pb-5 pt-3 border-t border-[#E7E9E1] bg-[#FCFBF8] flex items-center justify-between text-xs">
                    <span className="text-[#66756A] font-medium">
                      {recipe.servings} servings
                    </span>
                    <div className="flex items-center gap-1 font-bold text-[#244C3A] group-hover:translate-x-0.5 transition-transform">
                      <span>View Recipe & Cook</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
