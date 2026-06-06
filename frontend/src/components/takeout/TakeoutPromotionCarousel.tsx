import type { TakeoutPromotion } from '../../types/api';
import { resolveRecipeImageUrl } from '../../utils/recipeImage';

interface TakeoutPromotionCarouselProps {
  promotions: TakeoutPromotion[];
  onPromoClick?: (promo: TakeoutPromotion) => void;
}

const TakeoutPromotionCarousel = ({
  promotions,
  onPromoClick,
}: TakeoutPromotionCarouselProps) => {
  if (promotions.length === 0) return null;

  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto bg-white px-3 py-3">
      {promotions.map((promo) => {
        const imageUrl = resolveRecipeImageUrl(promo.image_url, promo.title, {
          width: 120,
          height: 90,
        });

        return (
          <button
            key={promo.id}
            type="button"
            onClick={() => onPromoClick?.(promo)}
            className="flex w-[108px] shrink-0 flex-col overflow-hidden rounded-xl border border-mt-border/60 bg-white text-left shadow-sm active:scale-[0.98]"
          >
            <div className="relative">
              <img src={imageUrl} alt={promo.title} className="h-[72px] w-full object-cover" />
              <span className="absolute left-1 top-1 rounded bg-mt-red px-1 py-0.5 text-[9px] font-medium text-white">
                {promo.badge}
              </span>
            </div>
            <div className="px-1.5 py-1.5">
              <p className="line-clamp-1 text-[10px] font-medium text-mt-text">{promo.title}</p>
              <p className="mt-0.5 text-[11px] font-bold text-mt-red">
                ¥{Number(promo.price).toFixed(1)}{' '}
                <span className="text-[9px] font-normal text-mt-text-muted">
                  {promo.price_label}
                </span>
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default TakeoutPromotionCarousel;
