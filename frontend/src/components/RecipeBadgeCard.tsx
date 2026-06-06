import { Link } from 'react-router-dom';
import type { RecipeBadgeItem } from '../types/api';
import { resolveRecipeImageUrl } from '../utils/recipeImage';

const TIER_STYLES: Record<string, string> = {
  gold: 'from-amber-100 to-yellow-50 ring-amber-300',
  silver: 'from-slate-100 to-gray-50 ring-slate-300',
  bronze: 'from-orange-50 to-amber-50 ring-orange-200',
};

const TIER_LABEL: Record<string, string> = {
  gold: '金牌',
  silver: '银牌',
  bronze: '铜牌',
};

interface RecipeBadgeCardProps {
  badge: RecipeBadgeItem;
}

const RecipeBadgeCard = ({ badge }: RecipeBadgeCardProps) => {
  const tierStyle = TIER_STYLES[badge.badge_tier] ?? TIER_STYLES.bronze;
  const tierLabel = TIER_LABEL[badge.badge_tier] ?? '徽章';

  return (
    <Link
      to={`/recipes/${badge.recipe_id}`}
      className={`block overflow-hidden rounded-2xl bg-gradient-to-br ring-2 ${tierStyle} shadow-sm transition-transform active:scale-[0.98]`}
    >
      <div className="relative p-3">
        <div className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-mt-orange">
          {tierLabel}
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-2">
            <img
              src={resolveRecipeImageUrl(badge.image_url, badge.recipe_name, {
                width: 80,
                height: 80,
              })}
              alt={badge.recipe_name}
              className="h-16 w-16 rounded-xl object-cover ring-2 ring-white"
            />
            <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg shadow">
              {badge.badge_emoji}
            </span>
          </div>
          <h4 className="line-clamp-1 text-sm font-bold text-mt-text">{badge.recipe_name}</h4>
          <p className="mt-1 text-[10px] text-mt-text-secondary">
            做过 {badge.cook_count} 次
          </p>
          <p className="mt-0.5 text-[9px] text-mt-text-muted">
            {new Date(badge.first_cooked_at).toLocaleDateString()} 解锁
          </p>
        </div>
      </div>
    </Link>
  );
};

export default RecipeBadgeCard;
