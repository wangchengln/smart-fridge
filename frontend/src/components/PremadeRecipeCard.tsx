import { Link } from 'react-router-dom';
import { ExternalLink, Store } from 'lucide-react';
import MeituanCard from './ui/MeituanCard';
import RecommendationCostMetrics from './RecommendationCostMetrics';
import type { RecommendationItem } from '../types/api';
import { resolveRecipeImageUrl } from '../utils/recipeImage';

interface PremadeRecipeCardProps {
  recipe: RecommendationItem;
  onSelect?: (recipe: RecommendationItem) => void;
  onPremadeClick?: (recipe: RecommendationItem) => void;
  selectDisabled?: boolean;
}

const PremadeRecipeCard = ({
  recipe,
  onSelect,
  onPremadeClick,
  selectDisabled,
}: PremadeRecipeCardProps) => {
  const analysis = recipe.premade_analysis;

  const openChannel = (url?: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleBuyClick = () => {
    if (onPremadeClick) {
      onPremadeClick(recipe);
      return;
    }
    openChannel(analysis?.order_url);
  };

  return (
    <MeituanCard className="!p-0 overflow-hidden border border-teal-100">
      <div className="flex gap-0">
        <img
          src={resolveRecipeImageUrl(recipe.image_url, recipe.name, {
            width: 120,
            height: 120,
          })}
          alt={recipe.name}
          className="h-32 w-28 shrink-0 object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-mt-text line-clamp-1">{recipe.name}</h3>
            <span className="shrink-0 rounded-full bg-teal-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              {recipe.quadrant_label ?? '新鲜预制'}
            </span>
          </div>

          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-mt-text-secondary">
            {analysis?.recommendation_tip ?? recipe.recommendation_reason}
          </p>

          <RecommendationCostMetrics metrics={recipe.cost_metrics} compact />

          <div className="mt-2 flex flex-wrap gap-1">
            <span className="mt-tag-green">
              利用率 {(recipe.existing_ingredients_ratio * 100).toFixed(0)}%
            </span>
            {recipe.missing_ingredients_count > 0 && (
              <span className="mt-tag-yellow">缺{recipe.missing_ingredients_count}样</span>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleBuyClick}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-teal-500 py-2 text-xs font-semibold text-white"
            >
              <Store className="h-3.5 w-3.5" />
              买鲜食
              <ExternalLink className="h-3 w-3 opacity-80" />
            </button>
            <Link
              to={`/recipes/${recipe.recipe_id}`}
              className="flex items-center justify-center rounded-lg border border-mt-border px-3 py-2 text-xs font-medium text-mt-text"
            >
              详情
            </Link>
          </div>

          {analysis?.channels && analysis.channels.length > 1 && (
            <div className="mt-2 flex gap-2">
              {analysis.channels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => openChannel(channel.order_url)}
                  className="flex-1 rounded-lg border border-dashed border-teal-200 py-1.5 text-[11px] text-teal-700"
                >
                  {channel.name}
                </button>
              ))}
            </div>
          )}

          {onSelect && (
            <button
              type="button"
              onClick={() => onSelect(recipe)}
              disabled={selectDisabled}
              className="mt-2 rounded-lg bg-mt-yellow py-1.5 text-[11px] font-semibold text-mt-text disabled:opacity-50"
            >
              选它 · 集卡
            </button>
          )}
        </div>
      </div>
    </MeituanCard>
  );
};

export default PremadeRecipeCard;
