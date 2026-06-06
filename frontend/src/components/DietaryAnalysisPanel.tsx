import { AlertTriangle, ExternalLink, Flame, Heart, ShieldAlert } from 'lucide-react';
import type { DietaryMode, RecipeDietaryAnalysisResponse } from '../types/api';
import MeituanCard from './ui/MeituanCard';

interface DietaryAnalysisPanelProps {
  analysis: RecipeDietaryAnalysisResponse;
  dietaryMode: DietaryMode;
}

const TAG_COLORS: Record<string, string> = {
  高热量: 'bg-red-100 text-red-700',
  低卡: 'bg-emerald-100 text-emerald-700',
  高钠: 'bg-orange-100 text-orange-700',
  低钠: 'bg-emerald-100 text-emerald-700',
  高糖: 'bg-amber-100 text-amber-700',
  低糖: 'bg-emerald-100 text-emerald-700',
  高钾: 'bg-purple-100 text-purple-700',
};

const DietaryAnalysisPanel = ({ analysis, dietaryMode }: DietaryAnalysisPanelProps) => {
  if (dietaryMode === 'normal') return null;

  const hasConflicts = analysis.medication_conflicts.length > 0;

  return (
    <MeituanCard className="space-y-4 border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-mt-text">
          {dietaryMode === 'fat_loss' ? (
            <Flame className="h-5 w-5 text-orange-500" />
          ) : (
            <Heart className="h-5 w-5 text-emerald-600" />
          )}
          {analysis.mode_label} · 营养分析
        </h2>
        {dietaryMode === 'fat_loss' && analysis.fat_loss_rating && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              analysis.fat_loss_rating === '推荐'
                ? 'bg-emerald-100 text-emerald-700'
                : analysis.fat_loss_rating === '适中'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            {analysis.fat_loss_rating}
          </span>
        )}
      </div>

      {dietaryMode === 'fat_loss' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-mt-text-secondary">总热量</p>
            <p className="text-lg font-bold text-mt-orange">{analysis.total_calories} kcal</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-mt-text-secondary">人均热量</p>
            <p className="text-lg font-bold text-mt-orange">
              {analysis.calories_per_serving} kcal
            </p>
          </div>
        </div>
      )}

      {dietaryMode === 'parents' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-mt-text-secondary">钠含量（人均）</p>
            <p className="text-lg font-bold text-mt-text">
              {Math.round(analysis.total_sodium_mg / analysis.servings)} mg
            </p>
            <span className="text-[10px] text-mt-text-muted">等级：{analysis.sodium_level}</span>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-mt-text-secondary">糖含量（人均）</p>
            <p className="text-lg font-bold text-mt-text">
              {Math.round((analysis.total_sugar_g / analysis.servings) * 10) / 10} g
            </p>
            <span className="text-[10px] text-mt-text-muted">等级：{analysis.sugar_level}</span>
          </div>
        </div>
      )}

      {(analysis.fat_loss_tip || analysis.parents_tip) && (
        <p className="text-xs leading-relaxed text-mt-text-secondary">
          {analysis.fat_loss_tip || analysis.parents_tip}
        </p>
      )}

      {hasConflicts && (
        <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-red-700">
            <ShieldAlert className="h-4 w-4" />
            用药冲突提醒
          </div>
          {analysis.medication_conflicts.map((conflict) => (
            <div key={conflict.type} className="space-y-2">
              <p className="text-xs leading-relaxed text-red-800">{conflict.message}</p>
              {conflict.meituan_pharmacy_url && (
                <a
                  href={conflict.meituan_pharmacy_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-mt-orange shadow-sm transition-colors hover:bg-orange-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {conflict.meituan_pharmacy_label || '美团买药'}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-mt-text-secondary">食材营养标签</p>
        {analysis.ingredients.map((ing) => (
          <div
            key={ing.name}
            className="flex items-start justify-between gap-2 rounded-xl bg-white px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-mt-text">{ing.name}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {ing.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TAG_COLORS[tag] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0 text-right text-[10px] text-mt-text-muted">
              {dietaryMode === 'fat_loss' && <p>{ing.calories} kcal</p>}
              {dietaryMode === 'parents' && (
                <>
                  <p>钠 {ing.sodium_mg} mg</p>
                  <p>糖 {ing.sugar_g} g</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {analysis.warnings.length > 0 && !hasConflicts && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <ul className="space-y-1 text-xs text-amber-800">
            {analysis.warnings.slice(0, 3).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </MeituanCard>
  );
};

export default DietaryAnalysisPanel;
