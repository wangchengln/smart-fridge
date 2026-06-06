import { Heart, Clock, Wallet } from 'lucide-react';
import type { RecommendationCostMetrics as CostMetrics } from '../types/api';

interface RecommendationCostMetricsProps {
  metrics?: CostMetrics;
  compact?: boolean;
}

const RecommendationCostMetrics = ({ metrics, compact = false }: RecommendationCostMetricsProps) => {
  if (!metrics) return null;

  const moneyCost = Number(metrics.money_cost) || 0;
  const finalPrice = Number(metrics.final_price) || 0;
  const couponDiscount = Number(metrics.coupon_discount) || 0;
  const noExtraSpend = moneyCost === 0 && finalPrice === 0;

  return (
    <div className={compact ? 'mt-2 space-y-1.5' : 'mt-2 space-y-2'}>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-lg bg-amber-50 px-1 py-1.5">
          <p className="flex items-center justify-center gap-0.5 text-[10px] text-mt-text-muted">
            <Wallet className="h-3 w-3" />
            {metrics.money_cost_label}
          </p>
          <p className="text-sm font-bold text-mt-orange">
            {noExtraSpend ? '¥0' : `¥${moneyCost.toFixed(0)}`}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 px-1 py-1.5">
          <p className="flex items-center justify-center gap-0.5 text-[10px] text-mt-text-muted">
            <Clock className="h-3 w-3" />
            {metrics.time_cost_label}
          </p>
          <p className="text-sm font-bold text-blue-600">{metrics.time_cost_minutes}分</p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-1 py-1.5">
          <p className="flex items-center justify-center gap-0.5 text-[10px] text-mt-text-muted">
            <Heart className="h-3 w-3" />
            {metrics.health_score_label}
          </p>
          <p className="text-sm font-bold text-emerald-600">{metrics.health_score}</p>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-mt-yellow/30 px-2.5 py-1.5">
        <span className="text-[11px] font-medium text-mt-text">{metrics.final_price_label}</span>
        <span className="text-sm font-bold text-mt-orange">
          {noExtraSpend ? '无需额外支出' : `¥${finalPrice.toFixed(2)}`}
        </span>
      </div>
      {couponDiscount > 0 && moneyCost > 0 && (
        <p className="text-center text-[10px] text-emerald-700">
          神券已减 ¥{couponDiscount.toFixed(2)}
          {metrics.coupon_name ? ` · ${metrics.coupon_name}` : ''}
        </p>
      )}
    </div>
  );
};

export default RecommendationCostMetrics;
