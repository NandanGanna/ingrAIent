import { z } from 'zod';

export const PantryItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  category: z.string(),
  quantity: z.number().nonnegative(),
  unit: z.string(),
  purchaseDate: z.string().optional(),
  expiry: z.string().optional(),
  notes: z.string().optional(),
});

export type PantryItem = z.infer<typeof PantryItemSchema>;

export const RecipeIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  available: z.boolean().default(false),
  required: z.boolean().default(true),
  optional: z.boolean().default(false),
  category: z.string().optional(),
  notes: z.string().optional(),
});

export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;

export const RecipeStepSchema = z.object({
  instruction: z.string(),
  durationMinutes: z.number().optional(),
});

export type RecipeStep = z.infer<typeof RecipeStepSchema>;

export const RecipeSubstitutionSchema = z.object({
  original: z.string(),
  substitute: z.string(),
  ratio: z.string().optional().default("1:1"),
  notes: z.string().optional().default(""),
});

export type RecipeSubstitution = z.infer<typeof RecipeSubstitutionSchema>;

export const RecipeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  cuisine: z.string(),
  prepTimeMinutes: z.number().default(15),
  cookTimeMinutes: z.number().default(20),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Easy'),
  servings: z.number().default(2),
  ingredients: z.array(RecipeIngredientSchema),
  steps: z.array(RecipeStepSchema),
  tags: z.array(z.string()).default([]),
  substitutions: z.array(RecipeSubstitutionSchema).default([]),
  image: z.string().optional(),
  matchScore: z.number().optional(),
  explanation: z.string().optional(),
  expiringIngredientsUsed: z.array(z.string()).optional(),
  missingIngredients: z.array(z.string()).optional(),
  isDemo: z.boolean().optional(),
});

export type Recipe = z.infer<typeof RecipeSchema>;

export const GenerateRecipeRequestSchema = z.object({
  pantryIngredients: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
    expiry: z.string().optional(),
  })),
  cuisinePreference: z.string().optional(),
  dietaryPreference: z.string().optional(),
  servings: z.number().optional().default(2),
  maxTimeMinutes: z.number().optional(),
  mealType: z.string().optional(),
  difficulty: z.string().optional(),
  additionalInstructions: z.string().optional(),
  quickFilter: z.string().optional(),
});

export type GenerateRecipeRequest = z.infer<typeof GenerateRecipeRequestSchema>;
