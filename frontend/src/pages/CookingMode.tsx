import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  X, 
  Check, 
  Volume2
} from 'lucide-react';
import { fetchRecipeById } from '../services/api';
import LeftoverModal from '../components/cooking/LeftoverModal';
import type { Recipe } from '../types';

export default function CookingMode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Ingredient completion checklist state
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});

  // Timer State for current step
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerAlert, setTimerAlert] = useState<boolean>(false);
  const timerIntervalRef = useRef<any>(null);

  // Leftover modal on finishing
  const [showLeftoverModal, setShowLeftoverModal] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const data = await fetchRecipeById(id);
        setRecipe(data);
        if (data.steps && data.steps.length > 0 && data.steps[0].durationMinutes) {
          setTimerSeconds(data.steps[0].durationMinutes * 60);
        }
      } catch (err: any) {
        setError('Recipe could not be loaded.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Sync step timer when changing steps
  useEffect(() => {
    if (!recipe) return;
    const step = recipe.steps[currentStepIdx];
    setIsTimerRunning(false);
    setTimerAlert(false);
    if (step && step.durationMinutes) {
      setTimerSeconds(step.durationMinutes * 60);
    } else {
      setTimerSeconds(0);
    }
  }, [currentStepIdx, recipe]);

  // Timer countdown hook
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setTimerAlert(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isTimerRunning, timerSeconds]);

  // Keyboard navigation support (ArrowLeft / ArrowRight)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!recipe) return;
      if (e.key === 'ArrowRight' && currentStepIdx < recipe.steps.length - 1) {
        setCurrentStepIdx(c => c + 1);
      } else if (e.key === 'ArrowLeft' && currentStepIdx > 0) {
        setCurrentStepIdx(c => c - 1);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recipe, currentStepIdx]);

  function toggleCheckIngredient(name: string) {
    setCheckedIngredients(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  }

  function formatTime(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#244C3A] text-white flex items-center justify-center">
        <p className="text-base font-bold animate-pulse">Entering IngrAIent Cooking Mode...</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-[#F8F7F1] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl text-center space-y-4 max-w-md shadow-md border border-[#E7E9E1]">
          <h2 className="text-xl font-bold text-[#242A25]">Recipe Not Found</h2>
          <button
            onClick={() => navigate('/discover')}
            className="px-5 py-2.5 bg-[#244C3A] text-white rounded-xl text-xs font-bold"
          >
            Back to Recipes
          </button>
        </div>
      </div>
    );
  }

  const steps = recipe.steps;
  const currentStep = steps[currentStepIdx];
  const progressPercent = Math.round(((currentStepIdx + 1) / steps.length) * 100);

  return (
    <div className="fixed inset-0 bg-[#F8F7F1] z-50 flex flex-col justify-between overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="bg-[#244C3A] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D9E9A5] p-1 flex items-center justify-center overflow-hidden shadow-sm">
            <img src="/logo.png" alt="IngrAIent Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-tight truncate max-w-xs sm:max-w-md">
              {recipe.title}
            </h1>
            <span className="text-[11px] text-[#A8BDA5] font-medium block">
              Step {currentStepIdx + 1} of {steps.length} • {recipe.cuisine} • {recipe.servings} Servings
            </span>
          </div>
        </div>

        {/* Progress and Close */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-[#D9E9A5]">
            <span>{progressPercent}% Complete</span>
          </div>
          <button
            onClick={() => navigate(`/recipe/${recipe.id}`)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Exit Cooking Mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-[#1e3f30] h-1.5">
        <div
          className="bg-[#D9E9A5] h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Instruction Body */}
      <main className="flex-1 overflow-y-auto max-w-4xl w-full mx-auto p-6 md:p-10 flex flex-col justify-center space-y-8">
        <div className="space-y-4 text-center">
          <span className="inline-block px-3.5 py-1 rounded-full bg-[#244C3A]/10 text-[#244C3A] text-xs font-extrabold uppercase tracking-widest">
            Instruction #{currentStepIdx + 1}
          </span>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#242A25] leading-relaxed max-w-3xl mx-auto">
            {currentStep.instruction}
          </h2>
        </div>

        {/* Step Timer Component (if duration exists or generic timer) */}
        {currentStep.durationMinutes ? (
          <div className={`max-w-md mx-auto w-full p-5 rounded-3xl border transition-all ${
            timerAlert 
              ? 'bg-rose-50 border-rose-300 animate-pulse' 
              : 'bg-white border-[#E7E9E1] shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#66756A] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#244C3A]" />
                Step Timer
              </span>
              {timerAlert && (
                <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                  <Volume2 className="w-4 h-4" />
                  Timer Finished!
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-4xl font-mono font-extrabold text-[#244C3A]">
                {formatTime(timerSeconds)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ${
                    isTimerRunning
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-[#244C3A] text-white hover:bg-[#1b3a2c]'
                  }`}
                >
                  {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isTimerRunning ? 'Pause' : 'Start'}
                </button>

                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerAlert(false);
                    setTimerSeconds((currentStep.durationMinutes || 1) * 60);
                  }}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setTimerSeconds(t => t + 60)}
                  className="px-2.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
                  title="Add 1 minute"
                >
                  +1m
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Ingredients Quick Checklist Drawer */}
        <div className="max-w-xl mx-auto w-full bg-white rounded-2xl p-4 border border-[#E7E9E1] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#66756A] uppercase tracking-wider pb-2 border-b border-[#E7E9E1]">
            <span>Ingredients Checklist ({Object.values(checkedIngredients).filter(Boolean).length}/{recipe.ingredients.length})</span>
            <span className="text-[11px] font-normal text-gray-400">Click to check off</span>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
            {recipe.ingredients.map((ing, idx) => {
              const isChecked = Boolean(checkedIngredients[ing.name]);
              return (
                <div
                  key={idx}
                  onClick={() => toggleCheckIngredient(ing.name)}
                  className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center gap-2 transition-all ${
                    isChecked
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 opacity-60 line-through'
                      : 'bg-[#F8F7F1] border-[#E7E9E1] text-[#242A25] hover:border-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                    isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-400'
                  }`}>
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="font-semibold truncate">{ing.quantity} {ing.unit} {ing.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Bottom Sticky Action Controls */}
      <footer className="bg-white border-t border-[#E7E9E1] p-4 sm:p-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => setCurrentStepIdx(i => Math.max(0, i - 1))}
            disabled={currentStepIdx === 0}
            className="px-5 py-3 rounded-2xl border border-[#E7E9E1] bg-[#F8F7F1] text-[#242A25] font-bold text-sm flex items-center gap-2 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous Step</span>
          </button>

          <span className="text-xs font-extrabold text-[#66756A]">
            Step {currentStepIdx + 1} of {steps.length}
          </span>

          {currentStepIdx < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStepIdx(i => i + 1)}
              className="px-6 py-3 rounded-2xl bg-[#244C3A] hover:bg-[#1b3a2c] text-white font-bold text-sm flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4 text-[#D9E9A5]" />
            </button>
          ) : (
            <button
              onClick={() => setShowLeftoverModal(true)}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-all animate-bounce"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finish Cooking & Track Leftovers</span>
            </button>
          )}
        </div>
      </footer>

      {/* Leftover tracking modal on finish */}
      {showLeftoverModal && (
        <LeftoverModal
          recipe={recipe}
          servingsCooked={recipe.servings || 2}
          onClose={() => {
            setShowLeftoverModal(false);
            navigate('/discover');
          }}
        />
      )}
    </div>
  );
}
