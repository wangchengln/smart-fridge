import type { TakeoutMerchant, TakeoutPromotion } from '../../types/api';
import TakeoutBottomNav from './TakeoutBottomNav';
import TakeoutMerchantCard from './TakeoutMerchantCard';
import TakeoutMerchantTabs, { type TakeoutMerchantTab } from './TakeoutMerchantTabs';
import TakeoutPromotionCarousel from './TakeoutPromotionCarousel';
import TakeoutSearchHeader from './TakeoutSearchHeader';

export interface TakeoutMerchantsViewProps {
  searchQuery: string;
  searchPlaceholder?: string;
  recommendationTip: string;
  promotions: TakeoutPromotion[];
  merchants: TakeoutMerchant[];
  activeTab: TakeoutMerchantTab;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onBack: () => void;
  onTabChange: (tab: TakeoutMerchantTab) => void;
  onPromoClick?: (promo: TakeoutPromotion) => void;
  onMerchantClick?: (merchant: TakeoutMerchant) => void;
  onCartClick?: () => void;
}

const TakeoutMerchantsView = ({
  searchQuery,
  searchPlaceholder,
  recommendationTip,
  promotions,
  merchants,
  activeTab,
  onSearchQueryChange,
  onSearch,
  onBack,
  onTabChange,
  onPromoClick,
  onMerchantClick,
  onCartClick,
}: TakeoutMerchantsViewProps) => (
  <div className="-mx-4 animate-fade-in pb-24">
    <TakeoutSearchHeader
      value={searchQuery}
      placeholder={searchPlaceholder}
      onChange={onSearchQueryChange}
      onSearch={onSearch}
      onBack={onBack}
    />

    <TakeoutPromotionCarousel promotions={promotions} onPromoClick={onPromoClick} />

    <TakeoutMerchantTabs activeTab={activeTab} onTabChange={onTabChange} />

    <div className="bg-orange-50 px-4 py-2 text-xs text-mt-orange">{recommendationTip}</div>

    <div className="bg-white">
      {merchants.length === 0 ? (
        <p className="py-12 text-center text-sm text-mt-text-muted">暂无匹配商家</p>
      ) : (
        merchants.map((merchant) => (
          <TakeoutMerchantCard
            key={merchant.merchant_id}
            merchant={merchant}
            onClick={onMerchantClick}
          />
        ))
      )}
    </div>

    <TakeoutBottomNav onCartClick={onCartClick} />
  </div>
);

export default TakeoutMerchantsView;
