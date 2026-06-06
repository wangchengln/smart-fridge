/**
 * 解析菜谱封面图 URL（优先 AI 生成静态图，其次占位图）
 */
import env from '../config/env';
import {
  appendRecipeImageCacheBuster,
  getRecipeStaticImagePath,
} from './recipeImageMap';

const PLACEHOLDER_BASE = 'https://photo.bj.ide.test.sankuai.com/';

function toAbsoluteStaticUrl(path: string): string {
  const base = env.API_BASE_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

function isRemoteImageUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function isLegacyPlaceholderUrl(url: string): boolean {
  return url.includes('photo.bj.ide') || url.includes('wikimedia');
}

function resolveLocalRecipeImageUrl(recipeName?: string): string | null {
  const localPath = getRecipeStaticImagePath(recipeName);
  if (!localPath) return null;
  return toAbsoluteStaticUrl(appendRecipeImageCacheBuster(localPath));
}

export function resolveRecipeImageUrl(
  imageUrl?: string | null,
  recipeName?: string,
  size: { width: number; height: number } = { width: 400, height: 300 }
): string {
  // 1. 本地 AI 封面优先（按菜谱名映射，覆盖旧占位图与过期缓存）
  const localUrl = resolveLocalRecipeImageUrl(recipeName);
  if (localUrl) return localUrl;

  const trimmed = imageUrl?.trim();
  if (trimmed) {
    if (isRemoteImageUrl(trimmed)) {
      if (isLegacyPlaceholderUrl(trimmed)) {
        const fallbackLocalUrl = resolveLocalRecipeImageUrl(recipeName);
        if (fallbackLocalUrl) return fallbackLocalUrl;
      }
      return trimmed;
    }

    const staticPath = trimmed.split('?')[0];
    if (staticPath.includes('/static/images/recipes/')) {
      return toAbsoluteStaticUrl(appendRecipeImageCacheBuster(staticPath));
    }
    return toAbsoluteStaticUrl(trimmed);
  }

  if (recipeName) {
    return `${PLACEHOLDER_BASE}?keyword=${encodeURIComponent(recipeName)}&width=${size.width}&height=${size.height}`;
  }

  return `${PLACEHOLDER_BASE}?keyword=food&width=${size.width}&height=${size.height}`;
}
