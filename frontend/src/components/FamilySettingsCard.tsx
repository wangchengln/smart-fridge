import { useEffect, useState } from 'react';
import { Flame, Heart, Minus, Plus, User, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUpdateUserInfo, useUserInfo } from '../hooks/queries/useUserQueries';
import { DIETARY_MODE_LABELS, type DietaryMode } from '../types/api';
import Button from './ui/Button';

const DIETARY_MODES: DietaryMode[] = ['normal', 'fat_loss', 'parents'];

const MODE_ICONS: Record<DietaryMode, typeof Users> = {
  normal: Users,
  fat_loss: Flame,
  parents: Heart,
};

interface FamilySettingsCardProps {
  displayName: string;
}

const FamilySettingsCard = ({ displayName }: FamilySettingsCardProps) => {
  const { userId } = useAuth();
  const { data: userInfo } = useUserInfo(userId);
  const updateMutation = useUpdateUserInfo();

  const [familyCount, setFamilyCount] = useState(userInfo?.family_count ?? 2);
  const [dietaryMode, setDietaryMode] = useState<DietaryMode>(
    userInfo?.dietary_mode ?? 'normal'
  );
  const [onAntihypertensive, setOnAntihypertensive] = useState(
    userInfo?.on_antihypertensive ?? false
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userInfo) return;
    setFamilyCount(userInfo.family_count);
    setDietaryMode(userInfo.dietary_mode ?? 'normal');
    setOnAntihypertensive(userInfo.on_antihypertensive ?? false);
  }, [userInfo]);

  const handleSave = async () => {
    if (!userId) return;
    try {
      await updateMutation.mutateAsync({
        userId,
        data: {
          family_count: familyCount,
          dietary_mode: dietaryMode,
          on_antihypertensive: onAntihypertensive,
          parent_mode: dietaryMode === 'parents',
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('保存失败，请稍后重试');
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card">
      <div className="relative p-4">
        <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-[3rem] bg-mt-yellow/15" />

        <div className="relative grid grid-cols-2 items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mt-yellow shadow-sm">
              <User className="h-7 w-7 text-mt-text" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-mt-text">{displayName}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-xs text-mt-text-secondary">家庭人数</span>
                <div className="flex items-center gap-1 rounded-full bg-mt-gray-50 px-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => setFamilyCount((c) => Math.max(1, c - 1))}
                    disabled={familyCount <= 1}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-mt-text-secondary transition-colors hover:bg-white disabled:opacity-40"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-[1.5rem] text-center text-sm font-bold text-mt-text">
                    {familyCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFamilyCount((c) => Math.min(12, c + 1))}
                    disabled={familyCount >= 12}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-mt-text-secondary transition-colors hover:bg-white disabled:opacity-40"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="text-xs text-mt-text-muted">人</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-mt-yellow/10 px-3 py-2.5">
            <p className="mb-2 text-center text-xs font-semibold text-mt-text-secondary">
              饮食模式
            </p>
            <div className="flex flex-col gap-1.5">
              {DIETARY_MODES.map((mode) => {
                const Icon = MODE_ICONS[mode];
                const selected = dietaryMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDietaryMode(mode)}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? 'bg-mt-yellow text-mt-text shadow-sm'
                        : 'bg-white/80 text-mt-text-secondary hover:bg-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="whitespace-nowrap">{DIETARY_MODE_LABELS[mode]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {dietaryMode === 'parents' && (
        <div className="border-t border-amber-100 bg-gradient-to-r from-amber-50/80 to-yellow-50/50 px-4 py-3">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={onAntihypertensive}
              onChange={(e) => setOnAntihypertensive(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600"
            />
            <div>
              <p className="text-xs font-semibold text-emerald-800">父母模式 · 降压药监测</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-emerald-700">
                识别低钠低糖食材，检测高钾冲突并联动买药提醒
              </p>
            </div>
          </label>
        </div>
      )}

      <div className="border-t border-mt-border/60 px-4 py-3">
        <Button fullWidth onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? '保存中...' : saved ? '已保存 ✓' : '保存设置'}
        </Button>
      </div>
    </div>
  );
};

export default FamilySettingsCard;
