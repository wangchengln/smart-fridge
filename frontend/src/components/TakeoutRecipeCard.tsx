import { Link } from 'react-router-dom';
import { Clock, ExternalLink, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import MeituanCard from './ui/MeituanCard';
import RecommendationCostMetrics from './RecommendationCostMetrics';
import type { RecommendationItem } from '../types/api';
import { resolveRecipeImageUrl } from '../utils/recipeImage';
import { formatTakeoutPrice, openTakeoutOrder } from '../utils/takeout';

interface TakeoutRecipeCardProps {
  recipe: RecommendationItem;
  onSelect?: (recipe: RecommendationItem) => void;
  selectDisabled?: boolean;
}

const TakeoutRecipeCard = ({ recipe, onSelect, selectDisabled }: TakeoutRecipeCardProps) => {
  const analysis = recipe.takeout_analysis;
  const missingPreview = (recipe.missing_ingredients_detail ?? [])
    .slice(0, 3)
    .map((item) => String(item.name ?? '未知食材'))
    .join('、');

  return (
    <MeituanCard className="!p-0 overflow-hidden border border-orange-100">
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
            {(analysis?.is_takeout_recommended || analysis?.intent_takeout) && (
              <span className="shrink-0 rounded-full bg-mt-orange px-2 py-0.5 text-[10px] font-semibold text-white">
                {analysis?.intent_takeout ? '不想做' : '推荐外卖'}
              </span>
            )}
          </div>

          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-mt-text-secondary">
            {analysis?.recommendation_tip ?? recipe.recommendation_reason}
          </p>

          <RecommendationCostMetrics metrics={recipe.cost_metrics} compact />

          {analysis && (
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-center">
              <div className="rounded-lg bg-orange-50 px-1 py-1.5">
                <p className="text-[10px] text-mt-text-muted">外卖同款</p>
                <p className="text-sm font-bold text-mt-orange">
                  {formatTakeoutPrice(analysis.estimated_takeout_price)}
                </p>
              </div>
              <div className="rounded-lg bg-rose-50 px-1 py-1.5">
                <p className="text-[10px] text-mt-text-muted">拼好饭约</p>
                <p className="text-sm font-bold text-rose-600">
                  {formatTakeoutPrice(analysis.ping_hao_fan_price ?? analysis.estimated_takeout_price * 0.72)}
                </p>
              </div>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-1">
            <span className="mt-tag-yellow">缺{recipe.missing_ingredients_count}样</span>
            <span className="mt-tag-green">
              利用率 {(recipe.existing_ingredients_ratio * 100).toFixed(0)}%
            </span>
            {analysis && analysis.savings_vs_purchase > 0 && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                比补购省 ¥{analysis.savings_vs_purchase.toFixed(0)}
              </span>
            )}
          </div>

          {missingPreview && (
            <p className="mt-1.5 line-clamp-1 text-[10px] text-mt-text-muted">
              主要缺：{missingPreview}
              {recipe.missing_ingredients_count > 3 ? ' 等' : ''}
            </p>
          )}

          {analysis?.channels && analysis.channels.length > 1 && (
            <div className="mt-2 flex gap-2">
              {analysis.channels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => window.open(channel.order_url, '_blank', 'noopener,noreferrer')}
                  className="flex-1 rounded-lg border border-orange-200 py-1.5 text-[11px] font-medium text-mt-orange"
                >
                  {channel.name}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => openTakeoutOrder(analysis, recipe.name)}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-mt-orange py-2 text-xs font-semibold text-white"
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              美团外卖
              <ExternalLink className="h-3 w-3 opacity-80" />
            </button>
            <Link
              to={`/recipes/${recipe.recipe_id}`}
              className="flex items-center justify-center rounded-lg border border-mt-border px-3 py-2 text-xs font-medium text-mt-text"
            >
              详情
            </Link>
          </div>

          <div className="mt-2 flex gap-2">
            <Link
              to={`/purchase/analyze?recipe_id=${recipe.recipe_id}&name=${encodeURIComponent(recipe.name)}`}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed border-mt-border py-1.5 text-[11px] text-mt-text-secondary"
            >
              <ShoppingBag className="h-3 w-3" />
              仍想自己做 · 补购分析
            </Link>
            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(recipe)}
                disabled={selectDisabled}
                className="rounded-lg bg-mt-yellow px-3 py-1.5 text-[11px] font-semibold text-mt-text disabled:opacity-50"
              >
                选它 · 集卡
              </button>
            )}
          </div>

          <p className="mt-2 flex items-center gap-1 text-[10px] text-mt-text-muted">
            <Clock className="h-3 w-3" />
            自己做需约{recipe.cooking_time}分钟 · 匹配度
            {(Number(recipe.match_score) * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </MeituanCard>
  );
};

export default TakeoutRecipeCard;
