/**
 * 首页装饰插图映射（与 backend/src/utils/home_images.py 保持一致）
 */
export const HOME_IMAGE_CACHE_VERSION = 'qwen-home-20260606-v1';

export type HomeImageKey =
  | 'hero'
  | 'meal-cook-self'
  | 'meal-flash-purchase'
  | 'meal-takeout'
  | 'meal-premade'
  | 'service-camera'
  | 'service-fridge'
  | 'service-recipes'
  | 'service-purchase'
  | 'service-weekend'
  | 'service-party';

export const HOME_IMAGE_FILES: Record<HomeImageKey, string> = {
  hero: 'home-hero.jpg',
  'meal-cook-self': 'meal-cook-self.jpg',
  'meal-flash-purchase': 'meal-flash-purchase.jpg',
  'meal-takeout': 'meal-takeout.jpg',
  'meal-premade': 'meal-premade.jpg',
  'service-camera': 'service-camera.jpg',
  'service-fridge': 'service-fridge.jpg',
  'service-recipes': 'service-recipes.jpg',
  'service-purchase': 'service-purchase.jpg',
  'service-weekend': 'service-weekend.jpg',
  'service-party': 'service-party.jpg',
};

export const MEAL_MODE_IMAGE_KEYS: Record<string, HomeImageKey> = {
  自己做: 'meal-cook-self',
  补一点做: 'meal-flash-purchase',
  直接点外卖: 'meal-takeout',
  买半成品: 'meal-premade',
};

export const SCENARIO_SERVICE_IMAGE_KEYS: Record<string, HomeImageKey> = {
  拍照识别: 'service-camera',
  我的冰箱: 'service-fridge',
  菜谱推荐: 'service-recipes',
  一键补购: 'service-purchase',
  周末补货: 'service-weekend',
  家居聚会: 'service-party',
};

export function getHomeStaticImagePath(key: HomeImageKey): string {
  const filename = HOME_IMAGE_FILES[key];
  return `/static/images/home/${filename}`;
}

export function appendHomeImageCacheBuster(path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${HOME_IMAGE_CACHE_VERSION}`;
}
