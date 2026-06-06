import { useMemo } from 'react';
import {
  Clock,
  BookOpen,
  ShoppingBag,
  Bell,
  Settings,
  ChevronRight,
  Eraser,
  Award,
  ChefHat,
  Eye,
  ClipboardList,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserInfo } from '../hooks/queries/useUserQueries';
import {
  useClearRecommendationCache,
  useRecipeCollection,
  useRecommendationStats,
} from '../hooks/queries/useRecipeQueries';
import { useUserRecognitionHistory } from '../hooks/queries/useImageRecognitionQueries';
import { useUserPurchasePlans } from '../hooks/queries/usePurchaseQueries';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import FamilySettingsCard from '../components/FamilySettingsCard';

interface StatItem {
  title: string;
  value: number;
  unit: string;
  caption: string;
  icon: LucideIcon;
  path: string;
  iconBg: string;
  iconColor: string;
  showClearCache?: boolean;
}

interface MenuItem {
  title: string;
  icon: LucideIcon;
  path: string;
  badge?: string;
}

const getWeeklyCookCount = (
  dailyBreakdown: { date: string; count: number }[] | undefined
): number => {
  if (!dailyBreakdown?.length) return 0;

  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);

  return dailyBreakdown
    .filter((item) => {
      const date = new Date(item.date);
      return date >= startOfWeek && date <= now;
    })
    .reduce((sum, item) => sum + item.count, 0);
};

const ProfilePage = () => {
  const { userId, nickname } = useAuth();
  const { data: userInfo, isLoading } = useUserInfo(userId);
  const { data: stats } = useRecommendationStats(userId);
  const { data: collection } = useRecipeCollection(userId);
  const { data: recognitionHistory } = useUserRecognitionHistory(userId, 50);
  const clearRecommendationCacheMutation = useClearRecommendationCache();

  const displayName = userInfo?.nickname || nickname || '云冰箱用户';

  const recognitionCount = Array.isArray(recognitionHistory) ? recognitionHistory.length : 0;
  const weeklyCookCount = useMemo(
    () => getWeeklyCookCount(collection?.monthly_stats.daily_breakdown),
    [collection?.monthly_stats.daily_breakdown]
  );
  const recommendationViewCount = stats?.total_recommendations ?? 0;

  const statsItems: StatItem[] = [
    {
      title: '识别次数',
      value: recognitionCount,
      unit: '次',
      caption: '累计扫货入库',
      icon: Clock,
      path: '/history/recognition',
      iconBg: 'bg-[#dbeafe]',
      iconColor: 'text-[#2563eb]',
    },
    {
      title: '本周做饭',
      value: weeklyCookCount,
      unit: '次',
      caption: '坚持下厨很棒',
      icon: ChefHat,
      path: '/collection',
      iconBg: 'bg-[#dcfce7]',
      iconColor: 'text-[#16a34a]',
    },
    {
      title: '查看推荐',
      value: recommendationViewCount,
      unit: '次',
      caption: '智能菜谱方案',
      icon: Eye,
      path: '/history/recommendations',
      iconBg: 'bg-[#ffedd5]',
      iconColor: 'text-[#ea580c]',
      showClearCache: true,
    },
  ];

  const menuItems: MenuItem[] = [
    {
      title: '厨房集卡',
      icon: Layers,
      path: '/collection',
      badge: collection ? `${collection.total_badges}张` : undefined,
    },
    { title: '识别历史', icon: Clock, path: '/history/recognition' },
    { title: '推荐历史', icon: BookOpen, path: '/history/recommendations' },
    { title: '补购记录', icon: ShoppingBag, path: '/history/purchases' },
    { title: '临期提醒', icon: Bell, path: '/ingredients', badge: '食材' },
    { title: '补购方案', icon: ClipboardList, path: '/purchase/plans' },
  ];

  const handleClearRecommendationCache = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!userId) return;

    if (
      !window.confirm(
        '将清除推荐列表缓存与服务器上的推荐记录，下次进入菜谱推荐会重新计算。确定继续吗？'
      )
    ) {
      return;
    }

    try {
      const result = await clearRecommendationCacheMutation.mutateAsync(userId);
      alert(result.message || '推荐缓存已清除');
    } catch {
      alert('清除推荐缓存失败，请稍后重试');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const remainingToGoal = Math.max(0, 20 - (collection?.total_badges ?? 0));

  return (
    <div className="animate-fade-in space-y-4">
      <FamilySettingsCard displayName={displayName} />

      <div className="grid grid-cols-3 gap-2">
        {statsItems.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} to={stat.path} className="relative block">
              <div className="flex h-full flex-col rounded-2xl bg-white p-3 shadow-card transition-transform active:scale-[0.98]">
                {stat.showClearCache && (
                  <button
                    type="button"
                    title="清除推荐缓存"
                    disabled={clearRecommendationCacheMutation.isPending}
                    onClick={handleClearRecommendationCache}
                    className="absolute right-1.5 top-1.5 rounded-lg p-1 text-mt-text-muted transition-colors hover:bg-mt-gray-100 hover:text-emerald-600 disabled:opacity-50"
                  >
                    <Eraser className="h-3 w-3" />
                  </button>
                )}
                <div
                  className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full ${stat.iconBg}`}
                >
                  <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
                <p className="text-[10px] font-medium text-mt-text-secondary">{stat.title}</p>
                <p className="mt-0.5 text-base font-bold leading-tight text-mt-text">
                  {stat.value}
                  <span className="ml-0.5 text-[10px] font-medium text-mt-text-secondary">
                    {stat.unit}
                  </span>
                </p>
                <p className="mt-1 text-[9px] leading-snug text-mt-text-muted">{stat.caption}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <Link to="/collection" className="block">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#fff8e1] via-[#fffbeb] to-[#fffdf5] p-4 shadow-card transition-transform active:scale-[0.98]">
          <div className="absolute -right-2 -top-2 h-20 w-20 rounded-full bg-mt-yellow/20" />
          <div className="relative flex items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-mt-yellow/30" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-mt-yellow shadow-sm">
                <Award className="h-5 w-5 text-mt-orange" />
              </div>
              <span className="absolute -left-1 -top-1 text-sm">🥬</span>
              <span className="absolute -right-1 top-0 text-xs">🍅</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-mt-text">我的厨房图鉴</p>
              <p className="mt-0.5 text-xs text-mt-text-secondary">
                每做一道菜，解锁一张专属图鉴卡片
              </p>
              <p className="mt-1 text-[10px] text-mt-orange">
                {remainingToGoal > 0
                  ? `已收集 ${collection?.total_badges ?? 0} 张 · 还差 ${remainingToGoal} 道解锁成就`
                  : `已收集 ${collection?.total_badges ?? 0} 张 · 成就已解锁！`}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-mt-text-muted" />
          </div>
        </div>
      </Link>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path + item.title}
              to={item.path}
              className={`flex items-center justify-between px-4 py-3.5 transition-colors active:bg-mt-gray-50 ${
                index > 0 ? 'border-t border-mt-border/60' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mt-gray-50">
                  <Icon className="h-4 w-4 text-mt-text-secondary" />
                </div>
                <span className="font-medium text-mt-text">{item.title}</span>
                {item.badge && (
                  <span className="mt-tag-yellow text-[10px]">{item.badge}</span>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-mt-text-muted" />
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white px-4 py-3 shadow-card">
        <div className="flex items-center gap-2 text-xs text-mt-text-muted">
          <Settings className="h-3.5 w-3.5" />
          智能云冰箱 · 美团内部版 v1.0
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
