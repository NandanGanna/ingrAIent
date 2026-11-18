import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ShoppingBag, 
  Clock, 
  AlertTriangle, 
  Bookmark, 
  ChevronRight, 
  CheckCircle2, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { getPantry, getExpiryStatus, getSavedRecipes, type PantryItem } from '../utils/pantry';
import { fetchAllRecipes } from '../services/api';
import { enrichRecipesWithPantry } from '../utils/recipeScorer';
import type { Recipe } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const currentPantry = getPantry();
        setPantry(currentPantry);
        setSavedCount(getSavedRecipes().length);

        const allRecipes = await fetchAllRecipes();
        const scored = enrichRecipesWithPantry(allRecipes, currentPantry);
        // Sort recipes by match score descending
        scored.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        setRecipes(scored);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter expiring items
  const expiringItems = pantry
    .map(item => ({
      item,
      status: getExpiryStatus(item.expiry)
    }))
    .filter(({ status }) => status && (status.level === 'today' || status.level === 'tomorrow' || status.level === 'soon'))
    .sort((a, b) => (a.status?.daysRemaining || 0) - (b.status?.daysRemaining || 0));

  return (
    <div className="space-y-10">
      {/* Editorial Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#244C3A] via-[#2d5c47] to-[#1c3d2f] text-white p-8 md:p-12 shadow-xl border border-[#1e3f30]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D9E9A5]/20 text-[#D9E9A5] text-xs font-semibold tracking-wide uppercase border border-[#D9E9A5]/30">
              <Sparkles className="w-3.5 h-3.5" />
              Zero-Waste Culinary Intelligence
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Let's make something <span className="text-[#D9E9A5] italic">delicious.</span>
            </h1>

            <p className="text-base md:text-lg text-[#F8F7F1]/90 leading-relaxed font-light">
              Discover amazing chef-quality meals crafted from the ingredients already in your kitchen. Save money, eliminate food waste, and cook with confidence.
            </p>

            <div className="pt-4 flex flex-wrap gap-4 items-center">
              <Link
                to="/discover"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#D9E9A5] text-[#244C3A] font-bold text-base hover:bg-[#cbe090] transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <Sparkles className="w-5 h-5 text-[#244C3A]" />
                Find Recipes
              </Link>

              <Link
                to="/pantry"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base transition-all border border-white/20 active:scale-95"
              >
                <ShoppingBag className="w-5 h-5 text-[#A8BDA5]" />
                Manage Pantry ({pantry.length})
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex w-36 h-36 shrink-0 rounded-3xl bg-[#D9E9A5]/20 p-3 backdrop-blur-sm border border-[#D9E9A5]/30 items-center justify-center shadow-xl">
            <img src="/logo.png" alt="IngrAIent Official Logo" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-[#D9E9A5]/10 blur-3xl pointer-events-none" />
      </section>

      {/* Kitchen Overview Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl shadow-sm border border-[#E7E9E1] hover:border-[#A8BDA5] transition-all">
          <div className="flex items-center justify-between text-[#66756A] mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Ingredients</span>
            <div className="p-2 rounded-lg bg-[#F8F7F1] text-[#244C3A]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#242A25]">{pantry.length}</div>
          <Link to="/pantry" className="text-xs text-[#244C3A] font-medium hover:underline mt-1 inline-flex items-center gap-1">
            View inventory <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-5 bg-white rounded-2xl shadow-sm border border-[#E7E9E1] hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-[#66756A] mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Expiring Soon</span>
            <div className={`p-2 rounded-lg ${expiringItems.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#242A25]">{expiringItems.length}</div>
          <span className="text-xs text-[#66756A] mt-1 block">
            {expiringItems.length > 0 ? 'Priority to cook' : 'All fresh'}
          </span>
        </div>

        <div className="p-5 bg-white rounded-2xl shadow-sm border border-[#E7E9E1] hover:border-[#A8BDA5] transition-all">
          <div className="flex items-center justify-between text-[#66756A] mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Ready Recipes</span>
            <div className="p-2 rounded-lg bg-[#F8F7F1] text-[#244C3A]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#242A25]">
            {recipes.filter(r => (r.matchScore || 0) >= 70).length}
          </div>
          <Link to="/discover" className="text-xs text-[#244C3A] font-medium hover:underline mt-1 inline-flex items-center gap-1">
            High match recipes <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-5 bg-white rounded-2xl shadow-sm border border-[#E7E9E1] hover:border-[#A8BDA5] transition-all">
          <div className="flex items-center justify-between text-[#66756A] mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Saved Recipes</span>
            <div className="p-2 rounded-lg bg-[#F8F7F1] text-[#244C3A]">
              <Bookmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#242A25]">{savedCount}</div>
          <Link to="/saved" className="text-xs text-[#244C3A] font-medium hover:underline mt-1 inline-flex items-center gap-1">
            View cookbook <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </section>

      {/* Expiring Soon Section */}
      {expiringItems.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#242A25]">Expiring Soon in Your Kitchen</h2>
                <p className="text-sm text-[#66756A]">
                  Prioritize these items to prevent spoilage and cook fresh meals.
                </p>
              </div>
            </div>
            <Link
              to="/discover?filter=expiring"
              className="text-sm font-semibold text-[#244C3A] hover:text-[#1c3d2f] inline-flex items-center gap-1.5"
            >
              Find recipes using these <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {expiringItems.map(({ item, status }) => {
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/discover?search=${encodeURIComponent(item.name)}`)}
                  className="group cursor-pointer bg-white rounded-2xl p-4 shadow-sm border border-[#E7E9E1] hover:shadow-md hover:border-[#A8BDA5] transition-all flex items-center gap-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#F8F7F1] border border-[#E7E9E1] flex items-center justify-center shrink-0 text-[#244C3A] group-hover:scale-105 transition-transform">
                    <Clock className="w-6 h-6 text-[#244C3A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${status?.badgeColor}`}>
                        {status?.label}
                      </span>
                    </div>
                    <h3 className="font-bold text-[#242A25] truncate">{item.name}</h3>
                    <p className="text-xs text-[#66756A] font-medium">
                      Qty: {item.quantity} {item.unit}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recommended Recipes Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#242A25]">Recommended for You</h2>
            <p className="text-sm text-[#66756A]">
              Matched deterministically against your current pantry ingredients.
            </p>
          </div>
          <Link
            to="/discover"
            className="text-sm font-semibold text-[#244C3A] hover:text-[#1c3d2f] inline-flex items-center gap-1.5"
          >
            Explore all recipes <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-6 border border-[#E7E9E1] animate-pulse space-y-4 shadow-sm min-h-[280px]">
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-gray-200 rounded-full w-24" />
                  <div className="h-6 bg-gray-100 rounded-lg w-16" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-6 bg-gray-200 rounded-xl w-3/4" />
                  <div className="h-4 bg-gray-100 rounded-lg w-full" />
                </div>
                <div className="h-8 bg-gray-100 rounded-xl w-full" />
                <div className="h-10 bg-gray-100 rounded-xl w-full mt-4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.slice(0, 3).map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => navigate(`/recipe/${recipe.id}`)}
                className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm border border-[#E7E9E1] hover:shadow-xl hover:border-[#244C3A] transition-all flex flex-col justify-between"
              >
                <div className="p-6 space-y-4">
                  {/* Card Header: Match Badge & Cuisine */}
                  <div className="flex items-center justify-between gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5 ${
                      (recipe.matchScore || 0) >= 80 
                        ? 'bg-[#244C3A] text-[#D9E9A5]' 
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{recipe.matchScore || 85}% Match</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F8F7F1] text-[#66756A] border border-[#E7E9E1]">
                        {recipe.cuisine}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F8F7F1] text-[#66756A] border border-[#E7E9E1]">
                        {recipe.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Recipe Details */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-extrabold text-[#242A25] group-hover:text-[#244C3A] transition-colors leading-snug">
                      {recipe.title}
                    </h3>
                    <p className="text-xs text-[#66756A] line-clamp-2 leading-relaxed">
                      {recipe.description}
                    </p>

                    {/* Match explanation */}
                    {recipe.explanation && (
                      <div className="p-2.5 rounded-xl bg-[#F8F7F1] border border-[#E7E9E1] text-[11px] text-[#244C3A] font-medium flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{recipe.explanation}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer with Meta */}
                <div className="px-6 pb-5 pt-3 border-t border-[#E7E9E1] bg-[#FCFBF8] flex items-center justify-between text-xs text-[#66756A]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#A8BDA5]" />
                    <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes} mins</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-[#244C3A] group-hover:translate-x-0.5 transition-transform">
                    <span>View Recipe</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
