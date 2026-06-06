/**
 * 菜谱名称 -> AI 生成封面图文件名（与 backend RECIPE_LOCAL_FILENAMES 保持一致）
 */
/** AI 封面图批量更新后递增，用于破坏浏览器对旧占位图的缓存 */
export const RECIPE_IMAGE_CACHE_VERSION = 'ai-20250606';

export const RECIPE_LOCAL_IMAGE_BY_NAME: Record<string, string> = {
  西红柿炒鸡蛋: 'tomato-scrambled-eggs.jpg',
  番茄土豆炒鸡蛋: 'tomato-potato-eggs.jpg',
  清炒土豆丝: 'shredded-potato.jpg',
  胡萝卜炒鸡蛋: 'carrot-scrambled-eggs.jpg',
  洋葱炒鸡蛋: 'onion-scrambled-eggs.jpg',
  土豆烧猪肉: 'pork-potato-stew.jpg',
  胡萝卜土豆炖猪肉: 'pork-carrot-potato-stew.jpg',
  牛奶蒸蛋: 'steamed-egg-milk.jpg',
  酸奶香蕉杯: 'yogurt-banana.jpg',
  虾仁滑蛋: 'shrimp-scrambled-eggs.jpg',
  苹果酸奶沙拉: 'apple-yogurt-salad.jpg',
  香煎鸡胸肉: 'pan-fried-chicken-breast.jpg',
  胡萝卜炖鸡肉: 'chicken-carrot-stew.jpg',
  洋葱炒猪肉: 'pork-onion-stir-fry.jpg',
  香蕉牛奶昔: 'banana-milkshake.jpg',
  宫保鸡丁: 'kung-pao-chicken.jpg',
  鱼香肉丝: 'yuxiang-shredded-pork.jpg',
  酸辣土豆丝: 'hot-sour-shredded-potato.jpg',
  麻婆豆腐: 'mapo-tofu.jpg',
  地三鲜: 'di-san-xian.jpg',
  可乐炖鸡肉: 'cola-chicken.jpg',
  糖醋猪肉: 'sweet-sour-pork.jpg',
  油焖大虾: 'braised-shrimp.jpg',
  清蒸鱼: 'steamed-fish.jpg',
  经典红烧肉: 'red-braised-pork.jpg',
  番茄蛋花汤: 'tomato-egg-drop-soup.jpg',
  土豆炖牛肉: 'beef-potato-stew.jpg',
  洋葱土豆片: 'potato-onion-slices.jpg',
  胡萝卜炒牛肉: 'beef-carrot-stir-fry.jpg',
  蘑菇炒鸡肉: 'mushroom-chicken.jpg',
  豆腐炖鱼: 'fish-tofu-stew.jpg',
  虾仁烧豆腐: 'shrimp-tofu.jpg',
  香蒜胡萝卜: 'garlic-carrot.jpg',
  双色土豆丝: 'two-color-potato-shreds.jpg',
  苹果温奶饮: 'apple-warm-milk.jpg',
  酸奶苹果捞: 'apple-yogurt-mix.jpg',
  蘑菇鸡汤: 'mushroom-chicken-soup.jpg',
  洋葱炒牛肉: 'beef-onion-stir-fry.jpg',
  香煎鱼: 'pan-fried-fish.jpg',
  蛋炒饭: 'egg-fried-rice.jpg',
  西红柿土豆汤: 'tomato-potato-soup.jpg',
  胡萝卜奶香羹: 'carrot-cream-soup.jpg',
  冷冻香蕉酸奶: 'frozen-banana-yogurt.jpg',
  虾炒蛋: 'shrimp-egg-stir-fry.jpg',
  豆腐蒸蛋: 'tofu-steamed-egg.jpg',
  牛肉时蔬盖饭: 'beef-rice-bowl.jpg',
  三鲜豆腐汤: 'three-fresh-tofu-soup.jpg',
  土豆焖牛肉: 'beef-potato-braise.jpg',
  鱼香豆腐: 'yuxiang-tofu.jpg',
  家常木须肉: 'moo-shu-pork.jpg',
};

export function getRecipeStaticImagePath(recipeName?: string | null): string | null {
  if (!recipeName?.trim()) return null;
  const filename = RECIPE_LOCAL_IMAGE_BY_NAME[recipeName.trim()];
  return filename ? `/static/images/recipes/${filename}` : null;
}

export function appendRecipeImageCacheBuster(path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${RECIPE_IMAGE_CACHE_VERSION}`;
}
