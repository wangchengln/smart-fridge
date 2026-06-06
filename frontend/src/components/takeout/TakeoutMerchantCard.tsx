import { Star } from 'lucide-react';
import type { TakeoutMerchant } from '../../types/api';
import { resolveRecipeImageUrl } from '../../utils/recipeImage';

const PROMO_TYPE_COLORS: Record<string, string> = {
  coupon: 'border-red-200 bg-red-50 text-mt-red',
  collect: 'border-orange-200 bg-orange-50 text-mt-orange',
  discount: 'border-yellow-200 bg-yellow-50 text-yellow-700',
};

interface TakeoutMerchantCardProps {
  merchant: TakeoutMerchant;
  onClick?: (merchant: TakeoutMerchant) => void;
}

const TakeoutMerchantCard = ({ merchant, onClick }: TakeoutMerchantCardProps) => {
  const imageUrl = resolveRecipeImageUrl(merchant.image_url, merchant.name, {
    width: 160,
    height: 160,
  });

  return (
    <button
      type="button"
      onClick={() => onClick?.(merchant)}
      className="flex w-full gap-3 border-b border-mt-border/50 px-4 py-3 text-left last:border-0 active:bg-mt-gray-50"
    >
      <img
        src={imageUrl}
        alt={merchant.name}
        className="h-[72px] w-[72px] shrink-0 rounded-lg bg-mt-gray-100 object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-bold text-mt-text">{merchant.name}</p>
          {merchant.is_food_plaza && (
            <span className="shrink-0 rounded bg-blue-50 px-1 py-0.5 text-[9px] text-blue-600">
              美食广场
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-mt-text-secondary">
          <span>月售{merchant.monthly_sales}</span>
          {merchant.kitchen_badge && (
            <span className="text-mt-text-muted">{merchant.kitchen_badge}</span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-mt-text-muted">
          <span>起送 ¥{merchant.min_order}</span>
          <span>{merchant.delivery_fee_label}</span>
          <span>{merchant.distance}</span>
          <span>{merchant.delivery_time}</span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px]">
          <span className="flex items-center gap-0.5 font-medium text-mt-orange">
            <Star className="h-3 w-3 fill-mt-yellow text-mt-yellow" />
            {merchant.rating.toFixed(1)}分
          </span>
          {merchant.feature_tag && (
            <span className="text-mt-text-secondary">{merchant.feature_tag}</span>
          )}
          <span className="rounded bg-blue-50 px-1 py-0.5 text-[9px] text-blue-600">
            {merchant.delivery_provider}
          </span>
          {!merchant.is_food_plaza && (
            <span className="text-[9px] text-green-600">
              匹配{(merchant.match_score * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {merchant.social_proof && (
          <p className="mt-1 line-clamp-1 text-[10px] text-mt-text-muted">
            {merchant.social_proof}
          </p>
        )}

        {merchant.promotions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {merchant.promotions.map((promo) => (
              <span
                key={`${merchant.merchant_id}-${promo.text}`}
                className={`rounded border px-1 py-0.5 text-[9px] ${
                  PROMO_TYPE_COLORS[promo.type] ?? PROMO_TYPE_COLORS.coupon
                }`}
              >
                {promo.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

export default TakeoutMerchantCard;
