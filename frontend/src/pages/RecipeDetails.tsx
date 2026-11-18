import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Clock, 
  ChefHat, 
  Users, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  ArrowLeft, 
  Bookmark, 
  Play, 
  Undo2
} from 'lucide-react';
import { fetchRecipeById } from '../services/api';
import { getPantry, getSavedRecipes, toggleSaveRecipe, type PantryItem } from '../utils/pantry';
import { calculateRecipeMatch } from '../utils/recipeScorer';
import type { Recipe, RecipeIngredient, RecipeSubstitution } from '../types';

export default function RecipeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [baseServings, setBaseServings] = useState<number>(2);
  const [currentServings, setCurrentServings] = useState<number>(2);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active substitutions applied: Map of originalName -> substitute
  const [appliedSubstitutions, setAppliedSubstitutions] = useState<Record<string, RecipeSubstitution>>({});

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const curPantry = getPantry();
        setPantry(curPantry);
        const data = await fetchRecipeById(id);
        setRecipe(data);
        setBaseServings(data.servings || 2);
        setCurrentServings(data.servings || 2);
        setIsSaved(getSavedRecipes().includes(id));
      } catch (err: any) {
        console.error('Failed to load recipe details:', err);
        setError(err.response?.data?.error || 'Recipe not found or failed to load.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function handleServingChange(newServings: number) {
    if (newServings < 1 || newServings > 20) return;
    setCurrentServings(newServings);
  }

  function handleToggleSave() {
    if (!recipe) return;
    const nextSaved = toggleSaveRecipe(recipe.id);
    setIsSaved(nextSaved);
  }

  function applySubstitution(sub: RecipeSubstitution) {
    setAppliedSubstitutions(prev => ({
      ...prev,
      [sub.original]: sub
    }));
  }

  function undoSubstitution(originalName: string) {
    setAppliedSubstitutions(prev => {
      const copy = { ...prev };
      delete copy[originalName];
      return copy;
    });
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-[#244C3A] mx-auto" />
        <p className="text-sm font-semibold text-[#66756A]">Loading recipe intelligence...</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center bg-white rounded-3xl border border-rose-200 shadow-sm space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-[#242A25]">Unable to Load Recipe</h2>
        <p className="text-xs text-[#66756A]">{error || 'Recipe was not found.'}</p>
        <Link
          to="/discover"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#244C3A] text-white text-xs font-bold hover:bg-[#1b3a2c]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Recipes
        </Link>
      </div>
    );
  }

  // Calculate scaled ingredient quantities based on servings
  const scaleRatio = currentServings / (baseServings || 2);

  // Compute effective ingredients considering applied substitutions
  const effectiveIngredients: RecipeIngredient[] = recipe.ingredients.map(ing => {
    const sub = appliedSubstitutions[ing.name];
    if (sub) {
      // Ingredient replaced
      const scaledQty = Number((ing.quantity * scaleRatio).toFixed(1));
      return {
        ...ing,
        name: sub.substitute,
        notes: `Substituted for ${sub.original} (${sub.notes})`,
        quantity: scaledQty,
      };
    }
    return {
      ...ing,
      quantity: Number((ing.quantity * scaleRatio).toFixed(1)),
    };
  });

  // Recalculate deterministic match score based on current effective ingredients & pantry
  const dynamicRecipe: Recipe = {
    ...recipe,
    ingredients: effectiveIngredients
  };
  const matchResult = calculateRecipeMatch(dynamicRecipe, pantry);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Back button and quick actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#66756A] hover:text-[#244C3A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Recipes
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleSave}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              isSaved
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'bg-white text-[#242A25] border border-[#E7E9E1] hover:bg-gray-50'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-rose-600' : ''}`} />
            {isSaved ? 'Saved in Cookbox' : 'Save Recipe'}
          </button>

          <Link
            to={`/cook/${recipe.id}`}
            className="px-5 py-2 rounded-xl bg-[#244C3A] hover:bg-[#1b3a2c] text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 text-[#D9E9A5] fill-current" />
            Start Cooking Mode
          </Link>
        </div>
      </div>

      {/* Hero Dish Section (Editorial Image-Free Banner) */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#244C3A] via-[#2d5c47] to-[#1c3d2f] text-white p-8 sm:p-10 border border-[#1e3f30] shadow-xl">
        <div className="space-y-4 max-w-3xl">
          {/* Floating Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D9E9A5] text-[#244C3A] shadow-sm">
              {recipe.cuisine}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
              {recipe.difficulty}
            </span>
            <div className={`px-3.5 py-1 rounded-full text-xs font-extrabold shadow-sm flex items-center gap-1.5 ${
              matchResult.matchPercentage >= 80 
                ? 'bg-[#D9E9A5]/30 text-[#D9E9A5] border border-[#D9E9A5]/40' 
                : 'bg-white/20 text-white'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{matchResult.matchPercentage}% Pantry Match</span>
            </div>
          </div>

          {/* Title & Tagline in Hero */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              {recipe.title}
            </h1>
            <p className="text-sm text-white/90 max-w-2xl font-light leading-relaxed">
              {recipe.description}
            </p>
          </div>
        </div>

        {/* Recipe Meta Strip */}
        <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#A8BDA5] block mb-1">Prep Time</span>
            <div className="text-base font-extrabold text-white flex items-center justify-center gap-1">
              <Clock className="w-4 h-4 text-[#D9E9A5]" />
              {recipe.prepTimeMinutes} mins
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#A8BDA5] block mb-1">Cook Time</span>
            <div className="text-base font-extrabold text-white flex items-center justify-center gap-1">
              <Clock className="w-4 h-4 text-[#D9E9A5]" />
              {recipe.cookTimeMinutes} mins
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#A8BDA5] block mb-1">Total Time</span>
            <div className="text-base font-extrabold text-white flex items-center justify-center gap-1">
              <Clock className="w-4 h-4 text-[#D9E9A5]" />
              {recipe.prepTimeMinutes + recipe.cookTimeMinutes} mins
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#A8BDA5] block mb-1">Servings</span>
            <div className="text-base font-extrabold text-white flex items-center justify-center gap-1">
              <Users className="w-4 h-4 text-[#D9E9A5]" />
              {currentServings} people
            </div>
          </div>
        </div>
      </div>

      {/* Match Explanation Banner */}
      {matchResult.explanation && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <strong className="block font-bold mb-0.5">Kitchen Intelligence Match Insight:</strong>
            <span>{matchResult.explanation}</span>
          </div>
        </div>
      )}

      {/* Interactive Serving Adjuster & Ingredients Checklist */}
      <section className="bg-white rounded-3xl p-6 border border-[#E7E9E1] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E9E1]">
          <div>
            <h2 className="text-xl font-bold text-[#242A25]">Ingredients</h2>
            <p className="text-xs text-[#66756A] mt-0.5">
              Quantities scale dynamically with serving size adjustments.
            </p>
          </div>

          {/* Dynamic Serving Size Selector */}
          <div className="flex items-center gap-3 bg-[#F8F7F1] p-1.5 rounded-2xl border border-[#E7E9E1]">
            <span className="text-xs font-bold text-[#66756A] pl-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#244C3A]" />
              Servings:
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleServingChange(currentServings - 1)}
                disabled={currentServings <= 1}
                className="w-7 h-7 rounded-xl bg-white border border-[#E7E9E1] font-bold text-xs hover:bg-gray-100 disabled:opacity-40"
              >
                -
              </button>
              <span className="w-8 text-center text-xs font-extrabold text-[#242A25]">
                {currentServings}
              </span>
              <button
                onClick={() => handleServingChange(currentServings + 1)}
                className="w-7 h-7 rounded-xl bg-white border border-[#E7E9E1] font-bold text-xs hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Applied Substitutions Notice */}
        {Object.keys(appliedSubstitutions).length > 0 && (
          <div className="p-3.5 rounded-2xl bg-[#D9E9A5]/30 border border-[#D9E9A5] text-xs text-[#244C3A] flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="w-4 h-4 text-[#244C3A]" />
              <span>
                {Object.keys(appliedSubstitutions).length} active substitution applied: {Object.entries(appliedSubstitutions).map(([orig, sub]) => `${sub.substitute} for ${orig}`).join(', ')}
              </span>
            </div>
            <button
              onClick={() => setAppliedSubstitutions({})}
              className="text-xs font-bold text-[#244C3A] underline flex items-center gap-1 hover:opacity-80"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Reset All
            </button>
          </div>
        )}

        {/* Ingredient Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {effectiveIngredients.map((ing, idx) => {
            const isAvail = matchResult.availableIngredients.some(
              a => a.toLowerCase() === ing.name.toLowerCase()
            );
            const sub = recipe.substitutions?.find(s => s.original.toLowerCase() === ing.name.toLowerCase());
            const isSubstituted = Boolean(appliedSubstitutions[ing.name]);

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isAvail
                    ? 'bg-white border-[#E7E9E1] hover:border-emerald-300'
                    : 'bg-amber-50/40 border-amber-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#F8F7F1] border border-[#E7E9E1] flex items-center justify-center shrink-0 text-[#244C3A]">
                    <ChefHat className="w-5 h-5 text-[#244C3A]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-[#242A25] truncate">
                        {ing.name}
                      </span>
                      {isAvail ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          In Pantry
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Missing
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#66756A] block">
                      <strong>{ing.quantity} {ing.unit}</strong> {ing.notes ? `• ${ing.notes}` : ''}
                    </span>
                  </div>
                </div>

                {/* Substitution Action */}
                <div>
                  {isSubstituted ? (
                    <button
                      onClick={() => undoSubstitution(ing.name)}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold flex items-center gap-1"
                      title="Undo substitution"
                    >
                      <Undo2 className="w-3 h-3" />
                      Undo
                    </button>
                  ) : sub ? (
                    <button
                      onClick={() => applySubstitution(sub)}
                      className="px-2.5 py-1 rounded-lg bg-[#D9E9A5] hover:bg-[#cbe090] text-[#244C3A] text-[10px] font-bold shadow-sm flex items-center gap-1 transition-all"
                      title={`Substitute with ${sub.substitute}: ${sub.notes}`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Use {sub.substitute}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Substitution Guide Callout */}
        {recipe.substitutions && recipe.substitutions.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#F8F7F1] border border-[#E7E9E1] space-y-2">
            <h4 className="text-xs font-bold text-[#244C3A] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#244C3A]" />
              Smart Chef Substitutions Guide:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {recipe.substitutions.map((sub, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white border border-[#E7E9E1]">
                  <strong className="text-[#242A25]">{sub.original}</strong> → <span className="text-emerald-700 font-bold">{sub.substitute}</span> ({sub.ratio})
                  <p className="text-[11px] text-[#66756A] mt-0.5">{sub.notes}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Cooking Steps Preview Section */}
      <section className="bg-white rounded-3xl p-6 border border-[#E7E9E1] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E9E1]">
          <div>
            <h2 className="text-xl font-bold text-[#242A25]">Cooking Instructions</h2>
            <p className="text-xs text-[#66756A] mt-0.5">
              {recipe.steps.length} sequential chef steps designed for home kitchens.
            </p>
          </div>

          <Link
            to={`/cook/${recipe.id}`}
            className="px-4 py-2 rounded-xl bg-[#244C3A] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#1b3a2c]"
          >
            <Play className="w-3.5 h-3.5 fill-current text-[#D9E9A5]" />
            Launch Interactive Cooking Mode
          </Link>
        </div>

        <ol className="space-y-4">
          {recipe.steps.map((step, idx) => (
            <li
              key={idx}
              className="p-4 rounded-2xl bg-[#F8F7F1] border border-[#E7E9E1] flex items-start gap-4"
            >
              <div className="w-7 h-7 rounded-xl bg-[#244C3A] text-white font-bold text-xs flex items-center justify-center shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm text-[#242A25] leading-relaxed">
                  {step.instruction}
                </p>
                {step.durationMinutes && (
                  <span className="text-[11px] text-[#66756A] font-semibold inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#A8BDA5]" />
                    ~{step.durationMinutes} minutes
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
