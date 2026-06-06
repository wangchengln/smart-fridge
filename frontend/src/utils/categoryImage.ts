import env from '../config/env';
import {
  appendCategoryImageCacheBuster,
  getCategoryStaticImagePath,
} from './categoryImageMap';

function toAbsoluteStaticUrl(path: string): string {
  const base = env.API_BASE_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function resolveCategoryImageUrl(categoryKey?: string | null): string | null {
  const localPath = getCategoryStaticImagePath(categoryKey);
  if (!localPath) return null;
  return toAbsoluteStaticUrl(appendCategoryImageCacheBuster(localPath));
}

export function hasCategoryLocalImage(categoryKey?: string | null): boolean {
  return getCategoryStaticImagePath(categoryKey) != null;
}
