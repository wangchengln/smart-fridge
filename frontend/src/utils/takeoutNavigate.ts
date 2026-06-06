import type { NavigateFunction } from 'react-router-dom';
import type {
  RecommendationItem,
  TakeoutMerchant,
  TakeoutRedirectParams,
  TakeoutRedirectResponse,
} from '../types/api';
import {
  saveTakeoutCart,
  saveTakeoutContext,
  TAKEOUT_CART_KEY,
  type TakeoutCartItem,
} from './takeoutContext';

/** 将指定菜谱置顶，并预选对应外卖菜品 */
export const applyTakeoutFocus = (
  context: TakeoutRedirectResponse,
  recipe?: RecommendationItem
): TakeoutRedirectResponse => {
  if (!recipe) {
    sessionStorage.removeItem(TAKEOUT_CART_KEY);
    return context;
  }

  const focusId = recipe.recipe_id;
  const storeItems = [...context.store_items];
  const focused = storeItems.filter((item) => item.recipe_id === focusId);
  const rest = storeItems.filter((item) => item.recipe_id !== focusId);
  const defaultItem = focused.find((item) => item.channel === 'waimai') ?? focused[0];

  if (defaultItem) {
    const cartItem: TakeoutCartItem = { ...defaultItem, quantity: 1 };
    saveTakeoutCart([cartItem]);
  }

  const searchKeyword = recipe.takeout_analysis?.search_keyword || recipe.name;

  return {
    ...context,
    search_keyword: searchKeyword,
    recommendation_tip: `为「${recipe.name}」匹配外卖同款，可直接前往美团外卖下单`,
    store_items: focused.length > 0 ? [...focused, ...rest] : storeItems,
  };
};

interface OpenTakeoutStoreOptions {
  userId: number;
  preference?: string;
  focusRecipe?: RecommendationItem;
  fetchRedirect: (params: TakeoutRedirectParams) => Promise<TakeoutRedirectResponse>;
  navigate: NavigateFunction;
}

/** 统一跳转美团外卖商家搜索页（「不想做」与「点外卖」共用） */
export const openTakeoutStore = async ({
  userId,
  preference,
  focusRecipe,
  fetchRedirect,
  navigate,
}: OpenTakeoutStoreOptions): Promise<void> => {
  const result = await fetchRedirect({
    user_id: userId,
    preference: preference || undefined,
    recipe_id: focusRecipe?.recipe_id,
  });
  const context = applyTakeoutFocus(result, focusRecipe);
  saveTakeoutContext(context);
  navigate('/takeout/merchants');
};

/** 从商家列表进入店铺点菜页 */
export const openTakeoutMerchantStore = (
  context: TakeoutRedirectResponse,
  merchant: TakeoutMerchant,
  navigate: NavigateFunction
): void => {
  const recipeId = merchant.recipe_id;
  const storeItems = recipeId
    ? context.store_items.filter((item) => item.recipe_id === recipeId)
    : context.store_items;

  const defaultItem = storeItems.find((item) => item.channel === 'waimai') ?? storeItems[0];
  if (defaultItem) {
    saveTakeoutCart([{ ...defaultItem, quantity: 1 }]);
  } else {
    sessionStorage.removeItem(TAKEOUT_CART_KEY);
  }

  saveTakeoutContext({
    ...context,
    store_info: merchant.store_info,
    store_items: storeItems.length > 0 ? storeItems : context.store_items,
    recommendation_tip: `已为你匹配「${merchant.name}」，可直接选菜下单`,
    search_keyword: merchant.name,
  });
  navigate('/takeout/store');
};
