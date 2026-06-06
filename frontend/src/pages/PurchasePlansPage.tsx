import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ShoppingCart,
  Star,
  Ticket,
  TrendingDown,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGeneratePurchasePlans, useSelectPurchasePlan } from '../hooks/queries/usePurchaseQueries';
import {
  loadPurchaseContext,
  savePurchaseContext,
  type PurchaseContext,
} from '../utils/purchaseContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import MeituanCard from '../components/ui/MeituanCard';
import type { PurchasePlan } from '../types/api';
import { getCouponTypeLabel } from '../utils/coupon';
import { getTierLabel, getTierStyle } from '../utils/purchasePlan';

type PlanType = 'standard' | 'economy';

const PurchasePlansPage = () => {
  const { userId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const generateMutation = useGeneratePurchasePlans();
  const selectPlanMutation = useSelectPurchasePlan();

  const purchaseContext = useMemo(() => {
    const stateContext = (location.state as { purchaseContext?: PurchaseContext } | null)
      ?.purchaseContext;
    if (stateContext?.missing_ingredients?.length) {
      savePurchaseContext(stateContext);
      return stateContext;
    }
    return loadPurchaseContext();
  }, [location.state]);

  useEffect(() => {
    const missingIngredients = purchaseContext?.missing_ingredients;
    if (!missingIngredients?.length) return;
    generateMutation.mutate({
      missing_ingredients: missingIngredients,
      user_id: userId ?? undefined,
      recipe_id: purchaseContext?.recipe_id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseContext?.recipe_id, purchaseContext?.missing_ingredients]);

  const standardPlan = generateMutation.data?.standard_plan;
  const economyPlan = generateMutation.data?.economy_plan;
  const comparison = generateMutation.data?.comparison;
  const priceComparison = generateMutation.data?.price_comparison;
  const availableCoupons = generateMutation.data?.available_coupons ?? [];

  const plans: Record<PlanType, PurchasePlan | undefined> = {
    standard: standardPlan,
    economy: economyPlan,
  };

  const hasPlanItems =
    (standardPlan?.items?.length ?? 0) > 0 || (economyPlan?.items?.length ?? 0) > 0;

  const handleSelectPlan = async (planType: PlanType) => {
    setSelectedPlan(planType);
    const plan = plans[planType];
    if (!plan || !userId || !purchaseContext?.recipe_id) return;
    try {
      await selectPlanMutation.mutateAsync({
        user_id: userId,
        recipe_id: purchaseContext.recipe_id,
        plan_type: planType,
        plan_details: {
          ...(plan as unknown as Record<string, unknown>),
          standard_total_price: standardPlan?.total_price ?? 0,
        },
      });
      sessionStorage.setItem(
        'selectedPurchasePlan',
        JSON.stringify({ planType, plan, userId })
      );
    } catch (err) {
      console.error('选择方案失败:', err);
    }
  };

  if (!purchaseContext?.missing_ingredients?.length) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="mb-2 text-mt-text-secondary">暂无补购分析数据</p>
        <p className="mb-4 text-xs text-mt-text-muted">请先在菜谱页选择需要补购的菜谱</p>
        <Link to="/recipes">
          <Button>去选菜谱</Button>
        </Link>
      </div>
    );
  }

  if (generateMutation.isPending) return <LoadingSpinner text="生成补购方案..." />;

  if (generateMutation.error || !hasPlanItems) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="mb-2 text-mt-text-secondary">方案生成失败</p>
        <p className="mb-4 text-xs text-mt-text-muted">
          {generateMutation.error instanceof Error
            ? generateMutation.error.message
            : '请稍后重试'}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              const missing = purchaseContext?.missing_ingredients;
              if (missing?.length) {
                generateMutation.mutate({
                  missing_ingredients: missing,
                  user_id: userId ?? undefined,
                  recipe_id: purchaseContext?.recipe_id,
                });
              }
            }}
          >
            重新生成
          </Button>
          <Button
            onClick={() =>
              navigate(
                `/purchase/analyze?recipe_id=${purchaseContext.recipe_id}&name=${encodeURIComponent(purchaseContext.recipe_name)}`
              )
            }
          >
            返回分析
          </Button>
        </div>
      </div>
    );
  }

  const recommendedPlan = comparison?.recommendation as PlanType | undefined;

  const renderPlanCard = (planType: PlanType) => {
    const plan = plans[planType];
    if (!plan?.items?.length) return null;
    const isSelected = selectedPlan === planType;
    const isStandard = planType === 'standard';
    const isRecommended = recommendedPlan === planType;

    return (
      <MeituanCard
        className={`relative !p-4 transition-all ${
          isSelected
            ? isStandard
              ? 'ring-2 ring-mt-yellow'
              : 'ring-2 ring-emerald-400'
            : isRecommended
              ? 'ring-1 ring-mt-orange/40'
              : ''
        }`}
      >
        {isSelected && (
          <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-mt-yellow">
            <Check className="h-3.5 w-3.5 text-mt-text" />
          </div>
        )}
        {isRecommended && !isSelected && (
          <div className="absolute -right-1 -top-1 rounded-full bg-mt-orange px-2 py-0.5 text-[10px] font-semibold text-white">
            推荐
          </div>
        )}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {isStandard ? (
              <Zap className="h-5 w-5 text-mt-orange" />
            ) : (
              <TrendingDown className="h-5 w-5 text-emerald-500" />
            )}
            <div>
              <h3 className="font-bold text-mt-text">{plan.plan_name}</h3>
              {plan.avg_quality_score != null && (
                <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-mt-text-secondary">
                  <Star className="h-3 w-3 fill-mt-yellow text-mt-yellow" />
                  品质 {Number(plan.avg_quality_score).toFixed(1)}
                </p>
              )}
            </div>
          </div>
        </div>

        {plan.plan_description && (
          <p className="mb-2 text-[11px] leading-relaxed text-mt-text-secondary">
            {plan.plan_description}
          </p>
        )}

        {plan.strategy_tags && plan.strategy_tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {plan.strategy_tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  isStandard ? 'bg-orange-50 text-mt-orange' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mb-3 max-h-48 space-y-2.5 overflow-y-auto">
          {plan.items.map((item, index) => (
            <div key={`${item.ingredient_id}-${index}`} className="text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-mt-text">
                    {item.product_name || item.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-mt-text-muted">
                    需 {item.quantity}
                    {item.unit || 'g'}
                    {item.spec ? ` · ${item.spec}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium text-mt-red">¥{Number(item.price).toFixed(2)}</p>
                  {!isStandard && item.savings_vs_standard != null && item.savings_vs_standard > 0 && (
                    <p className="text-[10px] text-emerald-600">
                      省¥{Number(item.savings_vs_standard).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                {item.tier && (
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getTierStyle(item.tier)}`}>
                    {getTierLabel(item.tier)}
                  </span>
                )}
                {item.rating != null && (
                  <span className="text-[10px] text-mt-text-muted">
                    {Number(item.rating).toFixed(1)}分
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-mt-border pt-3 space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-mt-text-secondary">商品合计</span>
            <span className="text-sm text-mt-text">
              ¥{Number(plan.total_price).toFixed(2)}
            </span>
          </div>
          {plan.matched_coupons && plan.matched_coupons.length > 0 && (
            <div className="space-y-1">
              {plan.matched_coupons.slice(0, 2).map((coupon) => (
                <div
                  key={coupon.user_coupon_id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-1 text-mt-orange">
                    <Ticket className="h-3 w-3" />
                    {getCouponTypeLabel(coupon.coupon_type)} · {coupon.name}
                    {coupon.is_best && (
                      <span className="rounded bg-mt-yellow px-1 text-[10px] text-mt-text">
                        最优
                      </span>
                    )}
                  </span>
                  <span className="text-emerald-600">-¥{Number(coupon.discount_amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-mt-text">券后到手</span>
            <span className="text-xl font-bold text-mt-red">
              ¥{Number(plan.final_price ?? plan.total_price).toFixed(2)}
            </span>
          </div>
        </div>

        <Button
          fullWidth
          className="mt-3"
          variant={isSelected ? (isStandard ? 'primary' : 'secondary') : 'outline'}
          onClick={() => handleSelectPlan(planType)}
          disabled={selectPlanMutation.isPending}
        >
          {isSelected ? '已选择' : `选择${isStandard ? '标准版' : '省钱版'}`}
        </Button>
      </MeituanCard>
    );
  };

  return (
    <div className="animate-fade-in space-y-4">
      {purchaseContext.recipe_name && (
        <p className="text-sm text-mt-text-secondary">
          为「<span className="font-medium text-mt-text">{purchaseContext.recipe_name}</span>」推荐
        </p>
      )}

      {priceComparison && (
        <MeituanCard className="!p-4 border border-orange-100">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-mt-text">
            <UtensilsCrossed className="h-4 w-4 text-mt-orange" />
            到手价对比
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`rounded-xl p-3 ${
                priceComparison.recommended === 'cook_self'
                  ? 'bg-emerald-50 ring-1 ring-emerald-200'
                  : 'bg-mt-gray-50'
              }`}
            >
              <p className="text-xs text-mt-text-muted">自己买+做</p>
              <p className="mt-1 text-lg font-bold text-mt-text">
                ¥{Number(priceComparison.cook_self.final_price).toFixed(2)}
              </p>
              <p className="mt-1 text-[10px] text-mt-text-secondary">
                食材¥{Number(priceComparison.cook_self.subtotal).toFixed(0)}
                {priceComparison.cook_self.coupon_discount > 0 &&
                  ` · 闪购券-¥${Number(priceComparison.cook_self.coupon_discount).toFixed(0)}`}
              </p>
              {priceComparison.recommended === 'cook_self' && (
                <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  更划算
                </span>
              )}
            </div>
            <div
              className={`rounded-xl p-3 ${
                priceComparison.recommended === 'takeout'
                  ? 'bg-orange-50 ring-1 ring-orange-200'
                  : 'bg-mt-gray-50'
              }`}
            >
              <p className="text-xs text-mt-text-muted">外卖+券后价</p>
              <p className="mt-1 text-lg font-bold text-mt-orange">
                ¥{Number(priceComparison.takeout.final_price).toFixed(2)}
              </p>
              <p className="mt-1 text-[10px] text-mt-text-secondary">
                餐费¥{Number(priceComparison.takeout.subtotal).toFixed(0)}
                {priceComparison.takeout.delivery_fee > 0 &&
                  ` · 配送¥${Number(priceComparison.takeout.delivery_fee).toFixed(0)}`}
                {priceComparison.takeout.coupon_discount > 0 &&
                  ` · 券-¥${Number(priceComparison.takeout.coupon_discount).toFixed(0)}`}
              </p>
              {priceComparison.recommended === 'takeout' && (
                <span className="mt-1 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                  更省事
                </span>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-mt-text-secondary">
            {priceComparison.savings_tip}
          </p>
        </MeituanCard>
      )}

      {availableCoupons.length > 0 && (
        <MeituanCard className="!p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-mt-text">
            <Ticket className="h-4 w-4 text-mt-red" />
            可用神券 ({availableCoupons.length})
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {availableCoupons.map((coupon) => (
              <div
                key={coupon.user_coupon_id}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs ${
                  coupon.is_applicable
                    ? 'bg-gradient-to-r from-red-50 to-orange-50 text-mt-orange'
                    : 'bg-mt-gray-50 text-mt-text-muted'
                }`}
              >
                <p className="font-semibold">{getCouponTypeLabel(coupon.coupon_type)}</p>
                <p className="mt-0.5">{coupon.name}</p>
                {coupon.is_applicable && coupon.estimated_discount != null && (
                  <p className="mt-0.5 text-emerald-600">可减¥{Number(coupon.estimated_discount).toFixed(0)}</p>
                )}
              </div>
            ))}
          </div>
        </MeituanCard>
      )}

      {comparison && (
        <MeituanCard className="!p-4 bg-gradient-to-r from-mt-yellow-light to-orange-50">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-base font-bold text-mt-text">
                ¥{Number(comparison.standard_final_price ?? standardPlan?.final_price ?? standardPlan?.total_price ?? 0).toFixed(2)}
              </p>
              <p className="text-[10px] text-mt-text-secondary">标准版券后</p>
            </div>
            <div>
              <p className="text-base font-bold text-emerald-600">
                ¥{Number(comparison.economy_final_price ?? economyPlan?.final_price ?? economyPlan?.total_price ?? 0).toFixed(2)}
              </p>
              <p className="text-[10px] text-mt-text-secondary">省钱版券后</p>
            </div>
            <div>
              <p className="text-base font-bold text-mt-orange">
                ¥{Number(comparison.final_price_difference ?? comparison.price_difference ?? 0).toFixed(2)}
              </p>
              <p className="text-[10px] text-mt-text-secondary">最多可省</p>
            </div>
            <div>
              <p className="text-base font-bold text-purple-600">
                {comparison.different_item_count ?? 0}项
              </p>
              <p className="text-[10px] text-mt-text-secondary">换了SKU</p>
            </div>
          </div>
          {comparison.recommendation_reason && (
            <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs leading-relaxed text-mt-text">
              {comparison.recommendation_reason}
            </p>
          )}
          {comparison.quality_difference != null && comparison.quality_difference > 0 && (
            <p className="mt-2 text-center text-[10px] text-mt-text-secondary">
              标准版品质高 {comparison.quality_difference} 分 · 省钱版省 {comparison.savings_percentage}%
            </p>
          )}
        </MeituanCard>
      )}

      {comparison?.item_diffs && comparison.item_diffs.some((d) => !d.same_product) && (
        <MeituanCard className="!p-4">
          <h3 className="mb-3 text-sm font-bold text-mt-text">同款食材 · 不同选品</h3>
          <div className="space-y-3">
            {comparison.item_diffs
              .filter((diff) => !diff.same_product)
              .map((diff) => (
                <div
                  key={diff.ingredient_name}
                  className="rounded-xl border border-mt-border bg-mt-gray-50 p-3"
                >
                  <p className="mb-2 text-xs font-semibold text-mt-text">{diff.ingredient_name}</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-white p-2">
                      <p className="text-[10px] text-mt-orange">标准版</p>
                      <p className="mt-0.5 line-clamp-2 font-medium text-mt-text">
                        {diff.standard_product}
                      </p>
                      <p className="mt-1 text-mt-red">¥{diff.standard_price.toFixed(2)}</p>
                      {diff.standard_tier && (
                        <span className={`mt-1 inline-block rounded px-1 text-[10px] ${getTierStyle(diff.standard_tier)}`}>
                          {getTierLabel(diff.standard_tier)}
                        </span>
                      )}
                    </div>
                    <div className="rounded-lg bg-white p-2">
                      <p className="text-[10px] text-emerald-600">省钱版</p>
                      <p className="mt-0.5 line-clamp-2 font-medium text-mt-text">
                        {diff.economy_product}
                      </p>
                      <p className="mt-1 text-emerald-700">¥{diff.economy_price.toFixed(2)}</p>
                      {diff.economy_tier && (
                        <span className={`mt-1 inline-block rounded px-1 text-[10px] ${getTierStyle(diff.economy_tier)}`}>
                          {getTierLabel(diff.economy_tier)}
                        </span>
                      )}
                    </div>
                  </div>
                  {diff.price_diff > 0 && (
                    <p className="mt-2 text-center text-[10px] font-medium text-emerald-600">
                      此项省 ¥{diff.price_diff.toFixed(2)}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </MeituanCard>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {renderPlanCard('standard')}
        {renderPlanCard('economy')}
      </div>

      {selectedPlan && (
        <div className="sticky bottom-20 flex gap-3 md:bottom-4">
          <Link
            to={`/purchase/analyze?recipe_id=${purchaseContext.recipe_id}&name=${encodeURIComponent(purchaseContext.recipe_name)}`}
            className="flex-1"
          >
            <Button variant="outline" fullWidth>
              重新分析
            </Button>
          </Link>
          <Button
            variant="secondary"
            fullWidth
            className="flex-1"
            onClick={() => {
              const plan = plans[selectedPlan];
              if (!plan?.items?.length) return;
              const cartItems = plan.items.map((item) => ({
                product_id: item.product_id || `plan-${item.ingredient_id}`,
                ingredient_id: item.ingredient_id,
                name: item.product_name || item.name,
                price: Number(item.price),
                original_price: Number(item.price) * 1.15,
                unit: item.unit || '份',
                spec: item.quantity ? `${item.quantity}${item.unit || 'g'}` : '1份',
                image_url: `https://photo.bj.ide.test.sankuai.com/?keyword=${encodeURIComponent(item.name)}&width=200&height=200`,
                source: 'meituan',
                rating: 4.5,
                match_score: 0.92,
                quantity: 1,
              }));
              sessionStorage.setItem('orderCart', JSON.stringify(cartItems));
              sessionStorage.setItem(
                'selectedPurchasePlan',
                JSON.stringify({ planType: selectedPlan, plan })
              );
              navigate('/purchase/products');
            }}
          >
            <ShoppingCart className="h-4 w-4" />
            去购买
          </Button>
        </div>
      )}
    </div>
  );
};

export default PurchasePlansPage;
