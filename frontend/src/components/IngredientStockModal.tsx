import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import Button from './ui/Button';
import type { IngredientBase, IngredientStockItem } from '../types/api';

const FRESHNESS_OPTIONS = [
  { value: 'fresh', label: '新鲜' },
  { value: 'good', label: '一般' },
  { value: 'expiring', label: '临期' },
  { value: 'expired', label: '过期' },
];

const CATEGORY_OPTIONS = ['蔬菜', '水果', '肉类', '蛋类', '乳制品', '海鲜', '未分类'];

export type IngredientStockFormData = {
  ingredient_id?: number;
  ingredient_name?: string;
  category?: string;
  quantity: number;
  freshness: string;
};

type IngredientStockModalProps = {
  mode: 'add' | 'edit';
  ingredient?: IngredientStockItem & { name?: string; category?: string };
  baseIngredients: IngredientBase[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: IngredientStockFormData) => void;
};

const IngredientStockModal = ({
  mode,
  ingredient,
  baseIngredients,
  isSubmitting,
  onClose,
  onSubmit,
}: IngredientStockModalProps) => {
  const [ingredientName, setIngredientName] = useState('');
  const [category, setCategory] = useState('未分类');
  const [quantity, setQuantity] = useState('1');
  const [freshness, setFreshness] = useState('fresh');
  const [error, setError] = useState('');

  const matchedBase = useMemo(() => {
    const trimmed = ingredientName.trim();
    if (!trimmed) return null;
    return baseIngredients.find((item) => item.name === trimmed) ?? null;
  }, [ingredientName, baseIngredients]);

  useEffect(() => {
    if (mode === 'edit' && ingredient) {
      setIngredientName(ingredient.name || ingredient.ingredient_name || '');
      setCategory(ingredient.category || '未分类');
      setQuantity(String(ingredient.quantity));
      setFreshness(ingredient.freshness || 'fresh');
    } else {
      setIngredientName('');
      setCategory('未分类');
      setQuantity('1');
      setFreshness('fresh');
    }
    setError('');
  }, [mode, ingredient, baseIngredients]);

  useEffect(() => {
    if (mode === 'add' && matchedBase) {
      setCategory(matchedBase.category);
    }
  }, [mode, matchedBase]);

  const handleNameChange = (value: string) => {
    setIngredientName(value);
    const trimmed = value.trim();
    const match = baseIngredients.find((item) => item.name === trimmed);
    if (match) {
      setCategory(match.category);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = ingredientName.trim();
    const parsedQuantity = Number(quantity);

    if (mode === 'add' && !trimmedName) {
      setError('请输入食材名称');
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      setError('请输入有效数量');
      return;
    }

    if (mode === 'add') {
      if (matchedBase) {
        onSubmit({
          ingredient_id: matchedBase.id,
          quantity: parsedQuantity,
          freshness,
        });
      } else {
        onSubmit({
          ingredient_name: trimmedName,
          category,
          quantity: parsedQuantity,
          freshness,
        });
      }
      return;
    }

    if (!ingredient?.ingredient_id) {
      setError('食材信息无效');
      return;
    }

    onSubmit({
      ingredient_id: ingredient.ingredient_id,
      quantity: parsedQuantity,
      freshness,
    });
  };

  const displayName = ingredient?.name || ingredient?.ingredient_name || '未知食材';
  const listId = 'ingredient-name-suggestions';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4">
      <div className="w-full max-w-md animate-fade-in rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-mt-border px-5 py-4">
          <h2 className="text-lg font-bold text-mt-text">
            {mode === 'add' ? '添加食材' : '编辑食材'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-mt-gray-100"
          >
            <X className="h-5 w-5 text-mt-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {mode === 'edit' ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-mt-text">食材名称</label>
              <input
                type="text"
                value={displayName}
                disabled
                className="mt-input bg-mt-gray-50 text-mt-text-secondary"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-mt-text">食材名称</label>
                <input
                  type="text"
                  list={listId}
                  value={ingredientName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="输入或选择食材，如：西兰花"
                  className="mt-input"
                  autoFocus
                />
                <datalist id={listId}>
                  {baseIngredients.map((item) => (
                    <option key={item.id} value={item.name} />
                  ))}
                </datalist>
                <p className="mt-1.5 text-xs text-mt-text-muted">
                  可直接输入新食材，也可从下拉建议中选择
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-mt-text">分类</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-input"
                  disabled={Boolean(matchedBase)}
                >
                  {CATEGORY_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                {matchedBase && (
                  <p className="mt-1 text-xs text-mt-text-muted">已匹配基础库，分类自动填充</p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-mt-text">数量</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-input"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-mt-text">新鲜度</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FRESHNESS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFreshness(option.value)}
                  className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                    freshness === option.value
                      ? 'bg-mt-yellow text-mt-text'
                      : 'bg-mt-gray-100 text-mt-text-secondary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-mt-red">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IngredientStockModal;
