import type { RecommendationResponse, RecipeRecommendParams } from '../types/api';

export type RecipeQuadrantTab =
  | 'cook_self'
  | 'flash_purchase_cook'
  | 'takeout_delivery'
  | 'premade_fresh';

export type RecipeIntent = 'cook' | 'flash' | 'premade';

/** 首页「今天怎么吃」四象限入口 */
export type HomeMealMode = 'cook_self' | 'flash_purchase' | 'takeout' | 'premade';

export const RECIPE_QUADRANT_TABS: RecipeQuadrantTab[] = [
  'cook_self',
  'flash_purchase_cook',
  'takeout_delivery',
  'premade_fresh',
];

export const isRecipeQuadrantTab = (value: string | null): value is RecipeQuadrantTab =>
  RECIPE_QUADRANT_TABS.includes(value as RecipeQuadrantTab);

export const isRecipeIntent = (value: string | null): value is RecipeIntent =>
  value === 'cook' || value === 'flash' || value === 'premade';

/** 首页四象限卡片 → 菜谱页路由（同时带 intent 与 tab，避免进入后被自动切走） */
export const homeMealModeToRecipesPath = (mode: HomeMealMode): string => {
  switch (mode) {
    case 'cook_self':
      return '/recipes?intent=cook&tab=cook_self';
    case 'flash_purchase':
      return '/recipes?intent=flash&tab=flash_purchase_cook';
    case 'takeout':
      return '/recipes?tab=takeout_delivery';
    case 'premade':
      return '/premade';
    default:
      return '/recipes';
  }
};

export interface RecipesPageEntry {
  intent?: RecipeIntent;
  tab?: RecipeQuadrantTab;
}

const TAB_TO_INTENT: Partial<Record<RecipeQuadrantTab, RecipeIntent>> = {
  cook_self: 'cook',
  flash_purchase_cook: 'flash',
  premade_fresh: 'premade',
};

/** 下方象限 Tab → 上方「今天怎么吃」意图（外卖同款无对应 intent） */
export const tabToIntent = (tab: RecipeQuadrantTab): RecipeIntent | undefined =>
  TAB_TO_INTENT[tab];

export const intentToDefaultTab = (intent: RecipeIntent): RecipeQuadrantTab => {
  const map: Record<RecipeIntent, RecipeQuadrantTab> = {
    cook: 'cook_self',
    flash: 'flash_purchase_cook',
    premade: 'premade_fresh',
  };
  return map[intent];
};

/** 解析菜谱页 URL 参数（来自首页或其它入口） */
export const parseRecipesPageSearchParams = (
  params: URLSearchParams
): RecipesPageEntry | null => {
  const tabParam = params.get('tab');
  const intentParam = params.get('intent');

  const entry: RecipesPageEntry = {};

  if (isRecipeQuadrantTab(tabParam)) {
    entry.tab = tabParam;
  }
  if (isRecipeIntent(intentParam)) {
    entry.intent = intentParam;
  }

  if (!entry.tab && !entry.intent) {
    return null;
  }

  if (!entry.intent && entry.tab) {
    entry.intent = TAB_TO_INTENT[entry.tab];
  }
  if (!entry.tab && entry.intent) {
    entry.tab = intentToDefaultTab(entry.intent);
  }

  return entry;
};

export const RECIPE_INTENT_OPTIONS: {
  id: RecipeIntent;
  label: string;
  desc: string;
}[] = [
  { id: 'cook', label: '有时间自己做', desc: '库存充足，直接开做' },
  { id: 'flash', label: '想省事补料', desc: '闪购少量补料后做' },
  { id: 'premade', label: '想吃预制', desc: '小象鲜食 / 便利店' },
];

/** 「不想做」对应下方「外卖同款」象限，点外卖进入店内选菜 */
export const TAKEOUT_REDIRECT_OPTION = {
  label: '不想做',
  desc: '外卖同款 · 店内选菜',
};

export const intentToQueryParams = (
  intent: RecipeIntent
): Pick<
  RecipeRecommendParams,
  'has_time' | 'prefer_convenience' | 'prefer_premade' | 'prefer_takeout'
> => {
  switch (intent) {
    case 'cook':
      return {
        has_time: true,
        prefer_convenience: false,
        prefer_premade: false,
        prefer_takeout: false,
      };
    case 'flash':
      return {
        has_time: true,
        prefer_convenience: true,
        prefer_premade: false,
        prefer_takeout: false,
      };
    case 'premade':
      return {
        has_time: false,
        prefer_convenience: false,
        prefer_premade: true,
        prefer_takeout: false,
      };
    default:
      return {
        has_time: true,
        prefer_convenience: false,
        prefer_premade: false,
        prefer_takeout: false,
      };
  }
};

const mergeRecipeLists = (
  primary?: RecommendationResponse['cook_self_recipes'],
  legacy?: RecommendationResponse['no_purchase_recipes']
) => {
  const combined = [...(primary ?? []), ...(legacy ?? [])];
  const seen = new Set<number>();
  return combined.filter((item) => {
    if (seen.has(item.recipe_id)) return false;
    seen.add(item.recipe_id);
    return true;
  });
};

export const groupRecommendationsByQuadrant = (data?: RecommendationResponse) => ({
  cook_self: mergeRecipeLists(data?.cook_self_recipes, data?.no_purchase_recipes),
  flash_purchase_cook: mergeRecipeLists(
    data?.flash_purchase_recipes,
    data?.small_purchase_recipes
  ),
  takeout_delivery: mergeRecipeLists(
    data?.takeout_delivery_recipes,
    data?.takeout_alternative_recipes
  ),
  premade_fresh: data?.premade_fresh_recipes ?? [],
});

export const pickDefaultQuadrantTab = (
  groups: ReturnType<typeof groupRecommendationsByQuadrant>,
  preferred?: RecipeQuadrantTab
): RecipeQuadrantTab => {
  if (preferred && groups[preferred].length > 0) {
    return preferred;
  }

  const order: RecipeQuadrantTab[] = [
    'cook_self',
    'flash_purchase_cook',
    'premade_fresh',
    'takeout_delivery',
  ];

  return order.find((tab) => groups[tab].length > 0) ?? 'cook_self';
};

export const toNumber = (value: number | string | undefined): number => {
  if (value === undefined || value === null) return 0;
  return typeof value === 'number' ? value : Number(value) || 0;
};

/** 构建推荐请求参数（四象限并行展示，不再按意图切换后端分类） */
export const buildRecipeRecommendParams = (
  userId: number,
  _intent: RecipeIntent = 'cook',
  options: {
    preference?: string;
    maxMissing?: string;
    refresh?: boolean;
    dietaryMode?: import('../types/api').DietaryMode;
  } = {}
): RecipeRecommendParams => ({
  user_id: userId,
  preference: options.preference || undefined,
  max_missing: options.maxMissing ? parseInt(options.maxMissing, 10) : undefined,
  refresh: options.refresh ?? false,
  has_time: true,
  prefer_convenience: false,
  prefer_premade: false,
  prefer_takeout: false,
  dietary_mode: options.dietaryMode,
});
