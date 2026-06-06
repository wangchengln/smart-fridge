import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ExternalLink, MapPin, Store, Wallet } from 'lucide-react';
import Button from '../components/ui/Button';
import MeituanCard from '../components/ui/MeituanCard';
import RecommendationCostMetrics from '../components/RecommendationCostMetrics';
import type { TakeoutChannel } from '../types/api';
import { resolveRecipeImageUrl } from '../utils/recipeImage';
import { loadPremadeContext } from '../utils/premadeContext';

const CHANNEL_META: Record<string, { emoji: string; desc: string; bg: string }> = {
  xiaoxiang: {
    emoji: '🐘',
    desc: '美团小象超市 · 新鲜预制菜直达',
    bg: 'from-emerald-400 to-teal-500',
  },
  convenience_flash: {
    emoji: '🏪',
    desc: '便利店闪电仓 · 即食即享',
    bg: 'from-violet-400 to-purple-500',
  },
};

const PremadeChannelPage = () => {
  const navigate = useNavigate();
  const premadeContext = useMemo(() => loadPremadeContext(), []);
  const recipe = premadeContext?.focusRecipe;
  const analysis = recipe?.premade_analysis;

  const channels: TakeoutChannel[] = useMemo(() => {
    if (!analysis) return [];
    if (analysis.channels?.length) return analysis.channels;
    if (analysis.order_url) {
      return [
        {
          id: analysis.platform || 'default',
          name: analysis.channel_name || '新鲜预制',
          order_url: analysis.order_url,
        },
      ];
    }
    return [];
  }, [analysis]);

  const openOrderUrl = (url?: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!premadeContext || !recipe || !analysis) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="mb-2 text-mt-text-secondary">暂无买鲜食数据</p>
        <p className="mb-4 text-xs text-mt-text-muted">
          请先在菜谱页「新鲜预制」中点击「买鲜食」，将通过后端推荐接口加载渠道信息
        </p>
        <Link to="/recipes?intent=premade&tab=premade_fresh">
          <Button>返回菜谱推荐</Button>
        </Link>
      </div>
    );
  }

  const price = analysis.final_price ?? analysis.estimated_premade_price;
  const priceLabel = analysis.final_price_label ?? '用神券后实付';

  return (
    <div className="-mx-4 animate-fade-in pb-28">
      <div className="sticky top-0 z-30 bg-white px-3 pb-2 pt-2 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mt-gray-50"
          >
            <ArrowLeft className="h-4 w-4 text-mt-text" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-mt-text">买鲜食 · {recipe.name}</p>
            <p className="truncate text-[11px] text-mt-text-muted">
              {analysis.search_keyword || recipe.name}
            </p>
          </div>
        </div>
      </div>

      <div className="relative h-44 bg-gradient-to-br from-violet-100 to-purple-50">
        <img
          src={resolveRecipeImageUrl(recipe.image_url, recipe.name, { width: 400, height: 200 })}
          alt={recipe.name}
          className="h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <span className="rounded-full bg-violet-500/90 px-2 py-0.5 text-[10px] font-semibold">
            新鲜预制同款
          </span>
          <h1 className="mt-1 text-lg font-bold">{recipe.name}</h1>
        </div>
      </div>

      <div className="bg-violet-50 px-4 py-2.5 text-xs leading-relaxed text-violet-800">
        {premadeContext.recommendation_tip || analysis.recommendation_tip}
      </div>

      <div className="space-y-3 px-4 py-4">
        <MeituanCard className="!p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-mt-text-muted">预估到手价</p>
              <p className="text-2xl font-black text-mt-orange">
                ¥{Number(price).toFixed(0)}
                <span className="ml-1 text-xs font-normal text-mt-text-muted">起</span>
              </p>
              <p className="mt-0.5 text-[11px] text-mt-text-secondary">{priceLabel}</p>
            </div>
            <div className="text-right">
              <p className="inline-flex items-center gap-1 text-xs text-mt-text-secondary">
                <Clock className="h-3.5 w-3.5" />
                {analysis.delivery_time_minutes} 分钟达
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-mt-text-muted">
                <MapPin className="h-3 w-3 text-mt-orange" />
                附近可配送
              </p>
            </div>
          </div>
          <RecommendationCostMetrics metrics={recipe.cost_metrics} compact />
        </MeituanCard>

        <div>
          <p className="mb-2 text-sm font-bold text-mt-text">选择购买渠道</p>
          <div className="space-y-2.5">
            {channels.map((channel) => {
              const meta = CHANNEL_META[channel.id] ?? {
                emoji: '🛒',
                desc: '美团生态新鲜预制',
                bg: 'from-orange-400 to-amber-500',
              };

              return (
                <MeituanCard key={channel.id} className="!p-0 overflow-hidden">
                  <div className="flex items-center gap-3 p-3.5">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.bg} text-xl shadow-sm`}
                    >
                      {meta.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-mt-text">{channel.name}</p>
                      <p className="mt-0.5 text-[11px] text-mt-text-muted">{meta.desc}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-mt-orange">
                        <Wallet className="h-3 w-3" />
                        约 ¥{Number(price).toFixed(0)} · {analysis.delivery_time_minutes}分钟达
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openOrderUrl(channel.order_url)}
                      className="flex shrink-0 items-center gap-1 rounded-xl bg-violet-500 px-3 py-2 text-xs font-bold text-white"
                    >
                      <Store className="h-3.5 w-3.5" />
                      前往下单
                      <ExternalLink className="h-3 w-3 opacity-80" />
                    </button>
                  </div>
                </MeituanCard>
              );
            })}
          </div>
        </div>

        <MeituanCard className="!p-3 border border-dashed border-violet-200 bg-violet-50/50">
          <p className="text-[11px] leading-relaxed text-mt-text-secondary">
            以上渠道与价格来自后端推荐接口的{' '}
            <span className="font-medium text-violet-700">premade_analysis</span>{' '}
            字段。点击「前往下单」将跳转美团完成购买（展示界面，暂不接支付）。
          </p>
        </MeituanCard>

        <Link
          to={`/recipes/${recipe.recipe_id}`}
          className="block rounded-xl border border-mt-border bg-white py-3 text-center text-sm font-medium text-mt-text"
        >
          查看完整菜谱做法
        </Link>
      </div>
    </div>
  );
};

export default PremadeChannelPage;
