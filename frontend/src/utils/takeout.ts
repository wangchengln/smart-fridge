import type { TakeoutAnalysis } from '../types/api';

/** 构建美团外卖搜索链接（演示用） */
export const buildTakeoutOrderUrl = (keyword: string, fallbackUrl?: string): string => {
  const trimmed = keyword.trim();
  if (fallbackUrl) return fallbackUrl;
  if (!trimmed) return 'https://waimai.meituan.com/';
  return `https://waimai.meituan.com/search?query=${encodeURIComponent(trimmed)}`;
};

export const openTakeoutOrder = (analysis?: TakeoutAnalysis, recipeName?: string) => {
  const url = buildTakeoutOrderUrl(
    analysis?.search_keyword || recipeName || '',
    analysis?.order_url
  );
  window.open(url, '_blank', 'noopener,noreferrer');
};

/** 打开美团外卖链接 */
export const openTakeoutOrderUrl = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/** 跳转美团外卖首页或按关键词搜索（演示用） */
export const navigateToMeituanTakeout = (keyword?: string) => {
  openTakeoutOrderUrl(buildTakeoutOrderUrl(keyword ?? ''));
};

export const formatTakeoutPrice = (price?: number) =>
  price !== undefined ? `¥${price.toFixed(0)}` : '—';
