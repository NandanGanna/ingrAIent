import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Bookmark, 
  Search, 
  Clock, 
  Trash2, 
  Sparkles, 
  ChevronRight
} from 'lucide-react';
import { getSavedRecipes, toggleSaveRecipe, getPantry } from '../utils/pantry';
import { fetchAllRecipes } from '../services/api';
import { enrichRecipesWithPantry } from '../utils/recipeScorer';
import type { Recipe } from '../types';

export default function SavedRecipes() {
  const navigate = useNavigate();
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const savedIds = getSavedRecipes();
        const pantry = getPantry();
        const allRecipes = await fetchAllRecipes();

        const filtered = allRecipes.filter(r => savedIds.includes(r.id));
        const scored = enrichRecipesWithPantry(filtered, pantry);
        scored.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        setSavedRecipes(scored);
      } catch (err) {
        console.error('Error loading saved recipes:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleRemove(e: React.MouseEvent, recipeId: string) {
    e.stopPropagation();
    toggleSaveRecipe(recipeId);
    setSavedRecipes(prev => prev.filter(r => r.id !== recipeId));
  }

  const cuisines = Array.from(new Set(savedRecipes.map(r => r.cuisine)));

  const filtered = savedRecipes.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedCuisine !== 'All' && r.cuisine !== selectedCuisine) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#242A25] tracking-tight">
            Saved Recipes & Cookbox
          </h1>
          <p className="text-sm text-[#66756A] mt-1">
            Your personal collection of favorite recipes with real-time pantry match status.
          </p>
        </div>

        <Link
          to="/discover"
          className="px-4 py-2.5 rounded-xl bg-[#244C3A] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#1b3a2c] self-start md:self-auto shadow-md"
        >
          <Sparkles className="w-4 h-4 text-[#D9E9A5]" />
          Discover New Recipes
        </Link>
      </div>

      {/* Filter and Search Bar */}
      {savedRecipes.length > 0 && (
        <div className="p-4 bg-white rounded-2xl border border-[#E7E9E1] shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#66756A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search saved recipes by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-[#E7E9E1] focus:outline-none focus:border-[#244C3A]"
            />
          </div>

          {cuisines.length > 1 && (
            <select
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              className="text-xs p-2 rounded-xl border border-[#E7E9E1] bg-white text-[#242A25] font-semibold focus:outline-none w-full sm:w-auto"
            >
              <option value="All">All Cuisines</option>
              {cuisines.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Recipes Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map(n => (
            <div key={n} className="bg-white rounded-3xl p-6 border border-[#E7E9E1] animate-pulse space-y-4 shadow-sm min-h-[260px]">
              <div className="flex justify-between items-center">
                <div className="h-6 bg-gray-200 rounded-full w-24" />
                <div className="h-8 bg-gray-100 rounded-xl w-8" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-6 bg-gray-200 rounded-xl w-3/4" />
                <div className="h-4 bg-gray-100 rounded-lg w-full" />
              </div>
              <div className="h-10 bg-gray-100 rounded-xl w-full mt-4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-[#E7E9E1] space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F8F7F1] flex items-center justify-center mx-auto text-[#A8BDA5]">
            <Bookmark className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#242A25]">No saved recipes found</h3>
            <p className="text-sm text-[#66756A] max-w-sm mx-auto mt-1">
              {searchQuery || selectedCuisine !== 'All'
                ? 'Try clearing your search query or filter.'
                : 'Click the bookmark icon on any recipe in Discover or Dashboard to save it to your cookbox.'}
            </p>
          </div>
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#244C3A] text-white text-xs font-bold hover:bg-[#1b3a2c]"
          >
            <Sparkles className="w-4 h-4 text-[#D9E9A5]" />
            Browse Recipes
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(recipe => (
            <div
              key={recipe.id}
              onClick={() => navigate(`/recipe/${recipe.id}`)}
              className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm border border-[#E7E9E1] hover:shadow-xl hover:border-[#244C3A] transition-all flex flex-col justify-between"
            >
              <div className="p-6 space-y-4">
                {/* Header: Match, Cuisine, Trash */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#244C3A] text-[#D9E9A5] shadow-sm flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {recipe.matchScore || 85}% Match
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F8F7F1] text-[#66756A] border border-[#E7E9E1]">
                      {recipe.cuisine}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleRemove(e, recipe.id)}
                    className="p-2 rounded-xl bg-[#F8F7F1] text-rose-600 hover:bg-rose-50 border border-[#E7E9E1] hover:border-rose-200 transition-all"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-[#242A25] group-hover:text-[#244C3A] transition-colors leading-snug">
                    {recipe.title}
                  </h3>
                  <p className="text-xs text-[#66756A] line-clamp-2 leading-relaxed">
                    {recipe.description}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-5 pt-3 border-t border-[#E7E9E1] bg-[#FCFBF8] flex items-center justify-between text-xs text-[#66756A]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#A8BDA5]" />
                  <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes} mins</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-[#244C3A] group-hover:translate-x-0.5 transition-transform">
                  <span>Cook Now</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
