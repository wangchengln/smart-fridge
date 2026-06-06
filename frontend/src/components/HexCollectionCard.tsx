import { Link } from 'react-router-dom';
import { Lock, Star } from 'lucide-react';
import type { RecipeBadgeItem } from '../types/api';
import { resolveRecipeImageUrl } from '../utils/recipeImage';

interface HexCollectionCardProps {
  badge?: RecipeBadgeItem;
  locked?: boolean;
}

const HexCollectionCard = ({ badge, locked = false }: HexCollectionCardProps) => {
  if (locked || !badge) {
    return (
      <div className="flex w-[88px] shrink-0 flex-col items-center">
        <div className="hex-card hex-card-locked">
          <div className="flex h-full w-full items-center justify-center bg-mt-gray-100">
            <Lock className="h-5 w-5 text-mt-text-muted/50" />
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-mt-text-muted">??????</p>
      </div>
    );
  }

  return (
    <Link
      to={`/recipes/${badge.recipe_id}`}
      className="flex w-[88px] shrink-0 flex-col items-center transition-transform active:scale-95"
    >
      <div className="hex-card hex-card-unlocked">
        <img
          src={resolveRecipeImageUrl(badge.image_url, badge.recipe_name, {
            width: 72,
            height: 72,
          })}
          alt={badge.recipe_name}
          className="h-full w-full object-cover"
        />
        {badge.badge_tier === 'gold' && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-mt-yellow shadow-sm">
            <Star className="h-2.5 w-2.5 fill-mt-orange text-mt-orange" />
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-1 w-full text-center text-[11px] font-medium text-mt-text">
        {badge.recipe_name}
      </p>
    </Link>
  );
};

export default HexCollectionCard;
