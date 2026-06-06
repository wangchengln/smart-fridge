import env from '../config/env';
import {
  appendHomeImageCacheBuster,
  getHomeStaticImagePath,
  type HomeImageKey,
} from './homeImageMap';

function toAbsoluteStaticUrl(path: string): string {
  const base = env.API_BASE_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function resolveHomeImageUrl(key: HomeImageKey): string {
  const localPath = getHomeStaticImagePath(key);
  return toAbsoluteStaticUrl(appendHomeImageCacheBuster(localPath));
}
