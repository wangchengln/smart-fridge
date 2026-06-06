import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MonthlyDayStat } from '../types/api';
import { resolveRecipeImageUrl } from '../utils/recipeImage';

interface MonthlyCookChartProps {
  year: number;
  month: number;
  dailyBreakdown: MonthlyDayStat[];
  totalCooks: number;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

const MonthlyCookChart = ({
  year,
  month,
  dailyBreakdown,
  totalCooks,
  onPrevMonth,
  onNextMonth,
}: MonthlyCookChartProps) => {
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayKey = `${year}-${String(month).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const firstDay = new Date(year, month - 1, 1);
  const jsDay = firstDay.getDay();
  const mondayOffset = jsDay === 0 ? 6 : jsDay - 1;

  const cells: (MonthlyDayStat | null)[] = [
    ...Array.from({ length: mondayOffset }, () => null),
    ...dailyBreakdown,
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <div className="h-full rounded-2xl bg-white p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {onPrevMonth && (
              <button
                type="button"
                onClick={onPrevMonth}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-mt-gray-50 transition-colors active:bg-mt-gray-100"
              >
                <ChevronLeft className="h-4 w-4 text-mt-text-secondary" />
              </button>
            )}
            <h3 className="truncate font-bold text-mt-text">
              {year}年{month}月 · 做饭日历
            </h3>
            {onNextMonth && (
              <button
                type="button"
                onClick={onNextMonth}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-mt-gray-50 transition-colors active:bg-mt-gray-100"
              >
                <ChevronRight className="h-4 w-4 text-mt-text-secondary" />
              </button>
            )}
          </div>
          <p className="mt-0.5 text-xs text-mt-text-secondary">
            本月共完成 <span className="font-semibold text-mt-orange">{totalCooks}</span> 次
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1 text-[10px] text-mt-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-mt-yellow" />
            有做菜
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-mt-gray-100" />
            无记录
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="pb-1 text-center text-[10px] font-medium text-mt-text-muted"
          >
            {label}
          </div>
        ))}

        {cells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square w-full" />;
          }

          const dayNum = Number(day.date.slice(-2));
          const hasCooked = day.count > 0;
          const isToday = isCurrentMonth && day.date === todayKey;
          const thumb = day.recipes?.[0];

          return (
            <div
              key={day.date}
              title={`${day.date}：${day.count} 次`}
              className={`relative flex aspect-square w-full flex-col items-center justify-center rounded-lg transition-colors ${
                hasCooked
                  ? isToday
                    ? 'bg-mt-yellow/60 ring-1 ring-mt-orange/50'
                    : 'bg-mt-yellow/35'
                  : isToday
                    ? 'bg-mt-gray-50 ring-1 ring-mt-orange/30'
                    : 'bg-mt-gray-50'
              }`}
            >
              {hasCooked && thumb ? (
                <img
                  src={resolveRecipeImageUrl(thumb.image_url, thumb.recipe_name, {
                    width: 24,
                    height: 24,
                  })}
                  alt=""
                  className="mb-0.5 h-4 w-4 rounded-full object-cover"
                />
              ) : null}
              <span
                className={`text-[10px] font-medium leading-none ${
                  hasCooked ? 'text-mt-orange' : 'text-mt-text-muted/70'
                }`}
              >
                {dayNum}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyCookChart;
