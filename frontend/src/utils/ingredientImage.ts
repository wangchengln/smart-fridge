/**
 * 解析食材展示图 URL（优先本地 AI 静态图，其次占位图）
 */
import env from '../config/env';
import {
  appendIngredientImageCacheBuster,
  getIngredientStaticImagePath,
} from './ingredientImageMap';

const PLACEHOLDER_BASE = 'https://photo.bj.ide.test.sankuai.com/';

function toAbsoluteStaticUrl(path: string): string {
  const base = env.API_BASE_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function resolveIngredientImageUrl(
  ingredientName?: string | null,
  size: { width: number; height: number } = { width: 120, height: 120 }
): string | null {
  const localPath = getIngredientStaticImagePath(ingredientName);
  if (localPath) {
    return toAbsoluteStaticUrl(appendIngredientImageCacheBuster(localPath));
  }

  if (ingredientName?.trim()) {
    return `${PLACEHOLDER_BASE}?keyword=${encodeURIComponent(ingredientName.trim())}&width=${size.width}&height=${size.height}`;
  }

  return null;
}

export function hasIngredientLocalImage(ingredientName?: string | null): boolean {
  return getIngredientStaticImagePath(ingredientName) != null;
}
