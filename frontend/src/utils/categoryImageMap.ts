/**
 * 冰箱侧栏分类 -> AI 图标文件名（与 backend CATEGORY_LOCAL_FILENAMES 保持一致）
 */
export const CATEGORY_IMAGE_CACHE_VERSION = 'ai-20250606-v3';

export const CATEGORY_LOCAL_IMAGE_BY_KEY: Record<string, string> = {
  '': 'all.jpg',
  蔬菜: 'vegetable.jpg',
  水果: 'fruit.jpg',
  肉类: 'meat.jpg',
  蛋类: 'egg.jpg',
  乳制品: 'dairy.jpg',
  海鲜: 'seafood.jpg',
  豆制品: 'bean-product.jpg',
  菌类: 'fungus.jpg',
  粮食: 'grain.jpg',
  调料: 'seasoning.jpg',
  用品: 'supplies.jpg',
  饮品: 'beverage.jpg',
  未分类: 'other.jpg',
};

export const CATEGORY_EMOJI_FALLBACK: Record<string, string> = {
  '': '🧊',
  蔬菜: '🥬',
  水果: '🍎',
  肉类: '🥩',
  蛋类: '🥚',
  乳制品: '🥛',
  海鲜: '🦐',
  豆制品: '🫘',
  菌类: '🍄',
  粮食: '🌾',
  调料: '🧂',
  用品: '📦',
  饮品: '🥤',
  未分类: '📦',
};

export function getCategoryStaticImagePath(categoryKey?: string | null): string | null {
  const key = categoryKey ?? '';
  const filename = CATEGORY_LOCAL_IMAGE_BY_KEY[key];
  return filename ? `/static/images/ingredients/categories/${filename}` : null;
}

export function appendCategoryImageCacheBuster(path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${CATEGORY_IMAGE_CACHE_VERSION}`;
}
