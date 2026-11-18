import axios from 'axios';
import type { Recipe, GenerateRecipeRequest } from '../types';

const rawApiUrl = import.meta.env.VITE_API_URL;
const API_BASE_URL = rawApiUrl 
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api`)
  : (import.meta.env.DEV ? 'http://localhost:4000/api' : '/api');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 50000, // 50s timeout for generative AI recipes (clean error boundary)
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface HealthCheckResponse {
  status: string;
  brand: string;
  tagline: string;
  hasGeminiKey: boolean;
  catalogItems: number;
  sampleRecipes: number;
}

export interface ValidateIngredientsResponse {
  totalChecked: number;
  hasInvalid: boolean;
  valid: Array<{ raw: string; canonicalName?: string; category?: string; image?: string; status: string }>;
  invalid: Array<{ raw: string; status: string; message: string }>;
  unrecognized: Array<{ raw: string; status: string; message: string }>;
  errorMessage?: string;
}

export interface GenerateRecipesResponse {
  isDemo: boolean;
  message?: string;
  recipes: Recipe[];
}

export async function checkBackendHealth(): Promise<HealthCheckResponse> {
  const res = await apiClient.get<HealthCheckResponse>('/health');
  return res.data;
}

export async function validateIngredientsApi(
  items: string[]
): Promise<ValidateIngredientsResponse> {
  const res = await apiClient.post<ValidateIngredientsResponse>('/validate-ingredients', {
    items,
  });
  return res.data;
}

export async function fetchAllRecipes(): Promise<Recipe[]> {
  const res = await apiClient.get<{ recipes: Recipe[] }>('/recipes');
  return res.data.recipes;
}

export async function fetchRecipeById(id: string): Promise<Recipe> {
  const res = await apiClient.get<Recipe>(`/recipes/${id}`);
  return res.data;
}

export async function generateRecipesApi(
  request: GenerateRecipeRequest,
  signal?: AbortSignal
): Promise<GenerateRecipesResponse> {
  const res = await apiClient.post<GenerateRecipesResponse>(
    '/recipes/generate',
    request,
    { signal }
  );
  return res.data;
}
