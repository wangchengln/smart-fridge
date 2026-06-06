import type { RecommendationItem } from '../types/api';
import type { RecipeQuadrantTab } from './recipeQuadrant';
import { getRecipeOneLinerReviewText } from './recipeOneLinerReviews';

const CATEGORY_RULES: { keywords: string[]; label: string }[] = [
  { keywords: ['汤', '羹', '煲'], label: '汤' },
  { keywords: ['沙拉', '凉拌'], label: '凉菜' },
  { keywords: ['蒸', '蛋羹'], label: '蒸菜' },
  { keywords: ['烤', '烧', '烤'], label: '烤制' },
  { keywords: ['粥', '饭', '面', '粉'], label: '主食' },
  { keywords: ['炒', '煎', '爆', '煸'], label: '炒菜' },
];

const TASTE_POOL = ['清淡', '咸鲜', '麻辣', '酸甜'] as const;

export const getRecipeCategoryTag = (name: string): string => {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => name.includes(kw))) return rule.label;
  }
  return '家常菜';
};

export const getRecipeTasteTag = (recipe: RecommendationItem): string => {
  const name = recipe.name;
  if (name.includes('麻') || name.includes('辣') || name.includes('椒')) return '麻辣';
  if (name.includes('糖') || name.includes('醋') || name.includes('甜')) return '酸甜';
  if (name.includes('蒸') || name.includes('汤') || name.includes('凉拌')) return '清淡';
  const idx = recipe.recipe_id % TASTE_POOL.length;
  return TASTE_POOL[idx];
};

export const estimateCalories = (recipe: RecommendationItem): number => {
  const base = 90 + (recipe.recipe_id % 9) * 15;
  return Math.round(base + recipe.cooking_time * 3.5);
};

export interface RecipeReviewInput {
  recipe_id: number;
  name: string;
}

export const getRecipeOneLinerReview = (recipe: RecipeReviewInput): string =>
  getRecipeOneLinerReviewText(recipe.name, recipe.recipe_id);

export const getMatchPercent = (recipe: RecommendationItem): number => {
  const ratio = Number(recipe.existing_ingredients_ratio) || 0;
  return Math.round(ratio * 100);
};

export const getMissingIngredientNames = (recipe: RecommendationItem, limit = 3): string[] =>
  (recipe.missing_ingredients_detail ?? [])
    .slice(0, limit)
    .map((item) => String(item.name ?? '未知食材'))
    .filter(Boolean);

export const getIngredientStatusText = (recipe: RecommendationItem): string => {
  if (recipe.missing_ingredients_count === 0) return '冰箱食材充足';
  const names = getMissingIngredientNames(recipe);
  if (names.length === 0) return `还需补齐 ${recipe.missing_ingredients_count} 样食材`;
  const suffix = recipe.missing_ingredients_count > names.length ? ' 等' : '';
  return `还需要：${names.join('、')}${suffix}`;
};

export interface DeliveryStatus {
  type: 'ready' | 'meituan' | 'takeout' | 'premade';
  label: string;
  detail?: string;
}

export const getDeliveryStatus = (
  recipe: RecommendationItem,
  quadrant: RecipeQuadrantTab
): DeliveryStatus => {
  if (recipe.missing_ingredients_count === 0 && quadrant !== 'takeout_delivery') {
    return { type: 'ready', label: '直接可做' };
  }

  if (quadrant === 'takeout_delivery') {
    const analysis = recipe.takeout_analysis;
    const price = analysis?.estimated_takeout_price ?? recipe.cost_metrics?.final_price;
    const minutes = analysis?.delivery_time_minutes ?? recipe.cost_metrics?.time_cost_minutes;
    return {
      type: 'takeout',
      label: '美团外卖',
      detail: `${price != null ? `¥${Number(price).toFixed(0)} 起` : '同款直达'}${minutes != null ? ` / ${minutes}分钟达` : ''}`,
    };
  }

  if (quadrant === 'premade_fresh') {
    const analysis = recipe.premade_analysis;
    const price = analysis?.estimated_premade_price ?? recipe.cost_metrics?.final_price;
    const minutes = analysis?.delivery_time_minutes ?? 28;
    return {
      type: 'premade',
      label: analysis?.channel_name ?? '小象鲜食',
      detail: `${price != null ? `¥${Number(price).toFixed(0)} 起` : '新鲜预制'} / ${minutes}分钟达`,
    };
  }

  const purchase = recipe.purchase_analysis as Record<string, unknown> | undefined;
  const flashMinutes =
    (purchase?.flash_delivery_minutes as number | undefined) ??
    recipe.cost_metrics?.time_cost_minutes ??
    28;
  const estimatedCost =
    (purchase?.estimated_cost as number | undefined) ??
    recipe.cost_metrics?.final_price ??
    recipe.cost_metrics?.money_cost;

  return {
    type: 'meituan',
    label: '美团补齐',
    detail: `${estimatedCost != null ? `¥${Number(estimatedCost).toFixed(1)} 起` : '闪购补料'} / ${flashMinutes}分钟达`,
  };
};

export interface PrimaryAction {
  label: string;
  href: string;
  external?: boolean;
}

export const getPrimaryAction = (
  recipe: RecommendationItem,
  quadrant: RecipeQuadrantTab
): PrimaryAction => {
  if (quadrant === 'takeout_delivery') {
    return {
      label: '点外卖',
      href: '/takeout/merchants',
      external: false,
    };
  }
  if (quadrant === 'premade_fresh') {
    return {
      label: '买鲜食',
      href: '/premade/channels',
      external: false,
    };
  }
  if (recipe.missing_ingredients_count > 0) {
    return {
      label: '去补货',
      href: `/purchase/analyze?recipe_id=${recipe.recipe_id}&name=${encodeURIComponent(recipe.name)}`,
    };
  }
  return { label: '去做菜', href: `/recipes/${recipe.recipe_id}` };
};
