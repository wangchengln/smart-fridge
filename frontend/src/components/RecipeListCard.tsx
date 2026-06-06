import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Flame } from 'lucide-react';
import MeituanCard from './ui/MeituanCard';
import type { RecommendationItem } from '../types/api';
import type { RecipeQuadrantTab } from '../utils/recipeQuadrant';
import { resolveRecipeImageUrl } from '../utils/recipeImage';
import {
  estimateCalories,
  getDeliveryStatus,
  getIngredientStatusText,
  getMatchPercent,
  getPrimaryAction,
  getRecipeCategoryTag,
  getRecipeTasteTag,
} from '../utils/recipeCardHelpers';

interface RecipeListCardProps {
  recipe: RecommendationItem;
  quadrant: RecipeQuadrantTab;
  onSelect?: (recipe: RecommendationItem) => void;
  onTakeoutClick?: (recipe: RecommendationItem) => void;
  onPremadeClick?: (recipe: RecommendationItem) => void;
  takeoutLoading?: boolean;
  selectDisabled?: boolean;
}

const RecipeListCard = ({
  recipe,
  quadrant,
  onSelect,
  onTakeoutClick,
  onPremadeClick,
  takeoutLoading,
  selectDisabled,
}: RecipeListCardProps) => {
  const matchPercent = getMatchPercent(recipe);
  const calories = estimateCalories(recipe);
  const categoryTag = getRecipeCategoryTag(recipe.name);
  const tasteTag = getRecipeTasteTag(recipe);
  const ingredientStatus = getIngredientStatusText(recipe);
  const delivery = getDeliveryStatus(recipe, quadrant);
  const primaryAction = getPrimaryAction(recipe, quadrant);

  const isTakeoutStoreAction = quadrant === 'takeout_delivery' && Boolean(onTakeoutClick);
  const isPremadeAction = quadrant === 'premade_fresh' && Boolean(onPremadeClick);

  const handlePrimaryClick = () => {
    if (isTakeoutStoreAction) {
      onTakeoutClick?.(recipe);
      return;
    }
    if (isPremadeAction) {
      onPremadeClick?.(recipe);
      return;
    }
    if (primaryAction.external && primaryAction.href.startsWith('http')) {
      window.open(primaryAction.href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <MeituanCard className="!p-0 overflow-hidden border border-[#f0f0f0]">
      <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
        {/* 菜品图 */}
        <img
          src={resolveRecipeImageUrl(recipe.image_url, recipe.name, { width: 120, height: 90 })}
          alt={recipe.name}
          className="h-[68px] w-[90px] shrink-0 rounded-xl object-cover"
        />

        {/* 菜谱信息 */}
        <div className="min-w-0 flex-1 sm:max-w-[180px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[15px] font-bold leading-tight text-mt-text">{recipe.name}</h3>
            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
              {categoryTag}
            </span>
            <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">
              {tasteTag}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-mt-text-secondary">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {recipe.cooking_time} 分钟
            </span>
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              {calories} kcal
            </span>
          </div>
        </div>

        {/* 食材匹配 */}
        <div className="shrink-0 sm:w-[140px] sm:text-center">
          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
            已匹配 {matchPercent}% 食材
          </span>
          <p className="mt-1 text-[11px] text-mt-text-muted">{ingredientStatus}</p>
        </div>

        {/* 配送/状态 */}
        <div className="shrink-0 sm:w-[155px]">
          {delivery.type === 'ready' ? (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              {delivery.label}
            </div>
          ) : (
            <div className="flex items-start gap-1.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mt-yellow text-[10px]">
                🐻
              </span>
              <p className="text-[11px] leading-snug text-mt-text-secondary">
                <span className="font-medium text-mt-orange">{delivery.label}：</span>
                {delivery.detail}
              </p>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex shrink-0 gap-2 sm:w-auto">
          <Link
            to={`/recipes/${recipe.recipe_id}`}
            className="whitespace-nowrap rounded-lg border border-mt-border bg-white px-3 py-2 text-center text-xs font-medium text-mt-text transition-colors hover:bg-mt-gray-50"
          >
            查看做法
          </Link>
          {isTakeoutStoreAction || isPremadeAction || primaryAction.external ? (
            <button
              type="button"
              onClick={handlePrimaryClick}
              disabled={isTakeoutStoreAction && takeoutLoading}
              className="whitespace-nowrap rounded-lg bg-mt-yellow px-3 py-2 text-xs font-bold text-mt-text transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isTakeoutStoreAction && takeoutLoading ? '加载中...' : primaryAction.label}
            </button>
          ) : (
            <Link
              to={primaryAction.href}
              className="whitespace-nowrap rounded-lg bg-mt-yellow px-3 py-2 text-xs font-bold text-mt-text transition-opacity hover:opacity-90"
            >
              {primaryAction.label}
            </Link>
          )}
        </div>
      </div>

      {onSelect && (
        <div className="border-t border-mt-border/50 px-4 py-2">
          <button
            type="button"
            onClick={() => onSelect(recipe)}
            disabled={selectDisabled}
            className="text-[11px] font-medium text-mt-text-secondary transition-colors hover:text-mt-orange disabled:opacity-50"
          >
            选它 · 集卡
          </button>
        </div>
      )}
    </MeituanCard>
  );
};

export default RecipeListCard;
