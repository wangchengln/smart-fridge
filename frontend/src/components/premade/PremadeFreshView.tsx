import type { RecommendationItem } from '../../types/api';
import TakeoutSearchHeader from '../takeout/TakeoutSearchHeader';
import PremadeChannelTabs, { type PremadeChannelTab } from './PremadeChannelTabs';
import PremadeProductCard from './PremadeProductCard';

export interface PremadeFreshViewProps {
  searchQuery: string;
  searchPlaceholder?: string;
  recommendationTip: string;
  recipes: RecommendationItem[];
  activeTab: PremadeChannelTab;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onBack: () => void;
  onTabChange: (tab: PremadeChannelTab) => void;
  onProductClick?: (recipe: RecommendationItem) => void;
}

const PremadeFreshView = ({
  searchQuery,
  searchPlaceholder,
  recommendationTip,
  recipes,
  activeTab,
  onSearchQueryChange,
  onSearch,
  onBack,
  onTabChange,
  onProductClick,
}: PremadeFreshViewProps) => (
  <div className="-mx-4 animate-fade-in pb-24">
    <TakeoutSearchHeader
      value={searchQuery}
      placeholder={searchPlaceholder}
      onChange={onSearchQueryChange}
      onSearch={onSearch}
      onBack={onBack}
    />

    <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-3 text-white">
      <p className="text-sm font-bold">买鲜食 · 新鲜预制</p>
      <p className="mt-0.5 text-xs text-white/80">小象鲜食 / 便利店闪电仓，省时又新鲜</p>
    </div>

    <PremadeChannelTabs activeTab={activeTab} onTabChange={onTabChange} />

    <div className="bg-violet-50 px-4 py-2 text-xs text-violet-700">{recommendationTip}</div>

    <div className="bg-white">
      {recipes.length === 0 ? (
        <p className="py-12 text-center text-sm text-mt-text-muted">暂无匹配的新鲜预制</p>
      ) : (
        recipes.map((recipe) => (
          <PremadeProductCard
            key={`${recipe.recipe_id}-${recipe.recommendation_type}`}
            recipe={recipe}
            onBuyClick={onProductClick}
          />
        ))
      )}
    </div>
  </div>
);

export default PremadeFreshView;
