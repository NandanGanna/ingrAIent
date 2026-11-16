# IngrAIent — AI-Powered Kitchen & Recipe Intelligence

> **Turn ingredients into inspiration.**

🌐 **Live Demo:** [https://ingraient.onrender.com/dashboard](https://ingraient.onrender.com/dashboard)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://ingraient.onrender.com/dashboard)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-API-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)

**IngrAIent** is an intelligent kitchen management and recipe discovery web application that answers the central everyday question: **"What can I cook with what I already have?"**

---

## 🚀 Deployed Application

- **Live URL**: [https://ingraient.onrender.com/dashboard](https://ingraient.onrender.com/dashboard)
- **Status**: Active & Hosted on Render
- **Architecture**: Unified full-stack deployment (Node.js/Express backend + React 19 Vite production build).

---

## 🌟 Key Features

1. **Smart Pantry Management**
   - Digital kitchen inventory tracking quantities, units, categories, purchase dates, and expiration dates.
   - Real-time priority alerts for items expiring **today**, **tomorrow**, or **within 3 days**.
   - Quick Batch free-form parser (e.g., `"2 tomatoes, 1 onion, 4 eggs, 200g paneer"`).
   - Review and confirmation modal before saving to pantry.
   - Safe increment/decrement controls, editing, and deletion.
   - Validated LocalStorage persistence with sample starter demo pantry.

2. **Strict Food Safety & Non-Food Rejection**
   - Centralized recognized-food catalog with **122+ culinary ingredients** across Vegetables, Fruits, Dairy, Protein, Grains, Spices, and Condiments.
   - Comprehensive blacklist blocking non-edibles (rubber, plastic, glass, metal, paper, detergents, electronics, cleaning chemicals, batteries).
   - Mixed-input handling: preserves edible items for review while clearly identifying and blocking invalid non-food objects.
   - Dual-boundary validation: enforced both on the backend and frontend.

3. **Expiry-First Recipe Intelligence & AI Generation**
   - Integrates Google's **Gemini AI API** (`gemini-2.0-flash` with dynamic fallback) via `@google/genai`.
   - Prioritizes recipes that consume expiring pantry ingredients first.
   - Full Zod schema validation over structured JSON output.
   - Deterministic recipe match scoring calculated in application logic (not hallucinated by the model).
   - Seamless demo fallback mode when API key is not yet configured.

4. **Intelligent Substitution Engine**
   - Suggests culinary alternatives when an ingredient is missing or optional (e.g., Tofu for Paneer, Butter for Oil).
   - Interactive 1-click substitute application: updates recipe ingredients, refreshes availability indicators, recalculates match scores, and provides an immediate Undo action.

5. **Dynamic Serving Size Adjuster**
   - Proportionally recalculates all ingredient quantities when servings are scaled up or down (e.g. 2 servings → 4 servings doubles 200g paneer to 400g).

6. **Interactive Full-Screen Cooking Mode**
   - Step-by-step distraction-free interface with progress bar and step counter.
   - Active countdown timer per step with Play, Pause, Reset, +1m quick-add, and completion alert.
   - Interactive ingredients checklist for each step.
   - Keyboard navigation support (`ArrowLeft`, `ArrowRight`).

7. **Smart Leftover Tracking**
   - Automatically calculates quantities deducted from pantry after cooking.
   - User review modal preventing accidental negative inventory or double deduction.
   - Automatically feeds updated inventory into future recipe recommendations and Kitchen Insights.

8. **Kitchen Insights & Real Analytics**
   - Real-time pantry composition metrics and food group distribution.
   - Live count of ingredients rescued from wastage.
   - Detailed historical log of cooked recipes and ingredients consumed.

---

## 🎨 Visual Identity & Palette

- **Primary Forest Green**: `#244C3A`
- **Secondary Sage**: `#A8BDA5`
- **Background Warm Ivory**: `#F8F7F1`
- **Surface White**: `#FFFFFF`
- **Accent Muted Lime**: `#D9E9A5`
- **Primary Text**: `#242A25`
- **Secondary Text**: `#66756A`
- **Border**: `#E7E9E1`
- **Typography**: Inter / System Sans
- **Photography**: High-resolution Unsplash food photography mapped to every ingredient and dish.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# (Optional) Add your Gemini API key for live AI generation
# Create .env from template:
cp .env.example .env
# Edit .env and set:
# GEMINI_API_KEY=your_gemini_api_key_here

# Start the backend server (runs on http://localhost:4000)
npm start
```

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server (runs on http://localhost:5173)
npm run dev
```

Open **http://localhost:5173** in your web browser.

---

## 📂 Project Architecture

```
FLAM_PROJECT/
├── backend/
│   ├── data/
│   │   ├── catalog.json          # 122+ Verified Food Ingredients
│   │   └── sampleRecipes.json    # Curated culinary recipes
│   ├── services/
│   │   └── geminiService.js      # Gemini GenAI structured prompt & validation
│   ├── validators/
│   │   └── foodValidator.js      # Non-food blacklist & catalog whitelist
│   ├── index.js                  # Express API server & routes
│   ├── package.json              # Backend dependencies & startup scripts
│   └── .env.example              # Environment variables template
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/Layout.tsx         # Sidebar, mobile nav & brand logo
│   │   │   └── cooking/LeftoverModal.tsx # Leftover deduction & pantry update
│   │   ├── data/
│   │   │   ├── ingredients/catalog.json  # Centralized ingredient catalog & images
│   │   │   └── recipes/sampleRecipes.json# Curated dishes with photography
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx             # Overview, expiry alerts & recommendations
│   │   │   ├── Pantry.tsx                # Inventory CRUD, batch parse, validation
│   │   │   ├── DiscoverRecipes.tsx       # AI generation, filters & match cards
│   │   │   ├── RecipeDetails.tsx         # Scaled servings & substitution engine
│   │   │   ├── CookingMode.tsx           # Fullscreen step-by-step cooking & timer
│   │   │   ├── SavedRecipes.tsx          # Saved cookbook & cookbox
│   │   │   └── Insights.tsx              # Real pantry & cooking analytics
│   │   ├── services/
│   │   │   └── api.ts                    # Backend API client
│   │   ├── types/
│   │   │   └── index.ts                  # Zod schemas & TypeScript types
│   │   ├── utils/
│   │   │   ├── ingredients.ts            # Image lookups & category fallbacks
│   │   │   ├── pantry.ts                 # LocalStorage persistence & expiry logic
│   │   │   ├── recipeScorer.ts           # Deterministic recipe match scoring
│   │   │   └── validation.ts             # Free-form batch parser & non-food checks
│   │   ├── App.tsx                       # React Router configuration
│   │   └── index.css                     # Tailwind CSS v4 styling
│   └── package.json
└── README.md
```

---

## 🛡️ Non-Food Rejection Test Scenarios

Try entering these directly into the **Quick Batch Add** modal on the Pantry page:

1. **Non-Food Input**:
   `rubber, plastic, detergent, glass, metal`
   - *Result*: Blocked immediately with alert: `"Some items aren't recognized as food ingredients."`

2. **Mixed Input**:
   `2 tomatoes, 1 onion, rubber, 200g paneer`
   - *Result*: Parses `Tomato`, `Onion`, and `Paneer` for review and editing. `rubber` is flagged with a red strike-through and prohibited from entering the pantry.

---

## 🧪 Verification & Build Status

- **Frontend Build**: Verified with `tsc -b && vite build` (Exit code: 0).
- **Backend API**: Verified on `http://localhost:4000/api/health` (Exit code: 0).
- **Validation**: Verified against 122+ culinary items and 35+ non-food items.
- **Image Fallbacks**: Guaranteed high-res food photo for every displayed card.
