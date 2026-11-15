import { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Clock, 
  ChefHat, 
  Sparkles, 
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  getPantry, 
  getCookingHistory, 
  getExpiryStatus, 
  type PantryItem, 
  type CookingRecord 
} from '../utils/pantry';
import { CATEGORIES } from '../utils/ingredients';

export default function Insights() {
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [history, setHistory] = useState<CookingRecord[]>([]);

  useEffect(() => {
    setPantry(getPantry());
    setHistory(getCookingHistory());
  }, []);

  // Compute metrics from actual application state
  const totalPantryCount = pantry.length;

  const expiringItems = pantry.filter(item => {
    const s = getExpiryStatus(item.expiry);
    return s && (s.level === 'today' || s.level === 'tomorrow' || s.level === 'soon');
  });

  const totalRecipesCooked = history.length;

  const totalIngredientsUsedCount = history.reduce((acc, h) => {
    return acc + (h.ingredientsUsed?.length || 0);
  }, 0);

  // Group pantry by category
  const categoryCounts = CATEGORIES.map(cat => {
    const count = pantry.filter(i => i.category === cat).length;
    const percentage = totalPantryCount > 0 ? Math.round((count / totalPantryCount) * 100) : 0;
    return { category: cat, count, percentage };
  }).filter(c => c.count > 0);

  // Estimated food waste reduction: sum of ingredients used from pantry + items preserved
  const estimatedItemsSavedFromWastage = totalIngredientsUsedCount + (totalRecipesCooked * 3);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#242A25] tracking-tight">
          Kitchen Analytics & Insights
        </h1>
        <p className="text-sm text-[#66756A] mt-1">
          Real-time metrics calculated directly from your active pantry inventory and recorded cooking activity.
        </p>
      </div>

      {/* Primary KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-[#E7E9E1] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#66756A]">
            <span className="text-xs font-bold uppercase tracking-wider">Active Inventory</span>
            <div className="p-2 rounded-xl bg-[#F8F7F1] text-[#244C3A]">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#242A25]">{totalPantryCount}</div>
          <span className="text-xs text-[#66756A] block">
            Items currently in pantry
          </span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-[#E7E9E1] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#66756A]">
            <span className="text-xs font-bold uppercase tracking-wider">Expiring ≤ 3 Days</span>
            <div className={`p-2 rounded-xl ${expiringItems.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#242A25]">{expiringItems.length}</div>
          <span className="text-xs text-[#66756A] block">
            {expiringItems.length > 0 ? 'Requires immediate cooking' : 'Zero urgent expirations'}
          </span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-[#E7E9E1] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#66756A]">
            <span className="text-xs font-bold uppercase tracking-wider">Recipes Cooked</span>
            <div className="p-2 rounded-xl bg-[#F8F7F1] text-[#244C3A]">
              <ChefHat className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#242A25]">{totalRecipesCooked}</div>
          <span className="text-xs text-[#66756A] block">
            Completed cooking sessions
          </span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-[#E7E9E1] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#66756A]">
            <span className="text-xs font-bold uppercase tracking-wider">Waste Saved</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-700">
            {estimatedItemsSavedFromWastage}
          </div>
          <span className="text-xs text-[#66756A] block">
            Ingredients rescued via IngrAIent
          </span>
        </div>
      </div>

      {/* Two Column Layout: Pantry Category Breakdown + Cooking Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <div className="p-6 bg-white rounded-3xl border border-[#E7E9E1] shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#E7E9E1] pb-3">
            <div>
              <h3 className="text-lg font-bold text-[#242A25]">Pantry Composition</h3>
              <p className="text-xs text-[#66756A]">Distribution across food groups</p>
            </div>
            <span className="text-xs font-bold text-[#244C3A]">
              {categoryCounts.length} active categories
            </span>
          </div>

          <div className="space-y-4">
            {categoryCounts.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#242A25]">{cat.category}</span>
                  <span className="text-[#66756A]">{cat.count} items ({cat.percentage}%)</span>
                </div>
                <div className="w-full bg-[#F8F7F1] h-2.5 rounded-full overflow-hidden border border-[#E7E9E1]">
                  <div
                    className="bg-[#244C3A] h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Link
              to="/pantry"
              className="text-xs font-bold text-[#244C3A] hover:underline inline-flex items-center gap-1"
            >
              Manage entire inventory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Cooking History Feed */}
        <div className="p-6 bg-white rounded-3xl border border-[#E7E9E1] shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#E7E9E1] pb-3">
            <div>
              <h3 className="text-lg font-bold text-[#242A25]">Recent Cooking Activity</h3>
              <p className="text-xs text-[#66756A]">Logged from interactive cooking sessions</p>
            </div>
            <span className="text-xs font-bold text-[#244C3A]">
              {history.length} logged
            </span>
          </div>

          {history.length === 0 ? (
            <div className="p-8 text-center bg-[#F8F7F1] rounded-2xl space-y-2">
              <ChefHat className="w-8 h-8 text-[#A8BDA5] mx-auto" />
              <p className="text-xs text-[#66756A] font-semibold">
                No cooking sessions recorded yet.
              </p>
              <p className="text-[11px] text-gray-400">
                Pick a recipe, hit "Start Cooking Mode", and complete the steps to log your ingredients used!
              </p>
              <Link
                to="/discover"
                className="inline-block px-4 py-2 bg-[#244C3A] text-white rounded-xl text-xs font-bold mt-2"
              >
                Cook a Meal
              </Link>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {history.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-2xl bg-[#F8F7F1] border border-[#E7E9E1] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-sm font-bold text-[#242A25]">
                      {rec.recipeTitle}
                    </strong>
                    <span className="text-[10px] text-[#66756A]">
                      {new Date(rec.cookedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-[#66756A]">
                    Cooked for {rec.servingsCooked} servings • Deducted {rec.ingredientsUsed?.length || 0} ingredients
                  </p>

                  {rec.ingredientsUsed && rec.ingredientsUsed.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {rec.ingredientsUsed.map((u, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-[#E7E9E1] text-[10px] text-[#242A25] font-medium">
                          {u.quantity} {u.unit} {u.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
