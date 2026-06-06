import { useState } from 'react';
import {
  ChefHat,
  CalendarDays,
  Users,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  Loader2,
  Refrigerator,
  Search,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserInfo } from '../hooks/queries/useUserQueries';
import {
  useCookShopBundle,
  useWeekendRestockBundle,
  useHomeGatheringBundle,
  useCreateBundleOrder,
  useScenarioPreview,
} from '../hooks/queries/useScenarioQueries';
import Button from '../components/ui/Button';
import MeituanCard from '../components/ui/MeituanCard';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { ScenarioBundleResponse, ScenarioType } from '../types/api';

interface ScenarioConfig {
  id: ScenarioType;
  title: string;
  subtitle: string;
  description: string;
  delivery: string;
  icon: typeof ChefHat;
  gradient: string;
  flowStep: string;
}

const SCENARIOS: ScenarioConfig[] = [
  {
    id: 'cook_shop',
    title: '买菜做饭',
    subtitle: '临期入菜',
    description: '优先消耗临期食材，缺什么闪购补齐',
    delivery: '30 分钟闪购',
    icon: ChefHat,
    gradient: 'from-orange-400 to-red-400',
    flowStep: '菜谱匹配',
  },
  {
    id: 'weekend_restock',
    title: '周末补货',
    subtitle: '周常清单',
    description: '按家庭人数补周常食材，避免重复囤货',
    delivery: '小象定时达',
    icon: CalendarDays,
    gradient: 'from-emerald-400 to-teal-500',
    flowStep: '周用量计算',
  },
  {
    id: 'home_gathering',
    title: '居家聚会',
    subtitle: '缺口补齐',
    description: '朋友来访？盘点缺口，组合购一次到齐',
    delivery: '闪购组合购',
    icon: Users,
    gradient: 'from-purple-400 to-indigo-500',
    flowStep: '聚会模板',
  },
];

const urgencyStyles = {
  high: 'bg-red-50 text-red-600 border-red-100',
  medium: 'bg-amber-50 text-amber-700 border-amber-100',
  low: 'bg-mt-gray-50 text-mt-text-secondary border-mt-gray-100',
};

const CoverageBar = ({ rate }: { rate: number }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-mt-text-secondary">冰箱覆盖率</span>
      <span className="font-semibold text-emerald-600">{Math.round(rate * 100)}%</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-mt-gray-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
        style={{ width: `${Math.round(rate * 100)}%` }}
      />
    </div>
  </div>
);

const ScenarioBundlesPage = () => {
  const { userId } = useAuth();
  const { data: userInfo } = useUserInfo(userId);
  const { data: preview, isLoading: previewLoading } = useScenarioPreview(userId);
  const cookShopMutation = useCookShopBundle();
  const weekendMutation = useWeekendRestockBundle();
  const gatheringMutation = useHomeGatheringBundle();
  const orderMutation = useCreateBundleOrder();

  const [activeScenario, setActiveScenario] = useState<ScenarioType | null>(null);
  const [bundleResult, setBundleResult] = useState<ScenarioBundleResponse | null>(null);
  const [guestCount, setGuestCount] = useState(6);
  const [eventType, setEventType] = useState<'hotpot' | 'bbq'>('hotpot');
  const [errorMsg, setErrorMsg] = useState('');

  const isGenerating =
    cookShopMutation.isPending ||
    weekendMutation.isPending ||
    gatheringMutation.isPending;

  const getSuggestionFor = (scenarioId: ScenarioType) =>
    preview?.scenarios.find((s) => s.scenario === scenarioId);

  const handleGenerate = async (scenario: ScenarioType) => {
    if (!userId) return;
    setActiveScenario(scenario);
    setErrorMsg('');
    setBundleResult(null);

    try {
      let result: ScenarioBundleResponse;
      if (scenario === 'cook_shop') {
        result = await cookShopMutation.mutateAsync({ user_id: userId });
      } else if (scenario === 'weekend_restock') {
        result = await weekendMutation.mutateAsync({
          user_id: userId,
          family_count: userInfo?.family_count,
        });
      } else {
        result = await gatheringMutation.mutateAsync({
          user_id: userId,
          event_type: eventType,
          guest_count: guestCount,
        });
      }
      setBundleResult(result);
    } catch {
      setErrorMsg('生成失败：请确认冰箱有库存数据，或该场景暂无需补齐');
    }
  };

  const handleOrderBundle = async () => {
    if (!userId || !bundleResult) return;
    const { bundle, scenario } = bundleResult;
    try {
      const order = await orderMutation.mutateAsync({
        bundle_id: bundle.bundle_id,
        bundle_sku_id: bundle.bundle_sku_id,
        user_id: userId,
        scenario,
        total_amount: bundle.final_price,
        item_count: bundle.item_count,
        redirect_channel: bundle.redirect_channel,
        redirect_label: bundle.redirect_label,
      });
      alert(
        `下单成功！\n${order.redirect_label} 即将配送\n订单号: ${order.order_id}`
      );
    } catch {
      alert('下单失败，请稍后重试');
    }
  };

  return (
    <div className="animate-fade-in space-y-4 pb-24">
      <PageHeader title="智能场景购" backTo="/" />

      {/* 核心价值：先查库存再闪购 */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <Refrigerator className="h-5 w-5 text-mt-yellow" />
          <p className="text-sm font-semibold">云冰箱 · 先查库存，再闪购补齐</p>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-white/70">
          对标千问闪购「说一句话就送到」— 我们的差异是：先盘点你冰箱有什么，只买缺口、不重复囤货
        </p>
        <div className="flex items-center justify-between gap-1">
          {[
            { icon: Search, label: '查库存' },
            { icon: ArrowRight, label: '', isArrow: true },
            { icon: Lightbulb, label: '算缺口' },
            { icon: ArrowRight, label: '', isArrow: true },
            { icon: Zap, label: '闪购补齐' },
          ].map((step, idx) => {
            if (step.isArrow) {
              return (
                <ArrowRight key={idx} className="h-3 w-3 shrink-0 text-white/30" />
              );
            }
            const Icon = step.icon;
            return (
              <div key={idx} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="h-4 w-4 text-mt-yellow" />
                </div>
                <span className="text-[10px] text-white/80">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 冰箱洞察 */}
      {previewLoading ? (
        <MeituanCard className="flex justify-center py-6">
          <LoadingSpinner size="sm" />
        </MeituanCard>
      ) : preview ? (
        <MeituanCard className="border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white">
          <p className="text-sm font-bold text-mt-text">{preview.headline}</p>
          <p className="mt-0.5 text-xs text-mt-text-secondary">{preview.subheadline}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-mt-text">
              在库 {preview.fridge_total} 项
            </span>
            {preview.near_expiry_count > 0 && (
              <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                临期 {preview.near_expiry_count} 项
                {preview.near_expiry_items.length > 0 &&
                  ` · ${preview.near_expiry_items.slice(0, 2).join('、')}`}
              </span>
            )}
            {preview.suggested_scenario && (
              <span className="rounded-lg bg-mt-yellow/30 px-2.5 py-1 text-xs font-medium text-mt-text">
                推荐：{preview.suggested_scenario.scenario_label}
              </span>
            )}
          </div>
        </MeituanCard>
      ) : null}

      {/* 三大场景 */}
      <div className="space-y-3">
        {SCENARIOS.map((scenario) => {
          const Icon = scenario.icon;
          const isActive = activeScenario === scenario.id && isGenerating;
          const suggestion = getSuggestionFor(scenario.id);
          const isRecommended = preview?.suggested_scenario?.scenario === scenario.id;

          return (
            <MeituanCard
              key={scenario.id}
              className={`!p-0 overflow-hidden transition-shadow ${
                isRecommended ? 'ring-2 ring-mt-yellow/60 shadow-md' : ''
              }`}
            >
              <div className="p-4">
                {isRecommended && (
                  <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-mt-yellow px-2.5 py-0.5 text-[10px] font-semibold text-mt-text">
                    <Sparkles className="h-3 w-3" />
                    智能推荐
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${scenario.gradient}`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-mt-text">{scenario.title}</h3>
                      <span className="mt-tag-yellow text-[10px]">{scenario.subtitle}</span>
                      {suggestion?.badge && (
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                            urgencyStyles[suggestion.urgency]
                          }`}
                        >
                          {suggestion.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-mt-text-secondary">
                      {suggestion?.reason ?? scenario.description}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-mt-text-muted">
                      <span className="rounded bg-mt-gray-50 px-1.5 py-0.5">{scenario.flowStep}</span>
                      <span>→</span>
                      <span className="text-mt-orange">{scenario.delivery}</span>
                    </div>
                  </div>
                </div>

                {scenario.id === 'home_gathering' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-mt-gray-50 p-3">
                    <span className="text-xs text-mt-text-secondary">聚会类型</span>
                    {(['hotpot', 'bbq'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEventType(type)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                          eventType === type
                            ? 'bg-mt-yellow text-mt-text'
                            : 'bg-white text-mt-text-secondary'
                        }`}
                      >
                        {type === 'hotpot' ? '火锅' : '烧烤'}
                      </button>
                    ))}
                    <span className="ml-auto text-xs text-mt-text-secondary">人数</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setGuestCount((n) => Math.max(2, n - 1))}
                        className="h-7 w-7 rounded-lg bg-white text-sm font-bold text-mt-text"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{guestCount}</span>
                      <button
                        type="button"
                        onClick={() => setGuestCount((n) => Math.min(20, n + 1))}
                        className="h-7 w-7 rounded-lg bg-white text-sm font-bold text-mt-text"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {scenario.id === 'weekend_restock' && userInfo?.family_count && (
                  <p className="mt-2 text-xs text-mt-text-secondary">
                    按 {userInfo.family_count} 人家庭周用量计算
                  </p>
                )}

                <Button
                  className="mt-3"
                  fullWidth
                  onClick={() => handleGenerate(scenario.id)}
                  disabled={isGenerating}
                  variant={isRecommended ? 'primary' : 'secondary'}
                >
                  {isActive ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      盘点库存中...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Search className="h-4 w-4" />
                      查库存 · 生成补齐方案
                    </span>
                  )}
                </Button>
              </div>
            </MeituanCard>
          );
        })}
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-mt-red">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* 生成结果 */}
      {bundleResult && (
        <MeituanCard className="border-2 border-mt-yellow/50">
          <div className="mb-3">
            <span className="mt-tag-yellow">{bundleResult.scenario_label}</span>
            <h3 className="mt-1 text-base font-bold text-mt-text">
              {bundleResult.headline ?? bundleResult.bundle.bundle_name}
            </h3>
            <p className="mt-0.5 text-xs text-mt-text-secondary">{bundleResult.message}</p>
          </div>

          {bundleResult.fridge_coverage && (
            <div className="mb-3 rounded-xl bg-emerald-50/60 p-3">
              <CoverageBar rate={bundleResult.fridge_coverage.coverage_rate} />
              {bundleResult.stock_savings_hint && (
                <p className="mt-2 text-xs font-medium text-emerald-700">
                  {bundleResult.stock_savings_hint}
                </p>
              )}
            </div>
          )}

          {bundleResult.recommendation_reasons && bundleResult.recommendation_reasons.length > 0 && (
            <div className="mb-3 space-y-1.5">
              <p className="text-xs font-semibold text-mt-text-secondary">为什么推荐这个方案</p>
              {bundleResult.recommendation_reasons.map((reason) => (
                <div key={reason} className="flex items-start gap-2 text-xs text-mt-text">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {reason}
                </div>
              ))}
            </div>
          )}

          {bundleResult.recipe_name && (
            <div className="mb-3 rounded-xl bg-orange-50 px-3 py-2 text-xs text-mt-orange">
              推荐菜谱：
              <Link to={`/recipes/${bundleResult.recipe_id}`} className="font-medium underline">
                {bundleResult.recipe_name}
              </Link>
              {bundleResult.near_expiry_used && bundleResult.near_expiry_used.length > 0 && (
                <span className="ml-1 text-mt-text-secondary">
                  （优先消耗：{bundleResult.near_expiry_used.join('、')}）
                </span>
              )}
            </div>
          )}

          {/* 已有 vs 需补齐 */}
          {bundleResult.fridge_coverage && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-emerald-50 p-2.5">
                <p className="mb-1.5 text-[10px] font-semibold text-emerald-700">
                  冰箱已有 ({bundleResult.fridge_coverage.covered_count})
                </p>
                <div className="flex flex-wrap gap-1">
                  {bundleResult.fridge_coverage.covered_items.slice(0, 6).map((item) => (
                    <span
                      key={item}
                      className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] text-emerald-800"
                    >
                      {item}
                    </span>
                  ))}
                  {bundleResult.fridge_coverage.covered_items.length === 0 && (
                    <span className="text-[10px] text-emerald-600/60">暂无</span>
                  )}
                </div>
              </div>
              <div className="rounded-xl bg-orange-50 p-2.5">
                <p className="mb-1.5 text-[10px] font-semibold text-orange-700">
                  需闪购补齐 ({bundleResult.fridge_coverage.missing_items.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {bundleResult.fridge_coverage.missing_items.map((item) => (
                    <span
                      key={item}
                      className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] text-orange-800"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mb-3 rounded-xl bg-mt-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-mt-text-secondary">
              <span>补齐清单 · {bundleResult.bundle.item_count} 项</span>
              <span>{bundleResult.bundle.redirect_label}</span>
            </div>
            <div className="space-y-2">
              {bundleResult.bundle.items.map((item) => (
                <div key={item.sku_id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-mt-text">{item.sku_name}</p>
                    <p className="text-[10px] text-mt-text-muted">
                      {item.quantity}
                      {item.unit}
                      {item.tier ? ` · ${item.tier}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium text-mt-orange">¥{item.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-mt-text-secondary">券后到手价</p>
              <p className="text-2xl font-bold text-mt-red">
                ¥{Number(bundleResult.bundle.final_price).toFixed(2)}
              </p>
              {(bundleResult.bundle.coupon_discount ?? 0) > 0 && (
                <p className="text-[10px] text-emerald-600">
                  神券已减 ¥{Number(bundleResult.bundle.coupon_discount).toFixed(2)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-mt-text-muted line-through">
                ¥{Number(bundleResult.bundle.total_price).toFixed(2)}
              </p>
              <p className="text-xs text-mt-orange">只买缺口 · 不重复囤货</p>
            </div>
          </div>

          <Button
            fullWidth
            onClick={handleOrderBundle}
            disabled={orderMutation.isPending}
          >
            {orderMutation.isPending ? '提交中...' : '一键下单 · 闪购补齐'}
            <ChevronRight className="ml-1 inline h-4 w-4" />
          </Button>
        </MeituanCard>
      )}
    </div>
  );
};

export default ScenarioBundlesPage;
