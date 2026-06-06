import type { NavigateFunction } from 'react-router-dom';
import type { RecommendationItem } from '../types/api';
import { savePremadeContext } from './premadeContext';

interface OpenPremadeOptions {
  recipes: RecommendationItem[];
  focusRecipe?: RecommendationItem;
  navigate: NavigateFunction;
}

/** 进入买鲜食展示页（数据来自推荐接口 premade_fresh_recipes，非 mock） */
export const openPremadeFresh = ({
  recipes,
  focusRecipe,
  navigate,
}: OpenPremadeOptions): void => {
  const analysis = focusRecipe?.premade_analysis;

  savePremadeContext({
    recipes,
    focusRecipe,
    search_keyword: analysis?.search_keyword || focusRecipe?.name,
    recommendation_tip:
      analysis?.recommendation_tip ||
      (focusRecipe
        ? `为「${focusRecipe.name}」匹配小象鲜食 / 便利店新鲜预制同款`
        : '基于冰箱库存，为你推荐可买的新鲜预制同款'),
  });

  navigate(focusRecipe ? '/premade/channels' : '/premade');
};
