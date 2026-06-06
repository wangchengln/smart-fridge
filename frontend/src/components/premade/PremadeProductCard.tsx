import { Clock, ExternalLink, Store } from 'lucide-react';
import type { RecommendationItem } from '../../types/api';
import { resolveRecipeImageUrl } from '../../utils/recipeImage';

interface PremadeProductCardProps {
  recipe: RecommendationItem;
  onBuyClick?: (recipe: RecommendationItem) => void;
}

const PremadeProductCard = ({ recipe, onBuyClick }: PremadeProductCardProps) => {
  const analysis = recipe.premade_analysis;
  const price = analysis?.final_price ?? analysis?.estimated_premade_price;
  const minutes = analysis?.delivery_time_minutes ?? 28;

  return (
    <button
      type="button"
      onClick={() => onBuyClick?.(recipe)}
      className="flex w-full gap-3 border-b border-mt-border/60 px-4 py-3 text-left transition-colors active:bg-violet-50/50"
    >
      <img
        src={resolveRecipeImageUrl(recipe.image_url, recipe.name, { width: 100, height: 100 })}
        alt={recipe.name}
        className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-bold text-mt-text">{recipe.name}</h3>
          <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
            {analysis?.channel_name ?? '新鲜预制'}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-mt-text-muted">
          {analysis?.recommendation_tip ?? recipe.recommendation_reason}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            {price != null && (
              <span className="font-bold text-mt-orange">
                ¥{Number(price).toFixed(0)}
                <span className="ml-0.5 text-[10px] font-normal text-mt-text-muted">起</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-mt-text-secondary">
              <Clock className="h-3 w-3" />
              {minutes}分钟达
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-violet-500 px-2.5 py-1 text-[11px] font-semibold text-white">
            <Store className="h-3 w-3" />
            买鲜食
            <ExternalLink className="h-2.5 w-2.5 opacity-80" />
          </span>
        </div>
      </div>
    </button>
  );
};

export default PremadeProductCard;
