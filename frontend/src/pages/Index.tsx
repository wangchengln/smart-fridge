import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Package,
  ChefHat,
  ShoppingCart,
  Bell,
  Sparkles,
  ChevronRight,
  PiggyBank,
  UtensilsCrossed,
  Bike,
  Salad,
  CalendarDays,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNearExpiryIngredients } from '../hooks/queries/useIngredientQueries';
import { useRecipeRecommendations } from '../hooks/queries/useRecipeQueries';
import { useUserInfo } from '../hooks/queries/useUserQueries';
import { useWeeklySavings } from '../hooks/queries/useCouponQueries';
import { useScenarioPreview } from '../hooks/queries/useScenarioQueries';
import AiRecommendationCarousel from '../components/AiRecommendationCarousel';
import FridgeAgentChat from '../components/FridgeAgentChat';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { DIETARY_MODE_LABELS } from '../types/api';
import { resolveHomeImageUrl } from '../utils/homeImage';
import { MEAL_MODE_IMAGE_KEYS, SCENARIO_SERVICE_IMAGE_KEYS } from '../utils/homeImageMap';
import { homeMealModeToRecipesPath } from '../utils/recipeQuadrant';

interface ScenarioServiceAction {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  path: string;
  iconBg: string;
  iconColor: string;
}

interface MealModeCard {
  title: string;
  subtitle: string;
  count: number;
  icon: LucideIcon;
  path: string;
  btnText: string;
  previewImage?: string;
  theme: {
    header: string;
    btn: string;
    accent: string;
  };
}

interface StatItem {
  label: string;
  desc: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  cardBg: string;
  path?: string;
}

const Index = () => {
  const { userId, nickname } = useAuth();
  const { data: nearExpiryData, isLoading: nearExpiryLoading } = useNearExpiryIngredients(userId);
  const { data: userInfoData } = useUserInfo(userId);
  const { data: recommendationsData, isLoading: recommendationsLoading } = useRecipeRecommendations(
    userId
      ? {
          user_id: userId,
          refresh: false,
          dietary_mode: userInfoData?.dietary_mode,
        }
      : undefined
  );
  const { data: weeklySavingsData } = useWeeklySavings(userId);
  const { data: scenarioPreview } = useScenarioPreview(userId);

  const isLoading = nearExpiryLoading || recommendationsLoading;

  const nearExpiryCount = nearExpiryData?.total_count ?? 0;
  const nearExpiryNames = nearExpiryData?.near_expiry_ingredients?.slice(0, 2).map((i) => i.ingredient_name) ?? [];

  const recommendationsCount = recommendationsData?.total_count ?? 0;

  const quadrantCounts = useMemo(
    () => ({
      cookSelf:
        (recommendationsData?.cook_self_recipes?.length ?? 0) +
        (recommendationsData?.no_purchase_recipes?.length ?? 0),
      flashPurchase:
        (recommendationsData?.flash_purchase_recipes?.length ?? 0) +
        (recommendationsData?.small_purchase_recipes?.length ?? 0),
      takeout:
        (recommendationsData?.takeout_delivery_recipes?.length ?? 0) +
        (recommendationsData?.takeout_alternative_recipes?.length ?? 0),
      premade: recommendationsData?.premade_fresh_recipes?.length ?? 0,
    }),
    [recommendationsData]
  );

  const displayName = userInfoData?.nickname || nickname || '云冰箱用户';
  const dietaryMode = userInfoData?.dietary_mode ?? 'normal';
  const weeklySaved = Number(weeklySavingsData?.weekly_saved_amount ?? 0);

  const stats: StatItem[] = [
    {
      label: nearExpiryCount > 0 ? `${nearExpiryCount}种食材` : '暂无临期',
      desc: nearExpiryCount > 0 ? '建议先吃' : '临期提醒',
      icon: Bell,
      iconBg: 'bg-[#dcfce7]',
      iconColor: 'text-[#16a34a]',
      cardBg: 'bg-[#ecfdf5]',
      path: '/ingredients',
    },
    {
      label: `${recommendationsCount}套方案`,
      desc: '今晚推荐',
      icon: ChefHat,
      iconBg: 'bg-[#ffedd5]',
      iconColor: 'text-[#ea580c]',
      cardBg: 'bg-[#fff7ed]',
      path: '/recipes',
    },
    {
      label: dietaryMode === 'normal' ? '标准模式' : DIETARY_MODE_LABELS[dietaryMode],
      desc: '饮食偏好',
      icon: Sparkles,
      iconBg: 'bg-[#ede9fe]',
      iconColor: 'text-[#7c3aed]',
      cardBg: 'bg-[#f5f3ff]',
      path: '/profile',
    },
    {
      label: weeklySaved > 0 ? `¥${weeklySaved.toFixed(1)}` : '¥0',
      desc: '本周已省',
      icon: PiggyBank,
      iconBg: 'bg-[#f3e8ff]',
      iconColor: 'text-[#9333ea]',
      cardBg: 'bg-[#faf5ff]',
    },
  ];

  const scenarioServices: ScenarioServiceAction[] = [
    {
      title: '拍照识别',
      subtitle: 'AI 识食材',
      icon: Camera,
      path: '/camera',
      iconBg: 'bg-[#fef3c7]',
      iconColor: 'text-[#d97706]',
    },
    {
      title: '我的冰箱',
      subtitle: '管理库存',
      icon: Package,
      path: '/ingredients',
      iconBg: 'bg-[#dcfce7]',
      iconColor: 'text-[#16a34a]',
    },
    {
      title: '菜谱推荐',
      subtitle: '今日吃什么',
      icon: ChefHat,
      path: '/recipes',
      iconBg: 'bg-[#ffedd5]',
      iconColor: 'text-[#ea580c]',
    },
    {
      title: '一键补购',
      subtitle: '美团优选',
      icon: ShoppingCart,
      path: '/purchase/plans',
      iconBg: 'bg-[#fef9c3]',
      iconColor: 'text-[#ca8a04]',
    },
    {
      title: '周末补货',
      subtitle: '定时达',
      icon: CalendarDays,
      path: '/scenarios',
      iconBg: 'bg-[#dbeafe]',
      iconColor: 'text-[#2563eb]',
    },
    {
      title: '家居聚会',
      subtitle: '组合购',
      icon: Users,
      path: '/scenarios',
      iconBg: 'bg-[#ede9fe]',
      iconColor: 'text-[#7c3aed]',
    },
  ];

  const heroImageUrl = resolveHomeImageUrl('hero');

  const mealModeCards: MealModeCard[] = [
    {
      title: '自己做',
      subtitle: '食材够，约 20 分钟',
      count: quadrantCounts.cookSelf,
      icon: UtensilsCrossed,
      path: homeMealModeToRecipesPath('cook_self'),
      btnText: '看菜谱',
      previewImage: resolveHomeImageUrl(MEAL_MODE_IMAGE_KEYS['自己做']),
      theme: {
        header: 'bg-gradient-to-r from-[#bbf7d0] to-[#86efac]',
        btn: 'bg-[#22c55e] hover:bg-[#16a34a]',
        accent: 'text-[#15803d]',
      },
    },
    {
      title: '补一点做',
      subtitle: '闪购补少量缺口',
      count: quadrantCounts.flashPurchase,
      icon: ShoppingCart,
      path: homeMealModeToRecipesPath('flash_purchase'),
      btnText: '去补货',
      previewImage: resolveHomeImageUrl(MEAL_MODE_IMAGE_KEYS['补一点做']),
      theme: {
        header: 'bg-gradient-to-r from-[#fed7aa] to-[#fdba74]',
        btn: 'bg-[#f97316]',
        accent: 'text-[#c2410c]',
      },
    },
    {
      title: '直接点外卖',
      subtitle: '今天不想下厨',
      count: quadrantCounts.takeout,
      icon: Bike,
      path: homeMealModeToRecipesPath('takeout'),
      btnText: '点外卖',
      previewImage: resolveHomeImageUrl(MEAL_MODE_IMAGE_KEYS['直接点外卖']),
      theme: {
        header: 'bg-gradient-to-r from-[#bfdbfe] to-[#93c5fd]',
        btn: 'bg-[#3b82f6]',
        accent: 'text-[#1d4ed8]',
      },
    },
    {
      title: '买半成品',
      subtitle: '新鲜预制更省时',
      count: quadrantCounts.premade,
      icon: Salad,
      path: homeMealModeToRecipesPath('premade'),
      btnText: '买鲜食',
      previewImage: resolveHomeImageUrl(MEAL_MODE_IMAGE_KEYS['买半成品']),
      theme: {
        header: 'bg-gradient-to-r from-[#ddd6fe] to-[#c4b5fd]',
        btn: 'bg-[#8b5cf6]',
        accent: 'text-[#6d28d9]',
      },
    },
  ];

  const carouselRecommendations = useMemo(() => {
    const seen = new Set<number>();
    const merged = [
      ...(recommendationsData?.cook_self_recipes ?? []),
      ...(recommendationsData?.no_purchase_recipes ?? []),
      ...(recommendationsData?.flash_purchase_recipes ?? []),
      ...(recommendationsData?.small_purchase_recipes ?? []),
    ];
    return merged
      .filter((item) => {
        if (seen.has(item.recipe_id)) return false;
        seen.add(item.recipe_id);
        return true;
      })
      .slice(0, 6);
  }, [recommendationsData]);

  if (isLoading) {
    return <LoadingSpinner text="正在加载首页..." />;
  }

  return (
    <div className="home-page animate-fade-in -mx-4 min-h-full pb-3">
      <div className="space-y-4 px-4 pt-1">
        {/* 1. 首页横幅 — AI 生成云冰箱场景头图 */}
        <section className="home-card overflow-hidden">
          <div className="relative h-[88px] w-full">
            <img
              src={heroImageUrl}
              alt="智能云冰箱"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="text-xs font-bold text-white drop-shadow">智能云冰箱</p>
              <p className="mt-0.5 text-[9px] text-white/90 drop-shadow">
                识食材 · 荐菜谱 · 连美团
              </p>
            </div>
          </div>
        </section>

        {/* 2. 云冰箱 AI Agent */}
        <FridgeAgentChat displayName={displayName} />

        {/* 3. 数据概览 — 与上下模块同宽四列网格 */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const inner = (
              <div className={`home-stat-card h-full w-full ${stat.cardBg}`}>
                <div className="mb-2 flex items-center justify-between">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.iconBg}`}>
                    <Icon className={`h-3.5 w-3.5 ${stat.iconColor}`} />
                  </div>
                  {stat.path && <ChevronRight className="h-3 w-3 text-mt-text-muted/60" />}
                </div>
                <p className="text-sm font-bold leading-tight text-mt-text">{stat.label}</p>
                <p className="mt-0.5 text-[10px] text-mt-text-secondary">{stat.desc}</p>
                {stat.path === '/ingredients' && nearExpiryNames.length > 0 && (
                  <p className="mt-1 line-clamp-1 text-[9px] text-mt-text-muted">
                    {nearExpiryNames.join('、')}
                  </p>
                )}
              </div>
            );
            return stat.path ? (
              <Link key={stat.desc} to={stat.path} className="block h-full min-w-0">
                {inner}
              </Link>
            ) : (
              <div key={stat.desc} className="h-full min-w-0">
                {inner}
              </div>
            );
          })}
        </div>

        {/* 4. 今天怎么吃 — AI 主题插图 + 底部按钮 */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="home-section-title">今天怎么吃</h3>
            <Link to="/recipes" className="home-link-more">
              更多个性化推荐
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {mealModeCards.map((mode) => {
              const Icon = mode.icon;
              return (
                <Link key={mode.title} to={mode.path} className="home-meal-card h-full min-w-0">
                  <div className={`h-1.5 ${mode.theme.header}`} />
                  <div className="flex flex-1 flex-col p-2">
                    <div className="relative mx-auto mb-2">
                      {mode.previewImage ? (
                        <div className="home-food-ring flex h-14 w-14 items-center justify-center rounded-full p-0.5">
                          <img
                            src={mode.previewImage}
                            alt=""
                            className="h-full w-full rounded-full object-cover ring-2 ring-white"
                          />
                        </div>
                      ) : (
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${mode.theme.header}`}>
                          <Icon className="h-6 w-6 text-white drop-shadow-sm" />
                        </div>
                      )}
                      {mode.count > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-mt-orange px-1 text-[9px] font-bold text-white ring-2 ring-white">
                          {mode.count}
                        </span>
                      )}
                    </div>
                    <p className="text-center text-[11px] font-bold text-mt-text">{mode.title}</p>
                    <p className={`mt-0.5 text-center text-[9px] leading-tight ${mode.theme.accent}`}>
                      {mode.subtitle}
                    </p>
                    <span
                      className={`mt-2 block w-full rounded-lg py-1.5 text-center text-[10px] font-bold text-white ${mode.theme.btn}`}
                    >
                      {mode.btnText}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 5. 美团场景服务 — AI 圆形场景插图 */}
        <section className="home-card px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="home-section-title">美团场景服务</h3>
            <Link to="/scenarios" className="home-link-more">
              先查库存
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {scenarioPreview?.headline && (
            <p className="mb-2 text-[11px] leading-snug text-mt-text-secondary">
              {scenarioPreview.headline}
            </p>
          )}
          <div className="grid grid-cols-6 gap-x-0 gap-y-1">
            {scenarioServices.map((action) => {
              const serviceImageKey = SCENARIO_SERVICE_IMAGE_KEYS[action.title];
              const serviceImageUrl = serviceImageKey ? resolveHomeImageUrl(serviceImageKey) : null;
              return (
                <Link
                  key={action.title}
                  to={action.path}
                  className="flex flex-col items-center gap-1 rounded-lg transition-colors active:bg-mt-gray-50"
                >
                  <div className={`home-service-icon overflow-hidden ring-1 ring-white ${action.iconBg}`}>
                    {serviceImageUrl ? (
                      <img
                        src={serviceImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <action.icon className={`h-[22px] w-[22px] ${action.iconColor}`} />
                    )}
                  </div>
                  <span className="text-center text-[11px] font-semibold leading-tight text-mt-text">
                    {action.title}
                  </span>
                  <span className="text-center text-[10px] leading-tight text-mt-text-muted">
                    {action.subtitle}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {/* 6. AI 今日推荐 — 参考稿横向卡片滑动 */}
      <div className="mt-4">
        <AiRecommendationCarousel
          recipes={carouselRecommendations}
          title="AI 今日推荐"
          subtitle="根据冰箱库存与美团供给智能匹配"
        />
      </div>
    </div>
  );
};

export default Index;
