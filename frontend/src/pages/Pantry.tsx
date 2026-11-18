import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Calendar, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  FileText,
  ShoppingBag,
  ChefHat
} from 'lucide-react';
import { 
  getPantry, 
  savePantry, 
  resetPantryToDemo, 
  getExpiryStatus, 
  type PantryItem 
} from '../utils/pantry';
import { 
  CATEGORIES, 
  getAllCatalogItems, 
  getIngredientImage, 
  getIngredientCategory 
} from '../utils/ingredients';
import { 
  parseAndValidateIngredients, 
  validateSingleIngredient, 
  type IngredientValidationResult 
} from '../utils/validation';
import { v4 as uuidv4 } from 'uuid';

export default function Pantry() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expiring' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'expiry' | 'category'>('expiry');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

  // Single Add / Edit Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Vegetables');
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formUnit, setFormUnit] = useState('pcs');
  const [formPurchaseDate, setFormPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [formExpiry, setFormExpiry] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Batch Input State
  const [batchInput, setBatchInput] = useState('');
  const [batchValidationResults, setBatchValidationResults] = useState<{
    valid: IngredientValidationResult[];
    invalid: IngredientValidationResult[];
    unrecognized: IngredientValidationResult[];
  } | null>(null);

  // Review Stage Editable Items
  const [reviewItems, setReviewItems] = useState<Array<{
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    expiry: string;
    image: string;
  }>>([]);

  const catalogList = useMemo(() => getAllCatalogItems(), []);

  useEffect(() => {
    setItems(getPantry());
  }, []);

  function handleSavePantry(newItems: PantryItem[]) {
    setItems(newItems);
    savePantry(newItems);
  }

  function handleResetDemo() {
    if (window.confirm('Reset pantry to realistic demo inventory with 12 items?')) {
      const reset = resetPantryToDemo();
      setItems(reset);
    }
  }

  function handleDelete(id: string) {
    const updated = items.filter(i => i.id !== id);
    handleSavePantry(updated);
  }

  function handleQuantityChange(id: string, delta: number) {
    const updated = items.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0.1, Number((item.quantity + delta).toFixed(1)));
        return { ...item, quantity: newQty };
      }
      return item;
    });
    handleSavePantry(updated);
  }

  function openEditModal(item: PantryItem) {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormQuantity(item.quantity);
    setFormUnit(item.unit);
    setFormPurchaseDate(item.purchaseDate || new Date().toISOString().split('T')[0]);
    setFormExpiry(item.expiry || '');
    setFormNotes(item.notes || '');
    setFormError(null);
    setIsAddModalOpen(true);
  }

  function openAddModal() {
    setEditingItem(null);
    setFormName('');
    setFormCategory('Vegetables');
    setFormQuantity(1);
    setFormUnit('pcs');
    setFormPurchaseDate(new Date().toISOString().split('T')[0]);
    setFormExpiry('');
    setFormNotes('');
    setFormError(null);
    setIsAddModalOpen(true);
  }

  function handleSaveSingleItem() {
    if (!formName.trim()) {
      setFormError('Ingredient name is required.');
      return;
    }

    // Food validation check
    const validation = validateSingleIngredient(formName);
    if (validation.status === 'non_food') {
      setFormError(`"${formName}" is recognized as a non-food item. IngrAIent only accepts edible culinary ingredients.`);
      return;
    }

    const canonicalName = validation.canonicalName || formName.trim();
    const resolvedCategory = formCategory || validation.category || getIngredientCategory(canonicalName);

    if (editingItem) {
      const updated = items.map(i => {
        if (i.id === editingItem.id) {
          return {
            ...i,
            name: canonicalName,
            category: resolvedCategory,
            quantity: Number(formQuantity),
            unit: formUnit,
            purchaseDate: formPurchaseDate,
            expiry: formExpiry || undefined,
            notes: formNotes || undefined,
          };
        }
        return i;
      });
      handleSavePantry(updated);
    } else {
      const newItem: PantryItem = {
        id: uuidv4(),
        name: canonicalName,
        category: resolvedCategory,
        quantity: Number(formQuantity),
        unit: formUnit,
        purchaseDate: formPurchaseDate,
        expiry: formExpiry || undefined,
        notes: formNotes || undefined,
      };
      handleSavePantry([...items, newItem]);
    }

    setIsAddModalOpen(false);
  }

  // Parse batch input & present review
  function handleProcessBatchInput() {
    if (!batchInput.trim()) return;

    const results = parseAndValidateIngredients(batchInput);
    setBatchValidationResults(results);

    // Prepare valid items for user review with sensible default expiry dates (e.g. 5 days from now)
    const defaultExp = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
    const initialReview = results.valid.map(v => ({
      id: uuidv4(),
      name: v.canonicalName || v.parsedName,
      category: v.category || getIngredientCategory(v.canonicalName || v.parsedName),
      quantity: v.quantity || 1,
      unit: v.unit || 'pcs',
      expiry: defaultExp,
      image: v.image || getIngredientImage(v.canonicalName || v.parsedName, v.category)
    }));

    setReviewItems(initialReview);
    setIsBatchModalOpen(false);
    setIsReviewModalOpen(true);
  }

  function handleConfirmReview() {
    const newPantryEntries: PantryItem[] = reviewItems.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      purchaseDate: new Date().toISOString().split('T')[0],
      expiry: item.expiry || undefined,
    }));

    // Merge or append to existing pantry
    const merged = [...items];
    for (const newItem of newPantryEntries) {
      const existingIdx = merged.findIndex(m => m.name.toLowerCase() === newItem.name.toLowerCase());
      if (existingIdx >= 0) {
        merged[existingIdx].quantity += newItem.quantity;
        if (newItem.expiry) merged[existingIdx].expiry = newItem.expiry;
      } else {
        merged.push(newItem);
      }
    }

    handleSavePantry(merged);
    setIsReviewModalOpen(false);
    setBatchInput('');
    setBatchValidationResults(null);
  }

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      // Category
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      // Expiry filter
      if (expiryFilter === 'expiring') {
        const st = getExpiryStatus(item.expiry);
        return st && (st.level === 'today' || st.level === 'tomorrow' || st.level === 'soon');
      }
      if (expiryFilter === 'expired') {
        const st = getExpiryStatus(item.expiry);
        return st && st.level === 'expired';
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'category') {
        return a.category.localeCompare(b.category);
      }
      if (sortBy === 'expiry') {
        if (!a.expiry) return 1;
        if (!b.expiry) return -1;
        return new Date(a.expiry).getTime() - new Date(b.expiry).getTime();
      }
      return 0;
    });
  }, [items, searchQuery, selectedCategory, expiryFilter, sortBy]);

  return (
    <div className="space-y-8">
      {/* Header and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#242A25] tracking-tight">
            My Kitchen Pantry
          </h1>
          <p className="text-sm text-[#66756A] mt-1">
            Track fresh ingredients, monitor expiration windows, and keep an accurate food inventory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleResetDemo}
            className="px-3.5 py-2.5 rounded-xl border border-[#E7E9E1] text-[#66756A] hover:text-[#242A25] hover:bg-white text-xs font-semibold flex items-center gap-2 transition-all"
            title="Reset to default demo items"
          >
            <RefreshCw className="w-4 h-4 text-[#A8BDA5]" />
            Reset Demo Pantry
          </button>

          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E7E9E1] text-[#244C3A] hover:bg-[#F8F7F1] text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <FileText className="w-4 h-4 text-[#244C3A]" />
            Quick Batch Add
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-[#244C3A] hover:bg-[#1b3a2c] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#D9E9A5]" />
            Add Ingredient
          </button>
        </div>
      </div>

      {/* Search, Filter and Sort Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-[#E7E9E1] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#66756A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ingredients by name or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-[#E7E9E1] focus:outline-none focus:border-[#244C3A] focus:ring-1 focus:ring-[#244C3A]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Expiry filter buttons */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setExpiryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                expiryFilter === 'all'
                  ? 'bg-[#244C3A] text-white'
                  : 'bg-[#F8F7F1] text-[#66756A] hover:bg-gray-100'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setExpiryFilter('expiring')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                expiryFilter === 'expiring'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Expiring Soon
            </button>
            <button
              onClick={() => setExpiryFilter('expired')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                expiryFilter === 'expired'
                  ? 'bg-rose-500 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Expired
            </button>
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-[#66756A] font-medium whitespace-nowrap">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs py-1.5 px-3 rounded-xl border border-[#E7E9E1] bg-white text-[#242A25] font-semibold focus:outline-none"
            >
              <option value="expiry">Expiry Date</option>
              <option value="name">Name (A-Z)</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'All'
                ? 'bg-[#D9E9A5] text-[#244C3A]'
                : 'text-[#66756A] hover:bg-[#F8F7F1]'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#D9E9A5] text-[#244C3A]'
                  : 'text-[#66756A] hover:bg-[#F8F7F1]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredients Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-[#E7E9E1] space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F8F7F1] flex items-center justify-center mx-auto text-[#A8BDA5]">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#242A25]">No pantry ingredients found</h3>
            <p className="text-sm text-[#66756A] max-w-md mx-auto mt-1">
              {searchQuery || selectedCategory !== 'All' || expiryFilter !== 'all'
                ? 'Try clearing your active search or filters.'
                : 'Your pantry is currently empty. Add your ingredients or load the starter demo pantry to get instant recipe matches!'}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleResetDemo}
              className="px-4 py-2 rounded-xl bg-white border border-[#E7E9E1] text-[#244C3A] text-xs font-bold hover:bg-[#F8F7F1]"
            >
              Load Demo Pantry
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-[#244C3A] text-white text-xs font-bold hover:bg-[#1b3a2c]"
            >
              Add Ingredient
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map(item => {
            const expStatus = getExpiryStatus(item.expiry);

            return (
              <div
                key={item.id}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E7E9E1] hover:border-[#A8BDA5] hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#244C3A] text-[#D9E9A5] shadow-sm">
                      {item.category}
                    </span>
                    {expStatus && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${expStatus.badgeColor}`}>
                        {expStatus.label}
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-[#111C15] text-lg leading-snug tracking-tight">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-1 text-[#33463A]">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg hover:text-[#1A3D2F] hover:bg-[#EAECE4] transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs font-semibold text-[#2D3F33] italic line-clamp-1">
                        "{item.notes}"
                      </p>
                    )}

                    {item.expiry && (
                      <div className="text-xs font-bold text-[#1F3327] flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#244C3A]" />
                        <span>Best before: {item.expiry}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Quantity Controller Footer */}
                <div className="px-4 py-3 bg-[#EEF2E8] border-t border-[#DFE4D6] flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#111C15] uppercase tracking-wider">Quantity:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(item.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-[#B8C2AF] text-[#111C15] hover:bg-[#1A3D2F] hover:text-white hover:border-[#1A3D2F] font-black flex items-center justify-center text-sm shadow-xs active:scale-95 transition-all"
                    >
                      -
                    </button>
                    <span className="text-sm font-black text-[#111C15] min-w-[54px] text-center bg-white px-2 py-0.5 rounded-md border border-[#CCD3C3]">
                      {item.quantity} {item.unit}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.id, 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-[#B8C2AF] text-[#111C15] hover:bg-[#1A3D2F] hover:text-white hover:border-[#1A3D2F] font-black flex items-center justify-center text-sm shadow-xs active:scale-95 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Single Add / Edit Ingredient Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E7E9E1] space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E7E9E1] pb-4">
              <h2 className="text-xl font-bold text-[#242A25]">
                {editingItem ? 'Edit Ingredient' : 'Add Ingredient to Pantry'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#242A25] uppercase tracking-wider mb-1.5">
                  Ingredient Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tomato, Paneer, Chicken, Olive Oil..."
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setFormError(null);
                  }}
                  list="catalog-suggestions"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E9E1] text-sm focus:outline-none focus:border-[#244C3A]"
                />
                <datalist id="catalog-suggestions">
                  {catalogList.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
                <span className="text-[11px] text-[#66756A] mt-1 block">
                  Autocompletes against our verified 120+ food item catalog.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#242A25] uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E7E9E1] text-sm bg-white focus:outline-none focus:border-[#244C3A]"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-[#242A25] uppercase tracking-wider mb-1.5">
                      Quantity
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#E7E9E1] text-sm focus:outline-none focus:border-[#244C3A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#242A25] uppercase tracking-wider mb-1.5">
                      Unit
                    </label>
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full px-2 py-2.5 rounded-xl border border-[#E7E9E1] text-sm bg-white focus:outline-none focus:border-[#244C3A]"
                    >
                      <option value="pcs">pcs</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                      <option value="tbsp">tbsp</option>
                      <option value="tsp">tsp</option>
                      <option value="cups">cups</option>
                      <option value="cloves">cloves</option>
                      <option value="bunch">bunch</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#242A25] uppercase tracking-wider mb-1.5">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formPurchaseDate}
                    onChange={(e) => setFormPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E7E9E1] text-sm focus:outline-none focus:border-[#244C3A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#242A25] uppercase tracking-wider mb-1.5">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E7E9E1] text-sm focus:outline-none focus:border-[#244C3A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#242A25] uppercase tracking-wider mb-1.5">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fresh from farmer's market, in crisper drawer"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E9E1] text-sm focus:outline-none focus:border-[#244C3A]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E7E9E1]">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E7E9E1] text-xs font-semibold text-[#66756A] hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSingleItem}
                className="px-5 py-2.5 rounded-xl bg-[#244C3A] text-white text-xs font-bold hover:bg-[#1b3a2c]"
              >
                {editingItem ? 'Update Ingredient' : 'Save to Pantry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Batch Add Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E7E9E1] space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E7E9E1] pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#242A25]">Quick Batch Ingredient Entry</h2>
                <p className="text-xs text-[#66756A]">
                  Type or paste free-form ingredient lists separated by commas.
                </p>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#242A25] uppercase tracking-wider">
                Enter ingredients:
              </label>
              <textarea
                rows={4}
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder="e.g. 2 tomatoes, 1 onion, 4 eggs, 200g paneer, 500ml milk"
                className="w-full p-3.5 rounded-xl border border-[#E7E9E1] text-sm focus:outline-none focus:border-[#244C3A] font-mono"
              />
              <div className="p-3 bg-[#F8F7F1] rounded-xl text-xs text-[#66756A] space-y-1">
                <span className="font-semibold text-[#244C3A] block">Example inputs:</span>
                <p>• "3 carrots, 500g chicken breast, 2 bell peppers, 1 tbsp olive oil"</p>
                <p>• Try typing "rubber, plastic, detergent" to see food safety validation in action.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E7E9E1]">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E7E9E1] text-xs font-semibold text-[#66756A] hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessBatchInput}
                disabled={!batchInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#244C3A] text-white text-xs font-bold hover:bg-[#1b3a2c] disabled:opacity-50"
              >
                Parse & Validate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review & Confirmation Modal */}
      {isReviewModalOpen && batchValidationResults && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#E7E9E1] space-y-5 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E7E9E1] pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#242A25]">Review & Confirm Ingredients</h2>
                <p className="text-xs text-[#66756A]">
                  Review validated items before committing to your pantry.
                </p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Non-Food Rejection Alert Banner */}
            {batchValidationResults.invalid.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>Some items aren't recognized as food ingredients.</span>
                </div>
                <p>
                  The following non-food items were flagged and blocked from entering your kitchen pantry:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {batchValidationResults.invalid.map((inv, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-rose-200/80 font-bold text-rose-900 line-through">
                      {inv.raw}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-rose-700 italic pt-1">
                  Please add edible food ingredients such as vegetables, fruits, grains, dairy, spices, or proteins.
                </p>
              </div>
            )}

            {/* Unrecognized items alert */}
            {batchValidationResults.unrecognized.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Unrecognized items detected</span>
                </div>
                <p>
                  These items were not found in the verified food catalog and were omitted: {batchValidationResults.unrecognized.map(u => u.raw).join(', ')}.
                </p>
              </div>
            )}

            {/* Valid items editable list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <h4 className="text-xs font-bold text-[#242A25] uppercase tracking-wider">
                Ready to Add ({reviewItems.length} items)
              </h4>

              {reviewItems.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-500">
                  No valid culinary ingredients to add. Please try again with real food items.
                </div>
              ) : (
                reviewItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#F8F7F1] rounded-2xl border border-[#E7E9E1] flex flex-wrap sm:flex-nowrap items-center gap-3"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white border border-[#E7E9E1] flex items-center justify-center shrink-0 text-[#244C3A]">
                      <ChefHat className="w-5 h-5 text-[#244C3A]" />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <span className="font-bold text-sm text-[#242A25] block">{item.name}</span>
                      <span className="text-[11px] text-[#66756A]">{item.category}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 1;
                          setReviewItems(reviewItems.map((r, i) => i === idx ? { ...r, quantity: val } : r));
                        }}
                        className="w-16 px-2 py-1 text-xs rounded-lg border border-[#E7E9E1] bg-white font-bold"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => {
                          const u = e.target.value;
                          setReviewItems(reviewItems.map((r, i) => i === idx ? { ...r, unit: u } : r));
                        }}
                        className="text-xs px-2 py-1 rounded-lg border border-[#E7E9E1] bg-white"
                      >
                        <option value="pcs">pcs</option>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="L">L</option>
                        <option value="tbsp">tbsp</option>
                        <option value="tsp">tsp</option>
                        <option value="cups">cups</option>
                        <option value="cloves">cloves</option>
                        <option value="bunch">bunch</option>
                      </select>
                    </div>

                    <div>
                      <input
                        type="date"
                        value={item.expiry}
                        onChange={(e) => {
                          const exp = e.target.value;
                          setReviewItems(reviewItems.map((r, i) => i === idx ? { ...r, expiry: exp } : r));
                        }}
                        className="text-xs px-2 py-1 rounded-lg border border-[#E7E9E1] bg-white"
                      />
                    </div>

                    <button
                      onClick={() => setReviewItems(reviewItems.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-rose-600 p-1"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E7E9E1]">
              <span className="text-xs text-[#66756A]">
                {reviewItems.length} items will be saved to your active pantry.
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E7E9E1] text-xs font-semibold text-[#66756A] hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reviewItems.length === 0}
                  onClick={handleConfirmReview}
                  className="px-5 py-2.5 rounded-xl bg-[#244C3A] text-white text-xs font-bold hover:bg-[#1b3a2c] disabled:opacity-50"
                >
                  Confirm & Save to Pantry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
