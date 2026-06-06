import { Link } from 'react-router-dom';
import { ChevronRight, Crown } from 'lucide-react';
import type { RecipeBadgeItem } from '../types/api';
import { resolveRecipeImageUrl } from '../utils/recipeImage';
import MeituanCard from './ui/MeituanCard';

interface RecentCookCardProps {
  badge?: RecipeBadgeItem;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const RecentCookCard = ({ badge }: RecentCookCardProps) => {
  if (!badge) {
    return (
      <MeituanCard className="flex h-full flex-col items-center justify-center py-10 text-center shadow-card">
        <p className="text-sm font-bold text-mt-text">最近完成</p>
        <p className="mt-2 text-xs text-mt-text-secondary">还没有做菜记录</p>
        <Link
          to="/recipes"
          className="mt-4 rounded-xl bg-mt-yellow px-4 py-2 text-xs font-semibold text-mt-text"
        >
          去选一道菜
        </Link>
      </MeituanCard>
    );
  }

  const isSpecialty = badge.cook_count >= 3 || badge.badge_tier === 'gold';

  return (
    <MeituanCard className="flex h-full flex-col !p-4 shadow-card">
      <h3 className="mb-3 text-sm font-bold text-mt-text">最近完成</h3>

      <Link
        to={`/recipes/${badge.recipe_id}`}
        className="flex flex-1 flex-col items-center text-center"
      >
        <div className="relative mb-3">
          <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-mt-yellow/30">
            <img
              src={resolveRecipeImageUrl(badge.image_url, badge.recipe_name, {
                width: 96,
                height: 96,
              })}
              alt={badge.recipe_name}
              className="h-full w-full object-cover"
            />
          </div>
          {isSpecialty && (
            <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-mt-yellow shadow-sm">
              <Crown className="h-4 w-4 fill-mt-orange text-mt-orange" />
            </span>
          )}
        </div>

        <h4 className="text-sm font-bold text-mt-text">{badge.recipe_name}</h4>
        {isSpecialty && (
          <span className="mt-1 rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-mt-orange">
            你的拿手菜
          </span>
        )}
        <p className="mt-2 text-[11px] text-mt-text-secondary">
          已做 <span className="font-semibold text-mt-orange">{badge.cook_count}</span> 次
        </p>
        <p className="mt-0.5 text-[10px] text-mt-text-muted">
          最近：{formatDate(badge.last_cooked_at)}
        </p>
      </Link>

      <Link
        to="/history/recommendations"
        className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl border border-mt-border py-2.5 text-xs font-medium text-mt-text-secondary transition-colors active:bg-mt-gray-50"
      >
        查看记录
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </MeituanCard>
  );
};

export default RecentCookCard;
