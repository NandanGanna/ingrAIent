import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  ShoppingBag, 
  Sparkles, 
  X,
  ChefHat
} from 'lucide-react';
import { getPantry, savePantry, recordCookedRecipe } from '../../utils/pantry';
import { getIngredientImage } from '../../utils/ingredients';
import type { Recipe } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface LeftoverModalProps {
  recipe: Recipe;
  servingsCooked: number;
  onClose: () => void;
}

export default function LeftoverModal({ recipe, servingsCooked, onClose }: LeftoverModalProps) {
  const navigate = useNavigate();
  const currentPantry = getPantry();

  // Scale ratio based on servings cooked vs recipe base servings
  const scaleRatio = servingsCooked / (recipe.servings || 2);

  // Initial calculation of deducted vs remaining quantities
  const [deductions, setDeductions] = useState<Array<{
    ingredientName: string;
    pantryItemId?: string;
    originalPantryQty: number;
    usedQty: number;
    unit: string;
    remainingQty: number;
  }>>(() => {
    return recipe.ingredients.map(ing => {
      const scaledUsed = Number((ing.quantity * scaleRatio).toFixed(1));
      const matchedPantry = currentPantry.find(
        p => p.name.toLowerCase() === ing.name.toLowerCase() ||
             p.name.toLowerCase().includes(ing.name.toLowerCase()) ||
             ing.name.toLowerCase().includes(p.name.toLowerCase())
      );

      const originalQty = matchedPantry ? matchedPantry.quantity : 0;
      // Cap used at original so remaining never goes negative
      const effectiveUsed = Math.min(originalQty, scaledUsed);
      const remaining = Number(Math.max(0, originalQty - effectiveUsed).toFixed(1));

      return {
        ingredientName: ing.name,
        pantryItemId: matchedPantry?.id,
        originalPantryQty: originalQty,
        usedQty: effectiveUsed,
        unit: ing.unit,
        remainingQty: remaining,
      };
    });
  });

  const [confirmed, setConfirmed] = useState(false);

  function handleUsedQtyChange(idx: number, newUsed: number) {
    setDeductions(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const validUsed = Math.max(0, Math.min(item.originalPantryQty, newUsed));
      const rem = Number(Math.max(0, item.originalPantryQty - validUsed).toFixed(1));
      return {
        ...item,
        usedQty: validUsed,
        remainingQty: rem,
      };
    }));
  }

  function handleConfirmPantryUpdate() {
    const updatedPantry = [...currentPantry];

    for (const ded of deductions) {
      if (ded.pantryItemId) {
        const pItem = updatedPantry.find(p => p.id === ded.pantryItemId);
        if (pItem) {
          // Prevent negative quantity strictly
          pItem.quantity = Math.max(0, Number((pItem.quantity - ded.usedQty).toFixed(1)));
        }
      }
    }

    // Filter out items with 0 quantity if desired, or keep them with 0
    const nonNegativePantry = updatedPantry.filter(p => p.quantity > 0);
    savePantry(nonNegativePantry);

    // Record cooking history
    recordCookedRecipe({
      id: uuidv4(),
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      cookedAt: new Date().toISOString(),
      servingsCooked,
      ingredientsUsed: deductions.map(d => ({
        name: d.ingredientName,
        quantity: d.usedQty,
        unit: d.unit
      }))
    });

    setConfirmed(true);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E7E9E1] space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {!confirmed ? (
          <>
            <div className="flex items-center justify-between border-b border-[#E7E9E1] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D9E9A5] flex items-center justify-center text-[#244C3A]">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#242A25]">Cooking Completed! 🎉</h2>
                  <p className="text-xs text-[#66756A]">
                    Review and update remaining pantry ingredients.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-[#F8F7F1] rounded-2xl text-xs text-[#244C3A] space-y-1">
              <strong>Smart Leftover Sync:</strong> IngrAIent calculated how much of your pantry was used for <strong>{servingsCooked} servings</strong> of <em>{recipe.title}</em>. Verify and adjust quantities below before saving.
            </div>

            {/* Deductions table */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {deductions.map((item, idx) => {
                const img = getIngredientImage(item.ingredientName);
                return (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-2xl border border-[#E7E9E1] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={img}
                        alt={item.ingredientName}
                        className="w-10 h-10 rounded-xl object-cover border border-[#E7E9E1] shrink-0"
                      />
                      <div className="truncate">
                        <span className="font-bold text-[#242A25] block truncate">
                          {item.ingredientName}
                        </span>
                        <span className="text-[11px] text-[#66756A]">
                          In Pantry: {item.originalPantryQty} {item.unit}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <label className="text-[10px] text-[#66756A] uppercase font-bold block">Used:</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max={item.originalPantryQty}
                          value={item.usedQty}
                          onChange={(e) => handleUsedQtyChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 rounded-lg border border-[#E7E9E1] text-xs font-bold text-center bg-[#F8F7F1]"
                        />
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="text-[10px] text-[#66756A] uppercase font-bold block">Remaining:</span>
                        <span className={`font-extrabold ${item.remainingQty === 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                          {item.remainingQty} {item.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E7E9E1]">
              <span className="text-[11px] text-[#66756A]">
                Quantities will safely update in your LocalStorage pantry.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[#E7E9E1] text-xs font-semibold text-[#66756A] hover:bg-gray-100"
                >
                  Skip
                </button>
                <button
                  onClick={handleConfirmPantryUpdate}
                  className="px-5 py-2 rounded-xl bg-[#244C3A] text-white text-xs font-bold hover:bg-[#1b3a2c] shadow-md"
                >
                  Confirm & Update Pantry
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-[#242A25]">Pantry Successfully Updated!</h3>
            <p className="text-xs text-[#66756A] max-w-sm mx-auto">
              Your kitchen inventory has been adjusted accurately. Food waste has been recorded and new personalized recipe matches are ready!
            </p>
            <div className="flex justify-center gap-3 pt-3">
              <button
                onClick={() => navigate('/pantry')}
                className="px-4 py-2.5 rounded-xl border border-[#E7E9E1] text-xs font-bold text-[#244C3A] hover:bg-gray-50 flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                View Updated Pantry
              </button>
              <button
                onClick={() => navigate('/discover')}
                className="px-5 py-2.5 rounded-xl bg-[#244C3A] text-white text-xs font-bold hover:bg-[#1b3a2c] flex items-center gap-2 shadow-md"
              >
                <Sparkles className="w-4 h-4 text-[#D9E9A5]" />
                Discover Next Meal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
