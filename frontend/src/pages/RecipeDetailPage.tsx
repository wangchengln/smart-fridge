import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Clock,
  Users,
  ChefHat,
  CheckCircle,
  Circle,
  Minus,
  Plus,
  Award,
  Flame,
  ListOrdered,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRecipeDetail, useRecipeDietaryAnalysis, useSelectRecipeById } from '../hooks/queries/useRecipeQueries';
import { useUserInfo } from '../hooks/queries/useUserQueries';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import MeituanCard from '../components/ui/MeituanCard';
import PageHeader from '../components/ui/PageHeader';
import RecipeAiChat from '../components/RecipeAiChat';
import DietaryAnalysisPanel from '../components/DietaryAnalysisPanel';
import { resolveRecipeImageUrl } from '../utils/recipeImage';
import type { RecommendationItem } from '../types/api';
import {
  estimateCalories,
  getRecipeCategoryTag,
  getRecipeOneLinerReview,
  getRecipeTasteTag,
} from '../utils/recipeCardHelpers';
import {
  clampServings,
  formatIngredientQuantityWithUnit,
  getBaseServings,
  MAX_SERVINGS,
  MIN_SERVINGS,
  scaleIngredientQuantity,
} from '../utils/recipeServings';

const RecipeDetailPage = () => {
  const { id } = useParams();
  const recipeId = Number(id);
  const { userId } = useAuth();
  const { data: recipe, isLoading, error, refetch } = useRecipeDetail(
    Number.isFinite(recipeId) ? recipeId : null
  );
  const { data: userInfo } = useUserInfo(userId);
  const selectRecipeMutation = useSelectRecipeById();
  const dietaryMode = userInfo?.dietary_mode ?? 'normal';

  const baseServings = getBaseServings(recipe?.serving_size);
  const [servings, setServings] = useState(baseServings);
  const [cookResult, setCookResult] = useState<{
    message: string;
    isNewBadge: boolean;
    emoji?: string;
    tier?: string;
  } | null>(null);

  const { data: dietaryAnalysis } = useRecipeDietaryAnalysis(
    Number.isFinite(recipeId) ? recipeId : null,
    userId
      ? {
          user_id: userId,
          servings,
          dietary_mode: dietaryMode,
        }
      : undefined
  );

  useEffect(() => {
    if (!recipe) return;
    const preferred = userInfo?.family_count ?? recipe.serving_size ?? 2;
    setServings(clampServings(preferred));
  }, [recipe?.recipe_id, recipe?.serving_size, userInfo?.family_count]);

  const scaledIngredients = useMemo(() => {
    if (!recipe?.ingredients) return [];
    return recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      scaled_quantity: scaleIngredientQuantity(
        ingredient.required_quantity,
        servings,
        baseServings
      ),
    }));
  }, [recipe?.ingredients, servings, baseServings]);

  if (isLoading) return <LoadingSpinner />;

  if (error || !recipe) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="mb-4 text-mt-red">加载失败</p>
        <Button onClick={() => refetch()}>重试</Button>
      </div>
    );
  }

  const steps = recipe.steps ?? [];
  const purchaseUrl = `/purchase/analyze?recipe_id=${recipeId}&name=${encodeURIComponent(recipe.name)}&servings=${servings}`;
  const categoryTag = getRecipeCategoryTag(recipe.name);
  const recipeMeta = {
    recipe_id: recipe.recipe_id,
    name: recipe.name,
    cooking_time: recipe.cooking_time,
  } as RecommendationItem;
  const tasteTag = getRecipeTasteTag(recipeMeta);
  const estimatedCalories = estimateCalories(recipeMeta);
  const dishReview = getRecipeOneLinerReview({
    recipe_id: recipe.recipe_id,
    name: recipe.name,
  });

  const adjustServings = (delta: number) => {
    setServings((prev) => clampServings(prev + delta));
  };

  const handleSelectRecipe = async () => {
    if (!userId || !recipe) return;
    try {
      const result = await selectRecipeMutation.mutateAsync({
        recipeId: recipe.recipe_id,
        data: { user_id: userId, servings },
      });
      setCookResult({
        message: result.message,
        isNewBadge: result.is_new_badge ?? false,
        emoji: result.badge?.badge_emoji,
        tier: result.badge?.badge_tier,
      });
    } catch {
      alert('选择失败，请稍后重试');
    }
  };

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title={recipe.name} backTo="/recipes" backLabel="菜谱" />

      <MeituanCard className="!p-0 overflow-hidden">
        <div className="flex items-stretch gap-5 p-5">
          <img
            src={resolveRecipeImageUrl(recipe.image_url, recipe.name, {
              width: 480,
              height: 480,
            })}
            alt={recipe.name}
            className="h-64 w-auto max-w-[60%] shrink-0 rounded-2xl border border-[#f0f0f0] bg-white object-contain shadow-soft"
          />

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
                  {categoryTag}
                </span>
                <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-600">
                  {tasteTag}
                </span>
                <span className="rounded-md bg-mt-yellow-light px-2 py-0.5 text-[11px] font-medium text-mt-orange">
                  简单上手
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-lg bg-mt-gray-50 px-2.5 py-2">
                  <Clock className="h-4 w-4 shrink-0 text-mt-orange" />
                  <div>
                    <p className="text-sm font-bold leading-none text-mt-text">{recipe.cooking_time} 分钟</p>
                    <p className="mt-0.5 text-[10px] text-mt-text-muted">烹饪耗时</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-mt-gray-50 px-2.5 py-2">
                  <Flame className="h-4 w-4 shrink-0 text-orange-400" />
                  <div>
                    <p className="text-sm font-bold leading-none text-mt-text">{estimatedCalories} kcal</p>
                    <p className="mt-0.5 text-[10px] text-mt-text-muted">预估热量</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-mt-gray-50 px-2.5 py-2">
                  <ListOrdered className="h-4 w-4 shrink-0 text-mt-orange" />
                  <div>
                    <p className="text-sm font-bold leading-none text-mt-text">{steps.length} 步</p>
                    <p className="mt-0.5 text-[10px] text-mt-text-muted">制作步骤</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-mt-gray-50 px-2.5 py-2">
                  <ChefHat className="h-4 w-4 shrink-0 text-mt-orange" />
                  <div>
                    <p className="text-sm font-bold leading-none text-mt-text">{scaledIngredients.length} 种</p>
                    <p className="mt-0.5 text-[10px] text-mt-text-muted">所需食材</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-lg border border-mt-border/60 bg-mt-yellow-light/50 px-2.5 py-2">
              <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-mt-text">
                <Users className="h-3.5 w-3.5 text-mt-orange" />
                人数
              </span>
              <div className="flex items-center rounded-md border border-mt-border/50 bg-white">
                <button
                  type="button"
                  onClick={() => adjustServings(-1)}
                  disabled={servings <= MIN_SERVINGS}
                  className="flex h-7 w-7 items-center justify-center text-mt-text transition-colors hover:bg-mt-gray-50 disabled:opacity-40"
                  aria-label="减少人数"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[2rem] text-center text-sm font-bold text-mt-text">{servings}</span>
                <button
                  type="button"
                  onClick={() => adjustServings(1)}
                  disabled={servings >= MAX_SERVINGS}
                  className="flex h-7 w-7 items-center justify-center text-mt-text transition-colors hover:bg-mt-gray-50 disabled:opacity-40"
                  aria-label="增加人数"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {[2, 3, 4, 6].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setServings(clampServings(preset))}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      servings === preset
                        ? 'bg-mt-yellow text-mt-text'
                        : 'bg-white text-mt-text-secondary hover:bg-mt-gray-50'
                    }`}
                  >
                    {preset}人
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-mt-gray-50 px-2.5 py-2">
              <p className="text-[11px] font-bold text-mt-orange">一句话评价</p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-mt-text-secondary">
                {dishReview}
              </p>
            </div>
          </div>
        </div>
      </MeituanCard>

      <MeituanCard id="recipe-steps">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-mt-text">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-mt-yellow text-xs">1</span>
          制作步骤
        </h2>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.step ?? index} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mt-yellow-light text-xs font-bold text-mt-orange">
                {step.step ?? index + 1}
              </span>
              <p className="text-sm leading-relaxed text-mt-text">{step.description}</p>
            </div>
          ))}
        </div>
      </MeituanCard>

      <MeituanCard id="recipe-ingredients" className="!p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-mt-text">所需食材</h2>
          <span className="text-[10px] text-mt-text-secondary">
            按 {servings} 人份 · 基准 {baseServings} 人份
          </span>
        </div>
        <div className="space-y-1.5">
          {scaledIngredients.map((ingredient, index) => (
            <div
              key={ingredient.ingredient_id ?? index}
              className="flex items-center justify-between rounded-lg bg-mt-gray-50 px-2.5 py-1.5"
            >
              <div className="flex items-center gap-1.5">
                {ingredient.is_required ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-mt-text-muted" />
                )}
                <span className="text-xs font-medium text-mt-text">{ingredient.name}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-mt-orange">
                  {formatIngredientQuantityWithUnit(ingredient.scaled_quantity, ingredient.name)}
                </span>
                {servings !== baseServings && (
                  <p className="text-[9px] text-mt-text-muted line-through">
                    {formatIngredientQuantityWithUnit(ingredient.required_quantity, ingredient.name)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </MeituanCard>

      {dietaryAnalysis && dietaryMode !== 'normal' && (
        <DietaryAnalysisPanel analysis={dietaryAnalysis} dietaryMode={dietaryMode} />
      )}

      <div id="recipe-ai-chat">
        <RecipeAiChat recipeId={recipeId} recipeName={recipe.name} />
      </div>

      <Button
        fullWidth
        size="lg"
        onClick={handleSelectRecipe}
        disabled={selectRecipeMutation.isPending}
        className="gap-2"
      >
        <Award className="h-5 w-5" />
        {selectRecipeMutation.isPending ? '选择中...' : '选这道菜 · 完成集卡'}
      </Button>

      {cookResult && (
        <MeituanCard className="border-2 border-mt-yellow bg-amber-50 !p-4 text-center">
          {cookResult.isNewBadge && cookResult.emoji && (
            <p className="mb-2 text-4xl">{cookResult.emoji}</p>
          )}
          <p className="font-bold text-mt-text">{cookResult.message}</p>
          {cookResult.isNewBadge && (
            <p className="mt-1 text-xs text-mt-orange">选择菜谱后已解锁，徽章已加入集卡册</p>
          )}
          <Link
            to="/collection"
            className="mt-3 inline-block text-sm font-medium text-mt-orange"
          >
            查看我的集卡 →
          </Link>
          <button
            type="button"
            onClick={() => setCookResult(null)}
            className="mt-2 block w-full text-xs text-mt-text-muted"
          >
            关闭
          </button>
        </MeituanCard>
      )}

      <Link to={purchaseUrl} className="block">
        <Button variant="secondary" fullWidth size="lg">
          分析补购需求 · 美团优选（{servings} 人份）
        </Button>
      </Link>
    </div>
  );
};

export default RecipeDetailPage;
