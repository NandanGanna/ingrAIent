// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Pantry from "./pages/Pantry";
import DiscoverRecipes from "./pages/DiscoverRecipes";
import SavedRecipes from "./pages/SavedRecipes";
import RecipeDetails from "./pages/RecipeDetails";
import CookingMode from "./pages/CookingMode";
import Insights from "./pages/Insights";
import Layout from "./components/layout/Layout";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pantry" element={<Pantry />} />
          <Route path="/discover" element={<DiscoverRecipes />} />
          <Route path="/saved" element={<SavedRecipes />} />
          <Route path="/recipe/:id" element={<RecipeDetails />} />
          <Route path="/cook/:id" element={<CookingMode />} />
          <Route path="/insights" element={<Insights />} />
        </Routes>
      </Layout>
    </Router>
  );
}
