/**
 * 食材名称 -> AI 生成展示图文件名（与 backend INGREDIENT_LOCAL_FILENAMES 保持一致）
 */
export const INGREDIENT_IMAGE_CACHE_VERSION = 'ai-20250606-v4';

export const INGREDIENT_LOCAL_IMAGE_BY_NAME: Record<string, string> = {
  西红柿: 'tomato.jpg',
  胡萝卜: 'carrot.jpg',
  土豆: 'potato.jpg',
  洋葱: 'onion.jpg',
  苹果: 'apple.jpg',
  香蕉: 'banana.jpg',
  猪肉: 'pork.jpg',
  鸡肉: 'chicken.jpg',
  鸡蛋: 'egg.jpg',
  牛奶: 'milk.jpg',
  酸奶: 'yogurt.jpg',
  虾: 'shrimp.jpg',
  牛肉: 'beef.jpg',
  鱼: 'fish.jpg',
  豆腐: 'tofu.jpg',
  蘑菇: 'mushroom.jpg',
  大米: 'rice.jpg',
  玉米: 'corn.jpg',
  鸡翅: 'chicken-wing.jpg',
  可乐: 'cola.jpg',
  木炭: 'charcoal.jpg',
  烧烤调料: 'bbq-seasoning.jpg',
  啤酒: 'beer.jpg',
  黄瓜: 'cucumber.jpg',
  面包: 'bread.jpg',
  草莓: 'strawberry.jpg',
  葡萄: 'grape.jpg',
  西兰花: 'broccoli.jpg',
  黄椒: 'yellow-pepper.jpg',
  绿叶菜: 'leafy-greens.jpg',
  奶酪: 'cheese.jpg',
  米饭: 'cooked-rice.jpg',
  '炒菜（含芹菜、肉等）': 'stir-fry-dish.jpg',
  '果汁（深红色）': 'juice-dark-red.jpg',
  '果汁（黄色）': 'juice-yellow.jpg',
  '果汁（橙红色）': 'juice-orange-red.jpg',
  大虾: 'large-shrimp.jpg',
};

/** 与 backend slugify_ingredient_name 保持一致 */
export function slugifyIngredientName(name: string): string {
  return name.replace(/[^\w\u4e00-\u9fff-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

export function getIngredientFilename(ingredientName?: string | null): string | null {
  if (!ingredientName?.trim()) return null;
  const trimmed = ingredientName.trim();
  return INGREDIENT_LOCAL_IMAGE_BY_NAME[trimmed] ?? `${slugifyIngredientName(trimmed)}.jpg`;
}

export function getIngredientStaticImagePath(ingredientName?: string | null): string | null {
  const filename = getIngredientFilename(ingredientName);
  return filename ? `/static/images/ingredients/${filename}` : null;
}

export function appendIngredientImageCacheBuster(path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${INGREDIENT_IMAGE_CACHE_VERSION}`;
}
