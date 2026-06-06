import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eraser, Sparkles, Store, UtensilsCrossed } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  useClearRecommendationCache,
  useRecipeRecommendations,
  useSelectRecipe,
  useTakeoutRedirect,
} from '../hooks/queries/useRecipeQueries';
import { useUserInfo } from '../hooks/queries/useUserQueries';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import MeituanCard from '../components/ui/MeituanCard';
import RecipeListCard from '../components/RecipeListCard';
import type { RecipeRecommendParams, RecommendationItem } from '../types/api';
import {
  buildRecipeRecommendParams,
  groupRecommendationsByQuadrant,
  intentToDefaultTab,
  parseRecipesPageSearchParams,
  RECIPE_INTENT_OPTIONS,
  tabToIntent,
  TAKEOUT_REDIRECT_OPTION,
  type RecipeIntent,
  type RecipeQuadrantTab,
} from '../utils/recipeQuadrant';
import { openPremadeFresh } from '../utils/premadeNavigate';
import { openTakeoutStore } from '../utils/takeoutNavigate';

const tabConfig: { id: RecipeQuadrantTab; label: string; emoji: string; desc: string }[] = [
  { id: 'cook_self', label: '自己做', emoji: '✅', desc: '食材充足' },
  { id: 'flash_purchase_cook', label: '闪购补料', emoji: '🛒', desc: '补料后开做' },
  { id: 'takeout_delivery', label: '外卖同款', emoji: '🍜', desc: '点外卖省事' },
  { id: 'premade_fresh', label: '新鲜预制', emoji: '🥗', desc: '小象/便利店' },
];

const quadrantInfo: Record<RecipeQuadrantTab, string> = {
  cook_self: '食材全部充足时推荐此路径，直接用冰箱里的食材自己做，无需补购。',
  flash_purchase_cook: '食材略有缺口时可选：闪购少量补料后自己做，下方是与其它方式相同的菜谱。',
  takeout_delivery: '食材不足时可选：点外卖同款或拼好饭，下方推荐与闪购、预制相同的菜谱供你对比选择。',
  premade_fresh: '食材不足时可选：小象鲜食或便利店闪电仓，下方推荐与闪购、外卖相同的菜谱供你对比选择。',
};

const RecipesPage = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: userInfo } = useUserInfo(userId);

  const [intent, setIntent] = useState<RecipeIntent>('cook');
  const [activeTab, setActiveTab] = useState<RecipeQuadrantTab>('cook_self');
  const [takeoutMode, setTakeoutMode] = useState(false);
  const [preference, setPreference] = useState('');
  const [maxMissing, setMaxMissing] = useState('');
  const [takeoutLoadingId, setTakeoutLoadingId] = useState<number | null>(null);
  const [queryParams, setQueryParams] = useState<RecipeRecommendParams | undefined>();

  const { data, isLoading, error, refetch, isFetching } = useRecipeRecommendations(queryParams);
  const selectRecipeMutation = useSelectRecipe();
  const clearRecommendationCacheMutation = useClearRecommendationCache();
  const takeoutRedirectMutation = useTakeoutRedirect();

  const recipes = useMemo(() => groupRecommendationsByQuadrant(data), [data]);

  const refreshRecommendations = useCallback(
    (refresh = true) => {
      if (!userId) return;
      setQueryParams(
        buildRecipeRecommendParams(userId, 'cook', {
          preference,
          maxMissing,
          refresh,
          dietaryMode: userInfo?.dietary_mode,
        })
      );
    },
    [userId, preference, maxMissing, userInfo?.dietary_mode]
  );

  const applyNavigationEntry = useCallback(
    (entry: NonNullable<ReturnType<typeof parseRecipesPageSearchParams>>) => {
      if (entry.tab) {
        setActiveTab(entry.tab);
        setTakeoutMode(entry.tab === 'takeout_delivery');
      }

      if (entry.intent) {
        setIntent(entry.intent);
        if (entry.tab !== 'takeout_delivery') {
          setTakeoutMode(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!userId) {
      setQueryParams(undefined);
      return;
    }

    const entry = parseRecipesPageSearchParams(searchParams);

    if (entry) {
      applyNavigationEntry(entry);
      setQueryParams(
        buildRecipeRecommendParams(userId, 'cook', {
          preference,
          maxMissing,
          refresh: true,
          dietaryMode: userInfo?.dietary_mode,
        })
      );
      return;
    }

    setQueryParams(
      buildRecipeRecommendParams(userId, 'cook', {
        preference,
        maxMissing,
        refresh: true,
        dietaryMode: userInfo?.dietary_mode,
      })
    );
  }, [userId, searchParams, preference, maxMissing, userInfo?.dietary_mode, applyNavigationEntry]);

  const handleTabChange = (tab: RecipeQuadrantTab) => {
    setActiveTab(tab);
    if (tab === 'takeout_delivery') {
      setTakeoutMode(true);
      return;
    }
    setTakeoutMode(false);
    const mappedIntent = tabToIntent(tab);
    if (mappedIntent) {
      setIntent(mappedIntent);
    }
  };

  const handleIntentChange = (nextIntent: RecipeIntent) => {
    setIntent(nextIntent);
    setTakeoutMode(false);
    setActiveTab(intentToDefaultTab(nextIntent));
  };

  const handleTakeoutMode = () => {
    setTakeoutMode(true);
    setActiveTab('takeout_delivery');
  };

  const handleClearCache = async () => {
    if (!userId) return;
    if (
      !window.confirm(
        '将清除推荐缓存与历史推荐记录，并重新加载推荐列表。确定继续吗？'
      )
    ) {
      return;
    }

    try {
      const result = await clearRecommendationCacheMutation.mutateAsync(userId);
      refreshRecommendations(true);
      await queryClient.invalidateQueries({ queryKey: ['recipe', 'recommendations'] });
      await refetch();
      alert(result.message || '推荐缓存已清除');
    } catch {
      alert('清除推荐缓存失败，请稍后重试');
    }
  };

  const handleSelectRecipe = async (recipe: RecommendationItem) => {
    try {
      if (!recipe.recommendation_id) {
        alert('推荐记录无效，请刷新推荐列表后重试');
        return;
      }
      const result = await selectRecipeMutation.mutateAsync({
        recommendation_id: recipe.recommendation_id,
        is_selected: true,
      });
      const badgeHint = result.is_new_badge ? '\n新徽章已收入厨艺集卡！' : '\n集卡次数已更新。';
      alert(`${result.message || `已选择：${recipe.name}`}${badgeHint}`);
    } catch (err) {
      console.error('选择菜谱失败:', err);
      alert('选择菜谱失败，请稍后重试');
    }
  };

  const handlePremadeClick = (recipe: RecommendationItem) => {
    openPremadeFresh({
      recipes: recipes.premade_fresh,
      focusRecipe: recipe,
      navigate,
    });
  };

  const handleTakeoutClick = async (recipe?: RecommendationItem) => {
    if (!userId) return;

    const loadingKey = recipe?.recipe_id ?? 0;
    setTakeoutLoadingId(loadingKey);
    try {
      await openTakeoutStore({
        userId,
        preference,
        focusRecipe: recipe,
        fetchRedirect: takeoutRedirectMutation.mutateAsync,
        navigate,
      });
    } catch (err) {
      console.error('加载外卖店铺失败:', err);
      alert('加载外卖店铺失败，请稍后重试');
    } finally {
      setTakeoutLoadingId(null);
    }
  };

  if (!userId) {
    return (
      <div className="rounded-2xl bg-white py-12 text-center text-sm text-mt-text-secondary">
        请先登录后查看菜谱推荐
      </div>
    );
  }

  if (isLoading && !data) return <LoadingSpinner text="正在推荐菜谱..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="mb-4 text-mt-red">加载失败</p>
        <Button onClick={() => refetch()}>重新加载</Button>
      </div>
    );
  }

  const activeRecipes = recipes[activeTab];
  const activeTabMeta = tabConfig.find((tab) => tab.id === activeTab);

  return (
    <div className="animate-fade-in space-y-4">
      <MeituanCard>
        <p className="mb-2 text-xs font-semibold text-mt-text">你今天怎么吃？</p>
        <div className="grid grid-cols-2 gap-2">
          {RECIPE_INTENT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleIntentChange(option.id)}
              className={`rounded-xl border px-3 py-2 text-left transition-all ${
                !takeoutMode && intent === option.id
                  ? 'border-mt-orange bg-orange-50'
                  : 'border-mt-border bg-white'
              }`}
            >
              <p className="text-xs font-bold text-mt-text">{option.label}</p>
              <p className="mt-0.5 text-[10px] text-mt-text-muted">{option.desc}</p>
            </button>
          ))}
          <button
            type="button"
            onClick={handleTakeoutMode}
            className={`rounded-xl border px-3 py-2 text-left transition-all active:scale-[0.98] ${
              takeoutMode
                ? 'border-mt-orange bg-orange-50'
                : 'border-mt-border bg-white'
            }`}
          >
            <p className="text-xs font-bold text-mt-text">{TAKEOUT_REDIRECT_OPTION.label}</p>
            <p className="mt-0.5 text-[10px] text-mt-text-muted">
              {TAKEOUT_REDIRECT_OPTION.desc}
            </p>
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <select
            value={preference}
            onChange={(e) => setPreference(e.target.value)}
            className="rounded-xl border border-mt-border bg-mt-gray-50 px-3 py-2 text-sm"
          >
            <option value="">全部口味</option>
            <option value="清淡">清淡</option>
            <option value="麻辣">麻辣</option>
            <option value="酸甜">酸甜</option>
            <option value="咸鲜">咸鲜</option>
          </select>
          <select
            value={maxMissing}
            onChange={(e) => setMaxMissing(e.target.value)}
            className="rounded-xl border border-mt-border bg-mt-gray-50 px-3 py-2 text-sm"
          >
            <option value="">缺失食材</option>
            <option value="0">0种</option>
            <option value="1">≤1种</option>
            <option value="2">≤2种</option>
            <option value="3">≤3种</option>
          </select>
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            fullWidth
            onClick={() => refreshRecommendations(true)}
            disabled={isFetching || clearRecommendationCacheMutation.isPending}
          >
            <Sparkles className="h-4 w-4" />
            {isFetching ? '刷新中...' : '重新推荐'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={handleClearCache}
            disabled={clearRecommendationCacheMutation.isPending || isFetching}
            title="清除推荐缓存"
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </div>
      </MeituanCard>

      <div className="scrollbar-hide flex gap-2 overflow-x-auto">
        {tabConfig.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-left transition-all ${
              activeTab === tab.id
                ? 'bg-mt-yellow shadow-sm'
                : 'bg-white text-mt-text-secondary'
            }`}
          >
            <span className="text-sm font-bold">
              {tab.emoji} {tab.label}
            </span>
            <span className="ml-1 text-xs text-mt-orange">{recipes[tab.id].length}</span>
            <p className="text-[10px] text-mt-text-muted">{tab.desc}</p>
          </button>
        ))}
      </div>

      <MeituanCard className="border border-yellow-100 bg-gradient-to-r from-yellow-50 to-orange-50 !p-3">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mt-yellow text-mt-text">
            {activeTab === 'takeout_delivery' ? (
              <UtensilsCrossed className="h-5 w-5" />
            ) : activeTab === 'premade_fresh' ? (
              <Store className="h-5 w-5" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 text-xs leading-relaxed text-mt-text-secondary">
            <p className="font-semibold text-mt-text">
              {activeTabMeta?.label} · 四象限推荐
            </p>
            <p className="mt-0.5">{quadrantInfo[activeTab]}</p>
            {data?.quadrant_summary && (
              <p className="mt-1 text-[10px] text-mt-text-muted">
                根据冰箱食材动态推荐 · 共 {data.total_count} 道候选 · 当前展示{' '}
                {activeRecipes.length} 道（无数量上限）· Q1{' '}
                {data.quadrant_summary.Q1?.count ?? 0} · Q2{' '}
                {data.quadrant_summary.Q2?.count ?? 0} · Q3{' '}
                {data.quadrant_summary.Q3?.count ?? 0} · Q4{' '}
                {data.quadrant_summary.Q4?.count ?? 0}
              </p>
            )}
            {activeTab === 'premade_fresh' && recipes.premade_fresh.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  openPremadeFresh({
                    recipes: recipes.premade_fresh,
                    navigate,
                  })
                }
                className="mt-2 text-[11px] font-semibold text-violet-600"
              >
                进入买鲜食专区 →
              </button>
            )}
          </div>
        </div>
      </MeituanCard>

      {activeRecipes.length === 0 ? (
        <div className="rounded-2xl bg-white py-12 text-center text-sm text-mt-text-secondary">
          <p>暂无{activeTabMeta?.label}推荐</p>
          <p className="mt-2 text-xs">可切换其它吃法象限，或放宽缺失食材筛选后重新推荐</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activeRecipes.map((recipe) => (
            <RecipeListCard
              key={`${recipe.recipe_id}-${recipe.recommendation_type}`}
              recipe={recipe}
              quadrant={activeTab}
              onSelect={handleSelectRecipe}
              onTakeoutClick={
                activeTab === 'takeout_delivery' ? handleTakeoutClick : undefined
              }
              onPremadeClick={
                activeTab === 'premade_fresh' ? handlePremadeClick : undefined
              }
              takeoutLoading={takeoutLoadingId === (recipe.recipe_id ?? 0)}
              selectDisabled={selectRecipeMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RecipesPage;
