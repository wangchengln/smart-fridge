import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Calendar, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  useUserRecognitionHistory,
  useDeleteRecognitionRecord,
} from '../hooks/queries/useImageRecognitionQueries';
import {
  useClearRecommendationCache,
  useUserRecommendationHistory,
} from '../hooks/queries/useRecipeQueries';
import { useUserPurchasePlans } from '../hooks/queries/usePurchaseQueries';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import MeituanCard from '../components/ui/MeituanCard';

type HistoryType = 'recognition' | 'recommendations' | 'purchases';

interface HistoryListItem {
  id: number;
  title: string;
  description: string;
  time?: string;
  status: string;
  details: Record<string, unknown>;
}

const HistoryPage = () => {
  const { type } = useParams<{ type: string }>();
  const historyType = type as HistoryType;
  const { userId } = useAuth();
  const [timeFilter, setTimeFilter] = useState('all');

  const { data: recognitionData, isLoading: recognitionLoading } = useUserRecognitionHistory(
    historyType === 'recognition' ? userId : null,
    20
  );
  const { data: recommendationData, isLoading: recommendationLoading } =
    useUserRecommendationHistory(historyType === 'recommendations' ? userId : null);
  const { data: purchaseData, isLoading: purchaseLoading } = useUserPurchasePlans(
    historyType === 'purchases' ? userId : null
  );
  const deleteRecognitionMutation = useDeleteRecognitionRecord();
  const clearRecommendationCacheMutation = useClearRecommendationCache();

  const isLoading =
    (historyType === 'recognition' && recognitionLoading) ||
    (historyType === 'recommendations' && recommendationLoading) ||
    (historyType === 'purchases' && purchaseLoading);

  const historyData: HistoryListItem[] = (() => {
    switch (historyType) {
      case 'recognition':
        return (Array.isArray(recognitionData) ? recognitionData : []).map((item) => ({
          id: item.recognition_id,
          title: '图片识别',
          description: `识别记录 #${item.recognition_id}`,
          time: item.created_at,
          status: item.status,
          details: { recognition_id: item.recognition_id },
        }));
      case 'recommendations':
        return (recommendationData?.recommendations ?? []).map((item, index) => ({
          id: item.recipe_id || index,
          title: item.name || `菜谱 #${item.recipe_id}`,
          description: item.recommendation_reason || '菜谱推荐',
          time: item.created_at,
          status: item.is_selected ? 'selected' : 'viewed',
          details: { match_score: item.match_score },
        }));
      case 'purchases':
        return (purchaseData?.plans ?? []).map((item) => ({
          id: item.record_id ?? item.id ?? 0,
          title: `${item.plan_type === 'standard' ? '标准' : '省钱'}补购方案`,
          description: `${item.items_count || 0} 件商品 · ¥${Number(item.total_price).toFixed(2)}`,
          time: item.created_at,
          status: item.status === 'completed' ? 'delivered' : item.status,
          details: {},
        }));
      default:
        return [];
    }
  })();

  const getTypeTitle = () => {
    switch (historyType) {
      case 'recognition':
        return '识别历史';
      case 'recommendations':
        return '推荐历史';
      case 'purchases':
        return '补购记录';
      default:
        return '历史记录';
    }
  };

  const statusTextMap: Record<string, string> = {
    completed: '已完成',
    confirmed: '已确认',
    viewed: '已查看',
    selected: '已选择',
    delivered: '已送达',
    pending: '处理中',
    ordered: '已下单',
  };

  const getStatusStyle = (status: string) => {
    if (['completed', 'confirmed', 'delivered'].includes(status)) return 'mt-tag-green';
    if (['viewed', 'ordered'].includes(status)) return 'mt-tag-yellow';
    if (status === 'selected') return 'bg-purple-50 text-purple-600 mt-tag';
    return 'bg-mt-gray-100 text-mt-text-secondary mt-tag';
  };

  const handleClearRecommendationCache = async () => {
    if (!userId) return;
    if (!window.confirm('确定清除全部推荐缓存与历史记录吗？')) return;

    try {
      const result = await clearRecommendationCacheMutation.mutateAsync(userId);
      alert(result.message || '推荐缓存已清除');
    } catch {
      alert('清除推荐缓存失败，请稍后重试');
    }
  };

  const handleDelete = async (item: HistoryListItem) => {
    if (historyType !== 'recognition') {
      alert('该类型暂不支持删除');
      return;
    }
    if (!window.confirm('确定删除？')) return;
    const recognitionId = item.details.recognition_id;
    if (typeof recognitionId !== 'number') return;
    try {
      await deleteRecognitionMutation.mutateAsync(recognitionId);
    } catch {
      alert('删除失败');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const completedCount = historyData.filter((item) =>
    ['completed', 'delivered', 'confirmed'].includes(item.status)
  ).length;

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title={getTypeTitle()}
        backTo="/profile"
        backLabel="我的"
        action={
          historyType === 'recommendations' ? (
            <button
              type="button"
              onClick={handleClearRecommendationCache}
              disabled={clearRecommendationCacheMutation.isPending}
              className="rounded-xl border border-mt-border px-3 py-1.5 text-xs font-medium text-mt-text-secondary transition-colors hover:bg-mt-gray-50 disabled:opacity-50"
            >
              清除缓存
            </button>
          ) : undefined
        }
      />

      <div className="flex gap-2">
        {['all', 'today', 'week', 'month'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setTimeFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              timeFilter === f ? 'bg-mt-yellow text-mt-text' : 'bg-white text-mt-text-secondary'
            }`}
          >
            {f === 'all' ? '全部' : f === 'today' ? '今天' : f === 'week' ? '本周' : '本月'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MeituanCard className="!p-3 text-center">
          <p className="text-2xl font-bold text-mt-orange">{historyData.length}</p>
          <p className="text-[10px] text-mt-text-secondary">总记录</p>
        </MeituanCard>
        <MeituanCard className="!p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
          <p className="text-[10px] text-mt-text-secondary">已完成</p>
        </MeituanCard>
      </div>

      <div className="space-y-3">
        {historyData.map((item) => (
          <MeituanCard key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-mt-text">{item.title}</h3>
                  <span className={getStatusStyle(item.status)}>
                    {statusTextMap[item.status] ?? item.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-mt-text-secondary">{item.description}</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-mt-text-muted">
                  <Clock className="h-3 w-3" />
                  {item.time ? new Date(item.time).toLocaleString() : '-'}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="rounded-lg p-2 text-mt-text-secondary hover:bg-mt-gray-100"
                >
                  <Eye className="h-4 w-4" />
                </button>
                {historyType === 'recognition' && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="rounded-lg p-2 text-mt-red hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </MeituanCard>
        ))}
      </div>

      {historyData.length === 0 && (
        <EmptyState icon={Calendar} title="暂无记录" description="使用功能后会在这里显示" />
      )}
    </div>
  );
};

export default HistoryPage;
