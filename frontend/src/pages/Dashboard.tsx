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
import { getIngredientImage } from '../utils/ingredients';
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
              const imgUrl = getIngredientImage(item.name, item.category);
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/discover?search=${encodeURIComponent(item.name)}`)}
                  className="group cursor-pointer bg-white rounded-2xl p-4 shadow-sm border border-[#E7E9E1] hover:shadow-md hover:border-[#A8BDA5] transition-all flex items-center gap-4"
                >
                  <img
                    src={imgUrl}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover border border-[#E7E9E1] group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
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
              <div key={n} className="bg-white rounded-2xl h-80 animate-pulse border border-[#E7E9E1]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.slice(0, 3).map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => navigate(`/recipe/${recipe.id}`)}
                className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm border border-[#E7E9E1] hover:shadow-xl hover:border-[#A8BDA5] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Recipe Image with Match Badge */}
                  <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        const fallbacks = [
                          'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
                          'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
                          'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
                          'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80',
                          'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80',
                          'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
                          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
                          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80'
                        ];
                        let h = 0;
                        for (let i = 0; i < recipe.title.length; i++) h += recipe.title.charCodeAt(i);
                        (e.currentTarget as HTMLImageElement).src = fallbacks[h % fallbacks.length];
                      }}
                    />
                    <div className="absolute top-3 right-3">
                      <div className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1 ${
                        (recipe.matchScore || 0) >= 80 
                          ? 'bg-[#244C3A] text-[#D9E9A5]' 
                          : 'bg-white/95 text-[#242A25]'
                      }`}>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{recipe.matchScore}% Match</span>
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-black/60 text-white backdrop-blur-sm">
                        {recipe.cuisine}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-black/60 text-white backdrop-blur-sm">
                        {recipe.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Recipe Details */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-xl font-bold text-[#242A25] group-hover:text-[#244C3A] transition-colors leading-snug">
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
                <div className="px-5 pb-5 pt-2 border-t border-[#E7E9E1] flex items-center justify-between text-xs text-[#66756A]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#A8BDA5]" />
                    <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes} mins</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-[#244C3A]">
                    <span>View Recipe</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
