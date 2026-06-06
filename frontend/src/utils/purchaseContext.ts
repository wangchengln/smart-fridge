import type { MissingIngredientAnalyze } from '../types/api';

export interface PurchaseContext {
  recipe_id: number;
  recipe_name: string;
  missing_ingredients: MissingIngredientAnalyze[];
}

const PURCHASE_CONTEXT_KEY = 'purchaseContext';

export const savePurchaseContext = (context: PurchaseContext): void => {
  sessionStorage.setItem(PURCHASE_CONTEXT_KEY, JSON.stringify(context));
};

export const loadPurchaseContext = (): PurchaseContext | null => {
  try {
    const raw = sessionStorage.getItem(PURCHASE_CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as PurchaseContext) : null;
  } catch {
    return null;
  }
};
