import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike, Check, ChevronRight, Circle, Star, Ticket } from 'lucide-react';
import type { RecommendationItem } from '../types/api';
import { resolveRecipeImageUrl } from '../utils/recipeImage';
import { homeMealModeToRecipesPath } from '../utils/recipeQuadrant';

interface AiRecommendationCarouselProps {
  recipes: RecommendationItem[];
  displayName?: string;
  title?: string;
  subtitle?: string;
}

const CARD_GAP_PX = 12;
const CARD_WIDTH_RATIO = 0.88;

const getModeLabel = (recipe: RecommendationItem): string => {
  const raw = recipe.cost_metrics?.quadrant_label ?? recipe.quadrant_label ?? '';
  if (raw.includes('自己做') || raw.includes('无需')) return '自己做';
  if (raw.includes('闪购') || raw.includes('补')) return '补一点做';
  if (recipe.recommendation_type === 'takeout_delivery' || recipe.recommendation_type === 'takeout_alternative') {
    return '直接点外卖';
  }
  if (recipe.recommendation_type === 'premade_fresh') return '买半成品';
  if (recipe.missing_ingredients_count === 0) return '自己做';
  return '补一点做';
};

const getDeliveryMinutes = (recipe: RecommendationItem): number | null => {
  const takeoutEta = recipe.takeout_analysis?.delivery_time_minutes;
  if (takeoutEta != null) return takeoutEta;
  const premadeEta = recipe.premade_analysis?.delivery_time_minutes;
  if (premadeEta != null) return premadeEta;
  return recipe.cost_metrics?.time_cost_minutes ?? recipe.cooking_time ?? null;
};

const getPrimaryAction = (recipe: RecommendationItem): { label: string; path: string } => {
  const mode = getModeLabel(recipe);
  if (mode === '直接点外卖') {
    return { label: '点外卖', path: homeMealModeToRecipesPath('takeout') };
  }
  if (mode === '买半成品') {
    return { label: '买鲜食', path: homeMealModeToRecipesPath('premade') };
  }
  if (recipe.missing_ingredients_count > 0) {
    return { label: '去补货', path: homeMealModeToRecipesPath('flash_purchase') };
  }
  return { label: '看菜谱', path: homeMealModeToRecipesPath('cook_self') };
};

const getIngredientHints = (recipe: RecommendationItem) => {
  const missing = recipe.missing_ingredients_count;
  const ratio = recipe.existing_ingredients_ratio;
  const ownedCount = Math.max(0, Math.round(ratio * 10));
  return {
    ownedLabel: missing === 0 ? '食材齐全' : `已有 ${ownedCount} 样`,
    missingLabel: missing > 0 ? `还缺 ${missing} 样` : '无需补购',
    hasMissing: missing > 0,
  };
};

const AiRecommendationCarousel = ({
  recipes,
  title = 'AI 今日推荐',
  subtitle = '根据冰箱库存与美团供给，为你精选今日菜谱',
}: AiRecommendationCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);

  const measureCardWidth = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;
    const width = container.clientWidth;
    if (width > 0) {
      setCardWidth(Math.round(width * CARD_WIDTH_RATIO));
    }
  }, []);

  const setScrollContainer = useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      measureCardWidth(node);
    },
    [measureCardWidth]
  );

  const getStride = useCallback(() => {
    if (cardWidth > 0) return cardWidth + CARD_GAP_PX;
    const container = scrollRef.current;
    if (!container) return 0;
    return Math.round(container.clientWidth * CARD_WIDTH_RATIO) + CARD_GAP_PX;
  }, [cardWidth]);

  const snapToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const container = scrollRef.current;
      const stride = getStride();
      if (!container || stride <= 0) return;
      const nextIndex = Math.min(Math.max(index, 0), recipes.length - 1);
      container.scrollTo({ left: nextIndex * stride, behavior });
      setActiveIndex(nextIndex);
    },
    [getStride, recipes.length]
  );

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    const stride = getStride();
    if (!container || stride <= 0 || recipes.length === 0) return;
    const index = Math.round(container.scrollLeft / stride);
    setActiveIndex(Math.min(Math.max(index, 0), recipes.length - 1));
  }, [getStride, recipes.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => measureCardWidth(container));
    observer.observe(container);
    return () => observer.disconnect();
  }, [measureCardWidth, recipes.length]);

  if (recipes.length === 0) {
    return (
      <section className="px-4 pb-6">
        <div className="mb-3">
          <h2 className="home-section-title">{title}</h2>
          <p className="mt-0.5 text-[11px] text-mt-text-muted">{subtitle}</p>
        </div>
        <Link
          to="/recipes"
          className="home-card flex items-center justify-center gap-2 py-12 text-sm text-mt-text-secondary"
        >
          去发现美味菜谱
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <section className="pb-6">
      <div className="mb-3 flex items-center justify-between px-4">
        <div>
          <h2 className="home-section-title">{title}</h2>
          <p className="mt-0.5 text-[11px] text-mt-text-muted">{subtitle}</p>
        </div>
        <Link to="/recipes" className="home-link-more">
          全部
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div
        ref={setScrollContainer}
        onScroll={handleScroll}
        className="w-full overflow-hidden pl-4 pr-4"
      >
        <div className="flex w-max gap-3">
          {recipes.map((recipe) => {
            const modeLabel = getModeLabel(recipe);
            const finalPrice = recipe.cost_metrics?.final_price;
            const deliveryMinutes = getDeliveryMinutes(recipe);
            const primaryAction = getPrimaryAction(recipe);
            const hints = getIngredientHints(recipe);

            return (
              <div
                key={recipe.recipe_id}
                className="shrink-0 snap-start min-w-[260px] sm:min-w-[300px]"
                style={cardWidth > 0 ? { width: cardWidth } : undefined}
              >
                <div className="home-card p-3.5">
                  <div className="flex gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={resolveRecipeImageUrl(recipe.image_url, recipe.name, {
                          width: 200,
                          height: 200,
                        })}
                        alt={recipe.name}
                        className="h-[88px] w-[88px] rounded-2xl object-cover shadow-sm ring-1 ring-black/[0.04]"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="line-clamp-1 text-sm font-bold text-mt-text">{recipe.name}</p>
                        <span className="rounded-md bg-mt-yellow/20 px-1.5 py-0.5 text-[9px] font-semibold text-mt-orange">
                          {modeLabel}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <Check className="h-3 w-3 shrink-0 text-[#22c55e]" />
                          <span className="text-mt-text-secondary">{hints.ownedLabel}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <Circle
                            className={`h-2.5 w-2.5 shrink-0 fill-current ${
                              hints.hasMissing ? 'text-[#f97316]' : 'text-[#22c55e]'
                            }`}
                          />
                          <span className={hints.hasMissing ? 'text-mt-orange' : 'text-emerald-600'}>
                            {hints.missingLabel}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-start gap-1 rounded-lg bg-[#fff9e6] px-2 py-1.5">
                        <Star className="mt-0.5 h-3 w-3 shrink-0 fill-mt-yellow text-mt-yellow" />
                        <p className="line-clamp-2 text-[10px] leading-relaxed text-mt-text-secondary">
                          {recipe.recommendation_reason || '综合成本与库存匹配推荐'}
                        </p>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                        {finalPrice != null && finalPrice > 0 && (
                          <span className="inline-flex items-center gap-0.5 font-bold text-mt-orange">
                            <Ticket className="h-3 w-3" />
                            用券后 ¥{Number(finalPrice).toFixed(1)}
                          </span>
                        )}
                        {deliveryMinutes != null && (
                          <span className="inline-flex items-center gap-0.5 text-mt-text-muted">
                            <Bike className="h-3 w-3 text-mt-yellow" />
                            {deliveryMinutes} 分钟
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Link
                      to={`/recipes/${recipe.recipe_id}`}
                      className="home-btn-ghost flex-1"
                    >
                      看菜谱
                    </Link>
                    <Link to={primaryAction.path} className="home-btn-primary flex-1">
                      {primaryAction.label}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {recipes.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {recipes.map((recipe, index) => (
            <button
              key={recipe.recipe_id}
              type="button"
              aria-label={`切换到第 ${index + 1} 个推荐`}
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={() => snapToIndex(index)}
              className={`rounded-full transition-all duration-300 ${
                index === activeIndex ? 'h-1.5 w-5 bg-mt-yellow' : 'h-1.5 w-1.5 bg-mt-border'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default AiRecommendationCarousel;
