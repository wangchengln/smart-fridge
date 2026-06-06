import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import TakeoutMerchantsView from '../components/takeout/TakeoutMerchantsView';
import type { TakeoutMerchantTab } from '../components/takeout/TakeoutMerchantTabs';
import type { TakeoutMerchant, TakeoutPromotion } from '../types/api';
import { loadTakeoutContext } from '../utils/takeoutContext';
import { openTakeoutMerchantStore } from '../utils/takeoutNavigate';

const TakeoutMerchantsPage = () => {
  const navigate = useNavigate();
  const takeoutContext = useMemo(() => loadTakeoutContext(), []);
  const [activeTab, setActiveTab] = useState<TakeoutMerchantTab>('nearby');
  const [searchQuery, setSearchQuery] = useState(takeoutContext?.search_keyword ?? '');

  const promotions = takeoutContext?.promotions ?? [];
  const allMerchants = takeoutContext?.merchants ?? [];

  const merchants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allMerchants.filter((merchant) => {
      const matchTab =
        activeTab === 'nearby' ? !merchant.is_special_offer : merchant.is_special_offer;
      const matchSearch =
        !query ||
        merchant.name.toLowerCase().includes(query) ||
        merchant.feature_tag?.toLowerCase().includes(query);
      return matchTab && matchSearch;
    });
  }, [allMerchants, activeTab, searchQuery]);

  const handleMerchantClick = (merchant: TakeoutMerchant) => {
    if (!takeoutContext) return;
    openTakeoutMerchantStore(takeoutContext, merchant, navigate);
  };

  const handlePromoClick = (promo: TakeoutPromotion) => {
    if (!takeoutContext) return;
    const merchant = allMerchants.find((item) => item.recipe_id === promo.recipe_id);
    if (merchant) handleMerchantClick(merchant);
  };

  const handleSearch = () => {
    if (!searchQuery.trim() && takeoutContext?.search_keyword) {
      setSearchQuery(takeoutContext.search_keyword);
    }
  };

  if (!takeoutContext) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="mb-2 text-mt-text-secondary">暂无外卖搜索数据</p>
        <p className="mb-4 text-xs text-mt-text-muted">
          请先在菜谱页「外卖同款」中点击「点外卖」，将通过后端接口加载商家列表
        </p>
        <Link to="/recipes?tab=takeout_delivery">
          <Button>返回菜谱推荐</Button>
        </Link>
      </div>
    );
  }

  return (
    <TakeoutMerchantsView
      searchQuery={searchQuery}
      searchPlaceholder={takeoutContext.search_keyword || '搜索附近商家或菜品'}
      recommendationTip={takeoutContext.recommendation_tip}
      promotions={promotions}
      merchants={merchants}
      activeTab={activeTab}
      onSearchQueryChange={setSearchQuery}
      onSearch={handleSearch}
      onBack={() => navigate(-1)}
      onTabChange={setActiveTab}
      onPromoClick={handlePromoClick}
      onMerchantClick={handleMerchantClick}
      onCartClick={() => navigate('/takeout/store')}
    />
  );
};

export default TakeoutMerchantsPage;
