import type { RecommendationItem } from '../types/api';

export const PREMADE_CONTEXT_KEY = 'premadeContext';

export interface PremadeContext {
  recipes: RecommendationItem[];
  focusRecipe?: RecommendationItem;
  search_keyword?: string;
  recommendation_tip?: string;
}

export const savePremadeContext = (context: PremadeContext): void => {
  sessionStorage.setItem(PREMADE_CONTEXT_KEY, JSON.stringify(context));
};

export const loadPremadeContext = (): PremadeContext | null => {
  try {
    const raw = sessionStorage.getItem(PREMADE_CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as PremadeContext) : null;
  } catch {
    return null;
  }
};
