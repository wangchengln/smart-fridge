import type { TakeoutRedirectResponse } from '../types/api';

export const TAKEOUT_CONTEXT_KEY = 'takeoutContext';
export const TAKEOUT_CART_KEY = 'takeoutCart';

export const saveTakeoutContext = (context: TakeoutRedirectResponse): void => {
  sessionStorage.setItem(TAKEOUT_CONTEXT_KEY, JSON.stringify(context));
};

export const loadTakeoutContext = (): TakeoutRedirectResponse | null => {
  try {
    const raw = sessionStorage.getItem(TAKEOUT_CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as TakeoutRedirectResponse) : null;
  } catch {
    return null;
  }
};

export type TakeoutCartItem = TakeoutRedirectResponse['store_items'][number] & {
  quantity: number;
};

export const saveTakeoutCart = (items: TakeoutCartItem[]): void => {
  sessionStorage.setItem(TAKEOUT_CART_KEY, JSON.stringify(items));
};

export const loadTakeoutCart = (): TakeoutCartItem[] => {
  try {
    const raw = sessionStorage.getItem(TAKEOUT_CART_KEY);
    return raw ? (JSON.parse(raw) as TakeoutCartItem[]) : [];
  } catch {
    return [];
  }
};
