import { useEffect, useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAnalyzeMissingIngredients } from '../hooks/queries/usePurchaseQueries';
import { useRecipeDetail } from '../hooks/queries/useRecipeQueries';
import { savePurchaseContext } from '../utils/purchaseContext';
import { resolveRecipeImageUrl } from '../utils/recipeImage';
import { clampServings, getBaseServings } from '../utils/recipeServings';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import MeituanCard from '../components/ui/MeituanCard';
import PageHeader from '../components/ui/PageHeader';

const PurchaseAnalyzePage = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recipeId = Number(searchParams.get('recipe_id')) || 1;
  const recipeName = searchParams.get('name') || '所选菜谱';
  const servingsParam = Number(searchParams.get('servings'));

  const analyzeMutation = useAnalyzeMissingIngredients();
  const { data: recipeDetail } = useRecipeDetail(recipeId > 0 ? recipeId : null);

  const baseServings = getBaseServings(recipeDetail?.serving_size);
  const servings = clampServings(
    Number.isFinite(servingsParam) && servingsParam > 0
      ? servingsParam
      : baseServings
  );

  useEffect(() => {
    if (!userId) return;
    analyzeMutation.mutate({
      recipe_id: recipeId,
      user_id: userId,
      servings,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, recipeId, servings]);

  const missingIngredients = analyzeMutation.data?.missing_ingredients ?? [];
  const isLoading = analyzeMutation.isPending;
  const error = analyzeMutation.error;

  const selectedRecipe = useMemo(
    () => ({
      id: recipeId,
      name: recipeDetail?.name || recipeName,
      image: resolveRecipeImageUrl(recipeDetail?.image_url, recipeDetail?.name || recipeName, {
        width: 120,
        height: 120,
      }),
    }),
    [recipeId, recipeName, recipeDetail?.name, recipeDetail?.image_url]
  );

  const handleGeneratePlans = () => {
    if (missingIngredients.length === 0) {
      alert('当前菜谱食材已齐全，无需补购');
      return;
    }
    const context = {
      recipe_id: recipeId,
      recipe_name: selectedRecipe.name,
      missing_ingredients: missingIngredients,
    };
    savePurchaseContext(context);
    navigate('/purchase/plans', { state: { purchaseContext: context } });
  };

  if (isLoading) return <LoadingSpinner text="分析缺失食材..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="mb-4 text-mt-red">分析失败</p>
        <Button
          onClick={() =>
            userId &&
            analyzeMutation.mutate({ recipe_id: recipeId, user_id: userId, servings })
          }
        >
          重新分析
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="补购分析" subtitle="美团优选 · 智能匹配" backTo="/recipes" />

      <MeituanCard>
        <div className="flex items-center gap-3">
          <img
            src={selectedRecipe.image}
            alt={selectedRecipe.name}
            className="h-16 w-16 rounded-xl object-cover"
          />
          <div>
            <h3 className="font-bold text-mt-text">{selectedRecipe.name}</h3>
            <p className="text-sm text-mt-orange">
              {servings} 人份 · 需补购{' '}
              <span className="font-bold">{missingIngredients.length}</span> 种食材
            </p>
          </div>
        </div>
      </MeituanCard>

      <MeituanCard>
        <h3 className="mb-3 font-bold text-mt-text">缺失清单</h3>
        <div className="space-y-2">
          {missingIngredients.map((ingredient) => {
            const shortage =
              Number(ingredient.required_quantity) - Number(ingredient.current_quantity);
            return (
              <div
                key={ingredient.ingredient_id}
                className="flex items-center justify-between rounded-xl bg-mt-gray-50 p-3"
              >
                <div>
                  <p className="font-medium text-mt-text">{ingredient.name}</p>
                  <p className="text-xs text-mt-text-secondary">
                    需 {ingredient.required_quantity} · 有 {ingredient.current_quantity}
                  </p>
                </div>
                <div className="text-right">
                  <span className="mt-tag-red">缺 {shortage.toFixed(1)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </MeituanCard>

      <div className="flex gap-3 pb-4">
        <Link to="/recipes" className="flex-1">
          <Button variant="outline" fullWidth>
            重选菜谱
          </Button>
        </Link>
        <div className="flex-1">
          <Button
            variant="secondary"
            fullWidth
            disabled={missingIngredients.length === 0}
            onClick={handleGeneratePlans}
          >
            <ShoppingCart className="h-4 w-4" />
            生成方案
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseAnalyzePage;
