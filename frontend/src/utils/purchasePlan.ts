export const TIER_LABELS: Record<string, string> = {
  premium: '优选',
  standard: '常规',
  economy: '实惠',
};

export const TIER_STYLES: Record<string, string> = {
  premium: 'bg-amber-50 text-amber-700',
  standard: 'bg-blue-50 text-blue-600',
  economy: 'bg-emerald-50 text-emerald-700',
};

export const getTierLabel = (tier?: string): string =>
  (tier && TIER_LABELS[tier]) || '常规';

export const getTierStyle = (tier?: string): string =>
  (tier && TIER_STYLES[tier]) || TIER_STYLES.standard;
