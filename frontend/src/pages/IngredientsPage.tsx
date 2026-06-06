import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, Edit, Trash2, AlertTriangle, Package } from 'lucide-react';
import {
  useUserIngredients,
  useDeleteStock,
  useBatchUpdateNearExpiry,
  useCreateStock,
  useUpdateStock,
  useIngredientBaseList,
} from '../hooks/queries/useIngredientQueries';
import { useAuth } from '../context/AuthContext';
import IngredientStockModal, {
  type IngredientStockFormData,
} from '../components/IngredientStockModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import type { IngredientStockItem, UserIngredientsListResponse } from '../types/api';
import {
  hasIngredientLocalImage,
  resolveIngredientImageUrl,
} from '../utils/ingredientImage';
import {
  hasCategoryLocalImage,
  resolveCategoryImageUrl,
} from '../utils/categoryImage';
import { CATEGORY_EMOJI_FALLBACK } from '../utils/categoryImageMap';

type DisplayIngredient = IngredientStockItem & {
  name: string;
  category: string;
};

type MergedDisplayIngredient = DisplayIngredient & {
  stockIds: number[];
};

const FRESHNESS_PRIORITY: Record<string, number> = {
  expired: 4,
  expiring: 3,
  normal: 2,
  good: 2,
  fresh: 1,
};

const normalizeIngredient = (item: IngredientStockItem): DisplayIngredient => ({
  ...item,
  name: item.name || item.ingredient_name || '未知食材',
  category: item.category || '未分类',
});

const getMergeKey = (item: DisplayIngredient) =>
  item.ingredient_id ? `id:${item.ingredient_id}` : `name:${item.name.trim()}`;

const mergeSameIngredients = (list: DisplayIngredient[]): MergedDisplayIngredient[] => {
  const merged = new Map<string, MergedDisplayIngredient>();

  for (const item of list) {
    const key = getMergeKey(item);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { ...item, stockIds: [item.id] });
      continue;
    }

    existing.quantity += item.quantity;
    existing.stockIds.push(item.id);
    existing.near_expiry = existing.near_expiry || item.near_expiry;

    const currentPriority = FRESHNESS_PRIORITY[item.freshness] ?? 0;
    const existingPriority = FRESHNESS_PRIORITY[existing.freshness] ?? 0;
    if (currentPriority > existingPriority) {
      existing.freshness = item.freshness;
    }
  }

  return Array.from(merged.values());
};

const isStockListResponse = (
  data: UserIngredientsListResponse | IngredientStockItem[] | undefined
): data is UserIngredientsListResponse => {
  return data != null && !Array.isArray(data) && 'stocks' in data;
};

const ALL_CATEGORY = '';
const CATEGORY_LIST = [
  '蔬菜',
  '水果',
  '肉类',
  '蛋类',
  '乳制品',
  '海鲜',
  '豆制品',
  '菌类',
  '粮食',
  '调料',
  '用品',
  '饮品',
  '未分类',
] as const;

const getFreshnessStyle = (freshness: string) => {
  switch (freshness) {
    case 'fresh':
      return 'mt-tag-green';
    case 'normal':
    case 'good':
      return 'mt-tag-yellow';
    case 'expired':
    case 'expiring':
      return 'mt-tag-red';
    default:
      return 'bg-mt-gray-100 text-mt-text-secondary mt-tag';
  }
};

const CategorySidebarIcon = ({ categoryKey }: { categoryKey: string }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const emoji = CATEGORY_EMOJI_FALLBACK[categoryKey] ?? '📦';
  const imageUrl = resolveCategoryImageUrl(categoryKey);
  const showImage = hasCategoryLocalImage(categoryKey) && imageUrl && !imageFailed;

  if (!showImage) {
    return <span className="block text-lg leading-none">{emoji}</span>;
  }

  return (
    <img
      src={imageUrl}
      alt={categoryKey || '全部'}
      className="mx-auto block h-7 w-7 rounded-full object-cover"
      onError={() => setImageFailed(true)}
    />
  );
};

const IngredientThumbnail = ({
  name,
  category,
}: {
  name: string;
  category: string;
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const emoji = CATEGORY_EMOJI_FALLBACK[category] ?? '📦';
  const imageUrl = resolveIngredientImageUrl(name, { width: 120, height: 120 });
  const showImage = hasIngredientLocalImage(name) && imageUrl && !imageFailed;

  if (!showImage) {
    return (
      <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-lg bg-mt-yellow-light text-2xl">
        {emoji}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      className="h-[60px] w-[60px] shrink-0 rounded-lg bg-mt-gray-100 object-cover"
      onError={() => setImageFailed(true)}
    />
  );
};

const getFreshnessText = (freshness: string) => {
  switch (freshness) {
    case 'fresh':
      return '新鲜';
    case 'normal':
    case 'good':
      return '一般';
    case 'expiring':
      return '临期';
    case 'expired':
      return '过期';
    default:
      return freshness;
  }
};

const IngredientsPage = () => {
  const { userId } = useAuth();
  const listRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [selectedIngredients, setSelectedIngredients] = useState<number[]>([]);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<MergedDisplayIngredient | null>(null);

  const { data, isLoading, error, refetch } = useUserIngredients(userId);
  const { data: baseData } = useIngredientBaseList();
  const deleteStockMutation = useDeleteStock();
  const createStockMutation = useCreateStock();
  const updateStockMutation = useUpdateStock();
  const batchUpdateMutation = useBatchUpdateNearExpiry();

  const baseIngredients = baseData?.ingredients ?? [];

  const ingredients = useMemo(() => {
    const list = isStockListResponse(data) ? data.stocks : Array.isArray(data) ? data : [];
    return mergeSameIngredients(list.map(normalizeIngredient));
  }, [data]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of ingredients) {
      const cat = item.category || '未分类';
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return counts;
  }, [ingredients]);

  const categories = useMemo(() => {
    const cats: { key: string; label: string; count: number }[] = [
      { key: ALL_CATEGORY, label: '全部', count: ingredients.length },
    ];

    for (const cat of CATEGORY_LIST) {
      cats.push({ key: cat, label: cat, count: categoryCounts.get(cat) ?? 0 });
    }

    for (const [cat, count] of categoryCounts) {
      if (!CATEGORY_LIST.includes(cat as (typeof CATEGORY_LIST)[number])) {
        cats.push({ key: cat, label: cat, count });
      }
    }

    return cats;
  }, [ingredients.length, categoryCounts]);

  const filteredIngredients = useMemo(() => {
    let filtered = ingredients;
    if (searchTerm) {
      filtered = filtered.filter((i) =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (activeCategory) {
      filtered = filtered.filter((i) => i.category === activeCategory);
    }
    return filtered;
  }, [ingredients, searchTerm, activeCategory]);

  useEffect(() => {
    setSelectedIngredients((prev) =>
      prev.filter((id) =>
        ingredients.some((item) => item.stockIds.includes(id))
      )
    );
  }, [ingredients]);

  const handleSaveIngredient = async (formData: IngredientStockFormData) => {
    if (!userId) {
      alert('请先登录');
      return;
    }
    try {
      if (modalMode === 'add') {
        await createStockMutation.mutateAsync({ ...formData, user_id: userId });
        alert('添加成功');
      } else if (modalMode === 'edit' && editingIngredient) {
        const [primaryStockId, ...duplicateStockIds] = editingIngredient.stockIds;
        await updateStockMutation.mutateAsync({
          stockId: primaryStockId,
          data: formData,
        });
        for (const stockId of duplicateStockIds) {
          await deleteStockMutation.mutateAsync(stockId);
        }
        alert('更新成功');
      }
      setModalMode(null);
      setEditingIngredient(null);
    } catch (err) {
      console.error('保存食材失败:', err);
      alert('保存失败，请稍后重试');
    }
  };

  const handleDeleteIngredient = async (ingredient: MergedDisplayIngredient) => {
    const stockIds = ingredient.stockIds;
    const confirmMessage =
      stockIds.length > 1
        ? `「${ingredient.name}」已合并 ${stockIds.length} 条记录，确定全部删除吗？`
        : '确定要删除这个食材吗？';
    if (!window.confirm(confirmMessage)) return;

    try {
      for (const stockId of stockIds) {
        await deleteStockMutation.mutateAsync(stockId);
      }
      alert('删除成功');
    } catch (err) {
      console.error('删除食材失败:', err);
      alert('删除失败，请稍后重试');
    }
  };

  const handleBatchUpdate = async () => {
    if (selectedIngredients.length === 0) {
      alert('请选择要操作的食材');
      return;
    }
    if (!userId) return;
    try {
      await batchUpdateMutation.mutateAsync({
        user_id: userId,
        stock_ids: selectedIngredients,
        near_expiry: false,
      });
      setSelectedIngredients([]);
      alert('批量更新成功');
    } catch (err) {
      console.error('批量更新失败:', err);
      alert('批量更新失败，请稍后重试');
    }
  };

  if (isLoading) return <LoadingSpinner text="加载冰箱库存..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="mb-4 text-mt-red">加载失败，请稍后重试</p>
        <Button onClick={() => refetch()}>重新加载</Button>
      </div>
    );
  }

  const activeCategoryLabel =
    categories.find((c) => c.key === activeCategory)?.label ?? '全部';

  return (
    <div className="-mx-4 animate-fade-in pb-4">
      {/* 顶部搜索栏 */}
      <div className="sticky top-12 z-20 bg-white px-4 pb-2 pt-1 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-mt-gray-50 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-mt-text-muted" />
            <input
              type="search"
              placeholder="搜索冰箱食材"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-sm text-mt-text outline-none placeholder:text-mt-text-muted"
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingIngredient(null);
              setModalMode('add');
            }}
          >
            <Plus className="h-4 w-4" />
            添加
          </Button>
        </div>
        <p className="mt-2 text-xs text-mt-text-secondary">
          共 {ingredients.length} 种食材
          {activeCategory && ` · ${activeCategoryLabel} ${filteredIngredients.length} 种`}
        </p>
      </div>

      {selectedIngredients.length > 0 && (
        <div className="mx-4 mt-2 flex items-center justify-between rounded-xl bg-mt-yellow-light px-4 py-3">
          <span className="text-sm font-medium text-mt-text">已选 {selectedIngredients.length} 项</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleBatchUpdate} disabled={batchUpdateMutation.isPending}>
              标记正常
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIngredients([])}>
              取消
            </Button>
          </div>
        </div>
      )}

      {/* 左侧分类 + 右侧食材（小象超市布局） */}
      <div className="mt-2 flex bg-white" style={{ minHeight: 'calc(100vh - 14rem)' }}>
        <div className="w-[72px] shrink-0 border-r border-mt-border bg-mt-gray-50">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => {
                setActiveCategory(cat.key);
                listRef.current?.scrollTo({ top: 0 });
              }}
              className={`relative w-full px-1 py-3.5 text-center transition-colors ${
                activeCategory === cat.key
                  ? 'bg-white font-bold text-mt-text'
                  : 'text-mt-text-secondary'
              }`}
            >
              {activeCategory === cat.key && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-mt-yellow" />
              )}
              <CategorySidebarIcon categoryKey={cat.key} />
              <span className="mt-1 block text-[11px] leading-tight">{cat.label}</span>
              {cat.count > 0 && (
                <span className="mt-0.5 block text-[10px] text-mt-text-muted">{cat.count}</span>
              )}
            </button>
          ))}
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2">
          {filteredIngredients.length === 0 ? (
            ingredients.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={Package}
                  title="冰箱还是空的"
                  description="拍照识别或手动添加食材吧"
                  action={
                    <Button
                      onClick={() => {
                        setEditingIngredient(null);
                        setModalMode('add');
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      添加食材
                    </Button>
                  }
                />
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-mt-text-muted">
                {searchTerm ? '没有找到匹配的食材' : `${activeCategoryLabel}暂无食材`}
              </p>
            )
          ) : (
            filteredIngredients.map((ingredient) => {
              const isSelected = ingredient.stockIds.every((id) =>
                selectedIngredients.includes(id)
              );
              return (
                <div
                  key={ingredient.stockIds.join('-')}
                  className="flex gap-2 border-b border-mt-border/60 py-3 last:border-0"
                >
                  <label className="flex shrink-0 items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIngredients((prev) => [
                            ...prev,
                            ...ingredient.stockIds.filter((id) => !prev.includes(id)),
                          ]);
                        } else {
                          setSelectedIngredients((prev) =>
                            prev.filter((id) => !ingredient.stockIds.includes(id))
                          );
                        }
                      }}
                      className="h-4 w-4 rounded accent-mt-yellow"
                    />
                  </label>
                  <IngredientThumbnail
                    name={ingredient.name}
                    category={ingredient.category}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-mt-text">{ingredient.name}</p>
                      {ingredient.stockIds.length > 1 && (
                        <span className="shrink-0 rounded bg-mt-yellow-light px-1.5 py-0.5 text-[9px] font-medium text-mt-orange">
                          {ingredient.stockIds.length}批
                        </span>
                      )}
                      {(ingredient.near_expiry ||
                        ingredient.freshness === 'expiring' ||
                        ingredient.freshness === 'expired') && (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-mt-orange" />
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`${getFreshnessStyle(ingredient.freshness)} text-[10px]`}>
                        {getFreshnessText(ingredient.freshness)}
                      </span>
                      <span className="text-xs text-mt-text-muted">×{ingredient.quantity}</span>
                    </div>
                    <div className="mt-auto flex items-center justify-end gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIngredient(ingredient);
                          setModalMode('edit');
                        }}
                        className="rounded-lg p-1.5 text-mt-text-secondary hover:bg-mt-gray-100"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteIngredient(ingredient)}
                        disabled={deleteStockMutation.isPending}
                        className="rounded-lg p-1.5 text-mt-red hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {modalMode && (
        <IngredientStockModal
          mode={modalMode}
          ingredient={editingIngredient ?? undefined}
          baseIngredients={baseIngredients}
          isSubmitting={createStockMutation.isPending || updateStockMutation.isPending}
          onClose={() => { setModalMode(null); setEditingIngredient(null); }}
          onSubmit={handleSaveIngredient}
        />
      )}
    </div>
  );
};

export default IngredientsPage;
