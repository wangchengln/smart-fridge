import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  ChefHat,
  ChevronRight,
  ClipboardList,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRecipeCollection } from '../hooks/queries/useRecipeQueries';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import MeituanCard from '../components/ui/MeituanCard';
import MonthlyCookChart from '../components/MonthlyCookChart';
import HexCollectionCard from '../components/HexCollectionCard';
import RecentCookCard from '../components/RecentCookCard';
import Button from '../components/ui/Button';

const COLLECTION_GOAL = 20;
const ACHIEVEMENT_NAME = '家常达人';

const RecipeCollectionPage = () => {
  const { userId } = useAuth();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, error, refetch } = useRecipeCollection(userId, {
    year: viewYear,
    month: viewMonth,
  });

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const lockedCount = useMemo(() => {
    if (!data) return COLLECTION_GOAL;
    return Math.max(0, COLLECTION_GOAL - data.total_badges);
  }, [data]);

  const progressPercent = useMemo(() => {
    if (!data) return 0;
    return Math.min(100, (data.total_badges / COLLECTION_GOAL) * 100);
  }, [data]);

  const remainingToGoal = useMemo(() => {
    if (!data) return COLLECTION_GOAL;
    return Math.max(0, COLLECTION_GOAL - data.total_badges);
  }, [data]);

  if (isLoading) return <LoadingSpinner text="加载图鉴..." />;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="mb-4 text-mt-red">加载失败</p>
        <Button onClick={() => refetch()}>重试</Button>
      </div>
    );
  }

  const { monthly_stats: monthlyStats, badges, total_badges, total_cooks } = data;
  const recentBadge = badges[0];

  return (
    <div className="animate-fade-in space-y-4">
      {/* 顶部概览卡片 */}
      <MeituanCard className="overflow-hidden !p-0 shadow-card">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          {/* 左侧插图 */}
          <div className="relative mx-auto flex h-24 w-24 shrink-0 items-center justify-center sm:mx-0">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-100 to-yellow-50" />
            <div className="relative flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mt-yellow shadow-float">
                <BookOpen className="h-7 w-7 text-mt-orange" />
              </div>
              <span className="absolute -left-3 top-1 text-lg">🥬</span>
              <span className="absolute -right-2 top-3 text-sm">🍅</span>
              <span className="absolute -bottom-1 right-0 text-sm">🥕</span>
            </div>
          </div>

          {/* 中间进度 */}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="text-base font-bold text-mt-text">我的厨房图鉴</h2>
            <p className="mt-0.5 text-xs text-mt-text-secondary">
              每做一道菜，就解锁一张专属图鉴卡片
            </p>

            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-mt-text-secondary">
              <Trophy className="h-3.5 w-3.5 shrink-0 text-mt-orange" />
              {remainingToGoal > 0 ? (
                <span>
                  还差 <span className="font-semibold text-mt-orange">{remainingToGoal}</span>{' '}
                  道菜解锁「{ACHIEVEMENT_NAME}」
                </span>
              ) : (
                <span className="font-semibold text-mt-orange">
                  已解锁「{ACHIEVEMENT_NAME}」成就！
                </span>
              )}
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-mt-text-muted">
                <span>收集进度</span>
                <span className="font-semibold text-mt-orange">
                  {total_badges}/{COLLECTION_GOAL}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-mt-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-mt-yellow to-mt-orange transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* 右侧统计 */}
          <div className="grid shrink-0 grid-cols-3 divide-x divide-mt-border rounded-xl border border-mt-border bg-mt-gray-50/80 sm:w-auto">
            <div className="flex flex-col items-center px-3 py-2.5">
              <BookOpen className="mb-1 h-4 w-4 text-mt-orange" />
              <p className="text-lg font-bold text-mt-text">{total_badges}</p>
              <p className="text-[10px] text-mt-text-secondary">已收集</p>
            </div>
            <div className="flex flex-col items-center px-3 py-2.5">
              <ClipboardList className="mb-1 h-4 w-4 text-mt-orange" />
              <p className="text-lg font-bold text-mt-text">{total_cooks}</p>
              <p className="text-[10px] text-mt-text-secondary">累计做菜</p>
            </div>
            <div className="flex flex-col items-center px-3 py-2.5">
              <CalendarDays className="mb-1 h-4 w-4 text-mt-orange" />
              <p className="text-lg font-bold text-mt-text">
                {monthlyStats.unique_recipes}
              </p>
              <p className="text-[10px] text-mt-text-secondary">本月菜品</p>
            </div>
          </div>
        </div>
      </MeituanCard>

      {/* 图鉴卡片横向滚动 */}
      <MeituanCard className="!p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-mt-text">
            我的图鉴 · 已解锁 ({total_badges}/{COLLECTION_GOAL})
          </h3>
          <Link to="/recipes" className="home-link-more">
            查看全部
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {badges.length > 0 || lockedCount > 0 ? (
          <div className="scroll-touch -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {badges.map((badge) => (
              <HexCollectionCard key={badge.recipe_id} badge={badge} />
            ))}
            {Array.from({ length: lockedCount }).map((_, i) => (
              <HexCollectionCard key={`locked-${i}`} locked />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <ChefHat className="mb-2 h-8 w-8 text-mt-text-muted" />
            <p className="text-sm text-mt-text-secondary">还没有解锁图鉴</p>
            <p className="mt-1 text-xs text-mt-text-muted">
              去菜谱推荐选一道菜，点击「选它 · 集卡」即可解锁
            </p>
            <Link to="/recipes" className="mt-3">
              <Button size="sm">去菜谱推荐</Button>
            </Link>
          </div>
        )}
      </MeituanCard>

      {/* 底部：日历 + 最近完成 */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="md:col-span-3">
          <MonthlyCookChart
            year={monthlyStats.year}
            month={monthlyStats.month}
            dailyBreakdown={monthlyStats.daily_breakdown}
            totalCooks={monthlyStats.total_cooks}
            onPrevMonth={() => shiftMonth(-1)}
            onNextMonth={() => shiftMonth(1)}
          />
        </div>
        <div className="md:col-span-2">
          <RecentCookCard badge={recentBadge} />
        </div>
      </div>
    </div>
  );
};

export default RecipeCollectionPage;
