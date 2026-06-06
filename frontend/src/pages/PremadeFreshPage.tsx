import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PremadeFreshView from '../components/premade/PremadeFreshView';
import type { PremadeChannelTab } from '../components/premade/PremadeChannelTabs';
import { useAuth } from '../context/AuthContext';
import { useRecipeRecommendations } from '../hooks/queries/useRecipeQueries';
import { useUserInfo } from '../hooks/queries/useUserQueries';
import type { RecommendationItem } from '../types/api';
import { openPremadeFresh } from '../utils/premadeNavigate';

const matchesChannelTab = (recipe: RecommendationItem, tab: PremadeChannelTab): boolean => {
  if (tab === 'all') return true;
  const platform = recipe.premade_analysis?.platform;
  if (tab === 'xiaoxiang') {
    return platform === 'xiaoxiang' || recipe.premade_analysis?.channel_name === '小象鲜食';
  }
  return platform === 'convenience_flash' || recipe.premade_analysis?.channel_name === '便利店闪电仓';
};

const PremadeFreshPage = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { data: userInfo } = useUserInfo(userId);
  const [activeTab, setActiveTab] = useState<PremadeChannelTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error, refetch } = useRecipeRecommendations(
    userId
      ? {
          user_id: userId,
          prefer_premade: true,
          refresh: false,
          dietary_mode: userInfo?.dietary_mode,
        }
      : undefined
  );

  const allRecipes = data?.premade_fresh_recipes ?? [];

  const recipes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allRecipes.filter((recipe) => {
      const matchTab = matchesChannelTab(recipe, activeTab);
      const keyword = recipe.premade_analysis?.search_keyword || recipe.name;
      const matchSearch =
        !query ||
        recipe.name.toLowerCase().includes(query) ||
        keyword.toLowerCase().includes(query);
      return matchTab && matchSearch;
    });
  }, [allRecipes, activeTab, searchQuery]);

  const handleProductClick = (recipe: RecommendationItem) => {
    openPremadeFresh({ recipes: allRecipes, focusRecipe: recipe, navigate });
  };

  if (!userId) {
    return (
      <div className="rounded-2xl bg-white py-12 text-center text-sm text-mt-text-secondary">
        请先登录后查看新鲜预制推荐
      </div>
    );
  }

  if (isLoading && !data) return <LoadingSpinner text="加载新鲜预制推荐..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="mb-4 text-mt-red">加载失败</p>
        <Button onClick={() => refetch()}>重新加载</Button>
      </div>
    );
  }

  if (allRecipes.length === 0) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="mb-2 text-mt-text-secondary">暂无新鲜预制推荐</p>
        <p className="mb-4 text-xs text-mt-text-muted">
          请先在菜谱页查看四象限推荐，或放宽筛选后重新推荐
        </p>
        <Link to="/recipes?intent=premade&tab=premade_fresh">
          <Button>返回菜谱推荐</Button>
        </Link>
      </div>
    );
  }

  return (
    <PremadeFreshView
      searchQuery={searchQuery}
      searchPlaceholder="搜索鲜食或菜品名"
      recommendationTip={
        data?.quadrant_summary?.Q4
          ? `共 ${data.quadrant_summary.Q4.count} 款新鲜预制同款 · 基于冰箱库存智能匹配`
          : '小象鲜食 / 便利店闪电仓，新鲜预制更省时'
      }
      recipes={recipes}
      activeTab={activeTab}
      onSearchQueryChange={setSearchQuery}
      onSearch={() => setSearchQuery((value) => value.trim())}
      onBack={() => navigate(-1)}
      onTabChange={setActiveTab}
      onProductClick={handleProductClick}
    />
  );
};

export default PremadeFreshPage;
