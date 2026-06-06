export const COUPON_TYPE_LABELS: Record<string, string> = {
  flash_sale: '闪购券',
  delivery: '外卖券',
  cross_store: '跨店券',
};

export const COUPON_TYPE_COLORS: Record<string, string> = {
  flash_sale: 'from-red-500 to-orange-500',
  delivery: 'from-orange-400 to-amber-400',
  cross_store: 'from-yellow-400 to-orange-400',
};

export const getCouponTypeLabel = (type: string): string =>
  COUPON_TYPE_LABELS[type] ?? '神券';

export const getCouponTypeColor = (type: string): string =>
  COUPON_TYPE_COLORS[type] ?? 'from-red-500 to-orange-500';
