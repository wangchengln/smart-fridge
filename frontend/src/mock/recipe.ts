/**
 * 菜谱推荐相关 Mock 数据
 */

import Mock, { type MockRequestOptions } from 'mockjs';
import env from '../config/env';
import { parseBody, successResponse } from './helpers';
import type {
  RecipeSelectionRequest,
  RecommendationItem,
  TakeoutAnalysis,
  RecommendationCostMetrics,
  PremadeAnalysis,
} from '../types/api';

type RecommendationType =
  | 'cook_self'
  | 'flash_purchase_cook'
  | 'takeout_delivery'
  | 'premade_fresh'
  | 'no_purchase'
  | 'small_purchase'
  | 'takeout_alternative';

const buildCostMetrics = (
  type: RecommendationType,
  cookingTime: number,
  missingCount: number
): RecommendationCostMetrics => {
  const quadrantMap: Record<string, { quadrant: string; label: string }> = {
    cook_self: { quadrant: 'Q1', label: '自己做' },
    no_purchase: { quadrant: 'Q1', label: '自己做' },
    flash_purchase_cook: { quadrant: 'Q2', label: '闪购补料后做' },
    small_purchase: { quadrant: 'Q2', label: '闪购补料后做' },
    takeout_delivery: { quadrant: 'Q3', label: '外卖同款' },
    takeout_alternative: { quadrant: 'Q3', label: '外卖同款' },
    premade_fresh: { quadrant: 'Q4', label: '新鲜预制' },
  };
  const q = quadrantMap[type] ?? { quadrant: 'Q1', label: '自己做' };
  const moneyCost =
    type === 'cook_self' || type === 'no_purchase'
      ? 0
      : type === 'premade_fresh'
        ? Math.round(15 + cookingTime * 0.35 + missingCount * 2)
        : type === 'takeout_delivery' || type === 'takeout_alternative'
          ? Math.round(18 + cookingTime * 0.6 + missingCount * 3.5)
          : Math.round(missingCount * 12 + 10);
  const timeCost =
    type === 'takeout_delivery' || type === 'takeout_alternative'
      ? 25 + Math.min(Math.floor(cookingTime / 3), 25)
      : type === 'premade_fresh'
        ? 28
        : type === 'flash_purchase_cook' || type === 'small_purchase'
          ? 30 + cookingTime
          : cookingTime;
  const healthScore =
    type === 'cook_self' || type === 'no_purchase'
      ? Mock.Random.integer(82, 95)
      : type === 'premade_fresh'
        ? Mock.Random.integer(65, 78)
        : type === 'takeout_delivery' || type === 'takeout_alternative'
          ? Mock.Random.integer(50, 68)
          : Mock.Random.integer(72, 85);
  const discount = Mock.Random.float(3, 12);
  const finalPrice = Math.max(0, moneyCost - discount);

  return {
    money_cost: moneyCost,
    money_cost_label:
      type === 'cook_self' || type === 'no_purchase' ? '食材成本（冰箱已有）' : '闪购补料成本',
    time_cost_minutes: timeCost,
    time_cost_label:
      type === 'takeout_delivery' || type === 'takeout_alternative'
        ? '配送+等待'
        : type === 'premade_fresh'
          ? '闪电仓送达'
          : type === 'flash_purchase_cook' || type === 'small_purchase'
            ? '闪购送达+烹饪'
            : '烹饪时间',
    health_score: healthScore,
    health_score_label: '健康评分',
    original_price: moneyCost,
    coupon_discount: discount,
    coupon_name: '美团神券',
    final_price: finalPrice,
    final_price_label: '用神券后实付',
    quadrant: q.quadrant,
    quadrant_label: q.label,
  };
};

const buildTakeoutAnalysis = (
  name: string,
  cookingTime: number,
  missingCount: number
): TakeoutAnalysis => {
  const purchaseCost = Math.round(missingCount * 12 + Mock.Random.float(10, 30));
  const takeoutPrice = Math.round(18 + cookingTime * 0.6 + missingCount * 3.5);
  const savings = Math.round((purchaseCost - takeoutPrice) * 10) / 10;

  return {
    estimated_takeout_price: takeoutPrice,
    estimated_purchase_cost: purchaseCost,
    ping_hao_fan_price: Math.round(takeoutPrice * 0.72),
    delivery_time_minutes: 25 + Math.min(Math.floor(cookingTime / 3), 25),
    savings_vs_purchase: savings,
    recommendation_tip:
      savings > 0
        ? `预估补购约¥${purchaseCost}，外卖约¥${takeoutPrice}，推荐直接点外卖`
        : `缺${missingCount}样食材，建议美团外卖点同款`,
    search_keyword: name,
    platform: 'meituan_waimai',
    channels: [
      {
        id: 'waimai',
        name: '外卖同款',
        order_url: `https://waimai.meituan.com/search?query=${encodeURIComponent(name)}`,
      },
      {
        id: 'ping_hao_fan',
        name: '拼好饭',
        order_url: `https://waimai.meituan.com/search?query=${encodeURIComponent(name + ' 拼好饭')}`,
      },
    ],
    order_url: `https://waimai.meituan.com/search?query=${encodeURIComponent(name)}`,
    is_takeout_recommended: savings > 5 || missingCount >= 5,
    priority: savings > 8 ? 'high' : 'medium',
    final_price_label: '用神券后实付',
  };
};

const buildPremadeAnalysis = (
  name: string,
  cookingTime: number
): PremadeAnalysis => ({
  estimated_premade_price: Math.round(15 + cookingTime * 0.35),
  delivery_time_minutes: 28,
  recommendation_tip: `小象鲜食/便利店有新鲜预制同款，约28分钟送达`,
  search_keyword: name,
  platform: cookingTime <= 20 ? 'xiaoxiang' : 'convenience_flash',
  channel_name: cookingTime <= 20 ? '小象鲜食' : '便利店闪电仓',
  channels: [
    {
      id: 'xiaoxiang',
      name: '小象鲜食',
      order_url: `https://www.meituan.com/s/${encodeURIComponent(name + ' 小象鲜食')}`,
    },
    {
      id: 'convenience_flash',
      name: '便利店闪电仓',
      order_url: `https://www.meituan.com/s/${encodeURIComponent(name + ' 便利店')}`,
    },
  ],
  order_url: `https://www.meituan.com/s/${encodeURIComponent(name + ' 小象鲜食')}`,
  is_premade_recommended: true,
  final_price_label: '用神券后实付',
});

const buildRecommendationItem = (
  type: RecommendationType,
  overrides: Partial<RecommendationItem> = {}
): RecommendationItem => {
  const baseByType: Record<RecommendationType, Partial<RecommendationItem>> = {
    cook_self: {
      name: Mock.Random.pick(['西红柿炒鸡蛋', '土豆丝', '蒸蛋羹', '炒青菜']),
      cooking_time: Mock.Random.integer(15, 45),
      recommendation_type: 'cook_self',
      legacy_recommendation_type: 'no_purchase',
      quadrant: 'Q1',
      quadrant_label: '自己做',
      match_score: Mock.Random.float(0.8, 0.99),
      existing_ingredients_ratio: Mock.Random.float(0.9, 1.0),
      missing_ingredients_count: 0,
      missing_ingredients_detail: [],
      recommendation_reason: '库存充足，无需补购即可制作',
      purchase_analysis: undefined,
    },
    no_purchase: {
      name: Mock.Random.pick(['西红柿炒鸡蛋', '土豆丝', '蒸蛋羹', '炒青菜']),
      cooking_time: Mock.Random.integer(15, 45),
      recommendation_type: 'cook_self',
      legacy_recommendation_type: 'no_purchase',
      match_score: Mock.Random.float(0.8, 0.99),
      existing_ingredients_ratio: Mock.Random.float(0.9, 1.0),
      missing_ingredients_count: 0,
      missing_ingredients_detail: [],
      recommendation_reason: '现有食材完全满足，无需补购即可制作',
      purchase_analysis: undefined,
    },
    flash_purchase_cook: {
      name: Mock.Random.pick(['红烧肉', '糖醋里脊', '宫保鸡丁', '鱼香肉丝']),
      cooking_time: Mock.Random.integer(30, 60),
      recommendation_type: 'flash_purchase_cook',
      legacy_recommendation_type: 'small_purchase',
      quadrant: 'Q2',
      quadrant_label: '闪购补料后做',
      match_score: Mock.Random.float(0.6, 0.8),
      existing_ingredients_ratio: Mock.Random.float(0.5, 0.8),
      missing_ingredients_count: Mock.Random.integer(1, 3),
      missing_ingredients_detail: [
        {
          ingredient_id: Mock.Random.integer(1, 100),
          name: Mock.Random.pick(['猪肉', '鸡肉', '牛肉']),
          required_quantity: Mock.Random.integer(200, 500),
          current_quantity: 0,
        },
      ],
      recommendation_reason: '闪购少量补料后即可制作',
    },
    small_purchase: {
      name: Mock.Random.pick(['红烧肉', '糖醋里脊', '宫保鸡丁', '鱼香肉丝']),
      cooking_time: Mock.Random.integer(30, 60),
      recommendation_type: 'flash_purchase_cook',
      legacy_recommendation_type: 'small_purchase',
      match_score: Mock.Random.float(0.6, 0.8),
      existing_ingredients_ratio: Mock.Random.float(0.5, 0.8),
      missing_ingredients_count: Mock.Random.integer(1, 3),
      missing_ingredients_detail: [
        {
          ingredient_id: Mock.Random.integer(1, 100),
          name: Mock.Random.pick(['猪肉', '鸡肉', '牛肉']),
          required_quantity: Mock.Random.integer(200, 500),
          current_quantity: 0,
        },
      ],
      recommendation_reason: '只需补购少量食材，现有食材利用率较高',
    },
    takeout_delivery: {
      name: Mock.Random.pick(['麻婆豆腐', '回锅肉', '水煮鱼', '辣子鸡']),
      cooking_time: Mock.Random.integer(45, 90),
      recommendation_type: 'takeout_delivery',
      legacy_recommendation_type: 'takeout_alternative',
      quadrant: 'Q3',
      quadrant_label: '外卖同款',
      match_score: Mock.Random.float(0.3, 0.5),
      existing_ingredients_ratio: Mock.Random.float(0.2, 0.4),
      missing_ingredients_count: Mock.Random.integer(4, 8),
      missing_ingredients_detail: Mock.Random.range(2, 4).map(() => ({
        ingredient_id: Mock.Random.integer(1, 100),
        name: Mock.Random.pick(['猪肉', '豆瓣酱', '花椒', '鱼片', '干辣椒']),
        required_quantity: Mock.Random.integer(100, 400),
        current_quantity: 0,
        missing_quantity: Mock.Random.integer(100, 400),
      })),
      recommendation_reason: '食材不足，推荐外卖同款或拼好饭',
      purchase_analysis: undefined,
    },
    premade_fresh: {
      name: Mock.Random.pick(['凉拌黄瓜', '三明治', '沙拉碗', '味噌汤']),
      cooking_time: Mock.Random.integer(10, 25),
      recommendation_type: 'premade_fresh',
      legacy_recommendation_type: 'premade_fresh',
      quadrant: 'Q4',
      quadrant_label: '新鲜预制',
      match_score: Mock.Random.float(0.45, 0.7),
      existing_ingredients_ratio: Mock.Random.float(0.35, 0.65),
      missing_ingredients_count: Mock.Random.integer(1, 3),
      missing_ingredients_detail: [
        {
          ingredient_id: Mock.Random.integer(1, 100),
          name: Mock.Random.pick(['生菜', '番茄', '鸡蛋']),
          required_quantity: Mock.Random.integer(1, 3),
          current_quantity: 0,
        },
      ],
      recommendation_reason: '小象鲜食/便利店有新鲜预制同款',
    },
    takeout_alternative: {
      name: Mock.Random.pick(['麻婆豆腐', '回锅肉', '水煮鱼', '辣子鸡']),
      cooking_time: Mock.Random.integer(45, 90),
      recommendation_type: 'takeout_delivery',
      legacy_recommendation_type: 'takeout_alternative',
      match_score: Mock.Random.float(0.3, 0.5),
      existing_ingredients_ratio: Mock.Random.float(0.2, 0.4),
      missing_ingredients_count: Mock.Random.integer(4, 8),
      missing_ingredients_detail: Mock.Random.range(2, 4).map(() => ({
        ingredient_id: Mock.Random.integer(1, 100),
        name: Mock.Random.pick(['猪肉', '豆瓣酱', '花椒', '鱼片', '干辣椒']),
        required_quantity: Mock.Random.integer(100, 400),
        current_quantity: 0,
        missing_quantity: Mock.Random.integer(100, 400),
      })),
      recommendation_reason: '需要补购的食材较多，建议选择外卖或调整菜谱',
      purchase_analysis: undefined,
    },
  };

  const item = {
    recommendation_id: Mock.Random.integer(1, 10000),
    recipe_id: Mock.Random.integer(1, 1000),
    image_url: '',
    ...baseByType[type],
    ...overrides,
  } as RecommendationItem;

  const normalizedType =
    type === 'no_purchase'
      ? 'cook_self'
      : type === 'small_purchase'
        ? 'flash_purchase_cook'
        : type === 'takeout_alternative'
          ? 'takeout_delivery'
          : type;

  item.cost_metrics = buildCostMetrics(
    normalizedType,
    item.cooking_time,
    item.missing_ingredients_count
  );
  if (item.cost_metrics) {
    item.cost_metrics.final_price = Math.max(
      0,
      item.cost_metrics.money_cost - item.cost_metrics.coupon_discount
    );
  }

  if (normalizedType === 'takeout_delivery') {
    const takeout_analysis = buildTakeoutAnalysis(
      item.name,
      item.cooking_time,
      item.missing_ingredients_count
    );
    item.takeout_analysis = {
      ...takeout_analysis,
      final_price: item.cost_metrics?.final_price,
    };
    item.recommendation_reason = takeout_analysis.recommendation_tip;
  }

  if (normalizedType === 'premade_fresh') {
    const premade_analysis = buildPremadeAnalysis(item.name, item.cooking_time);
    item.premade_analysis = {
      ...premade_analysis,
      final_price: item.cost_metrics?.final_price,
    };
    item.recommendation_reason = premade_analysis.recommendation_tip;
  }

  return item;
};

const buildQuadrantResponse = (
  cookSelf: RecommendationItem[],
  flashPurchase: RecommendationItem[],
  takeout: RecommendationItem[],
  premade: RecommendationItem[]
) =>
  successResponse({
    cook_self_recipes: cookSelf,
    flash_purchase_recipes: flashPurchase,
    takeout_delivery_recipes: takeout,
    premade_fresh_recipes: premade,
    no_purchase_recipes: cookSelf,
    small_purchase_recipes: flashPurchase,
    takeout_alternative_recipes: takeout,
    quadrant_summary: {
      Q1: { type: 'cook_self', label: '自己做', count: cookSelf.length },
      Q2: { type: 'flash_purchase_cook', label: '闪购补料后做', count: flashPurchase.length },
      Q3: { type: 'takeout_delivery', label: '外卖同款/拼好饭', count: takeout.length },
      Q4: { type: 'premade_fresh', label: '新鲜预制', count: premade.length },
    },
    total_count: cookSelf.length + flashPurchase.length,
    generated_at: new Date().toISOString(),
  });

if (env.USE_MOCK) {
  const mockCollectionStore: Record<
    number,
    { cooks: Array<{ recipe_id: number; name: string; at: string }> }
  > = {};

  Mock.mock('/api/recipe/recommend', 'get', () => {
    const cookSelfRecipes = Mock.Random.range(2, 5).map((_, index) =>
      buildRecommendationItem('cook_self', {
        recipe_id: 1000 + index,
        recommendation_id: 1000 + index,
      })
    );

    const insufficientCount = Mock.Random.integer(2, 4);
    const flashPurchaseRecipes: RecommendationItem[] = [];
    const takeoutDeliveryRecipes: RecommendationItem[] = [];
    const premadeFreshRecipes: RecommendationItem[] = [];

    for (let i = 0; i < insufficientCount; i += 1) {
      const recipeId = 2000 + i;
      const sharedName = Mock.Random.pick(['红烧肉', '糖醋里脊', '宫保鸡丁', '鱼香肉丝']);
      const sharedCookingTime = Mock.Random.integer(30, 60);
      const sharedMissing = Mock.Random.integer(1, 3);
      const sharedRatio = Mock.Random.float(0.5, 0.85);
      const sharedMissingDetail = [
        {
          ingredient_id: Mock.Random.integer(1, 100),
          name: Mock.Random.pick(['猪肉', '鸡肉', '牛肉']),
          required_quantity: Mock.Random.integer(200, 500),
          current_quantity: 0,
        },
      ];
      const baseOverrides = {
        recipe_id: recipeId,
        recommendation_id: recipeId,
        name: sharedName,
        cooking_time: sharedCookingTime,
        missing_ingredients_count: sharedMissing,
        existing_ingredients_ratio: sharedRatio,
        missing_ingredients_detail: sharedMissingDetail,
        match_score: Mock.Random.float(0.55, 0.85),
      };
      flashPurchaseRecipes.push(
        buildRecommendationItem('flash_purchase_cook', baseOverrides)
      );
      takeoutDeliveryRecipes.push(
        buildRecommendationItem('takeout_delivery', baseOverrides)
      );
      premadeFreshRecipes.push(
        buildRecommendationItem('premade_fresh', baseOverrides)
      );
    }

    return buildQuadrantResponse(
      cookSelfRecipes,
      flashPurchaseRecipes,
      takeoutDeliveryRecipes,
      premadeFreshRecipes
    );
  });

  Mock.mock('/api/recipe/advanced-recommend', 'post', () => {
    const recipes = Mock.Random.range(5, 15).map(() => {
      const type = Mock.Random.pick([
        'cook_self',
        'flash_purchase_cook',
        'takeout_delivery',
        'premade_fresh',
      ] as const);
      return buildRecommendationItem(type);
    });

    const cookSelfRecipes = recipes.filter((r) => r.recommendation_type === 'cook_self');
    const flashPurchaseRecipes = recipes.filter(
      (r) => r.recommendation_type === 'flash_purchase_cook'
    );
    const takeoutDeliveryRecipes = recipes.filter(
      (r) => r.recommendation_type === 'takeout_delivery'
    );
    const premadeFreshRecipes = recipes.filter((r) => r.recommendation_type === 'premade_fresh');

    return buildQuadrantResponse(
      cookSelfRecipes,
      flashPurchaseRecipes,
      takeoutDeliveryRecipes,
      premadeFreshRecipes
    );
  });

  const applySelectToMockCollection = (
    userId: number,
    recipeId: number,
    recipeName: string
  ) => {
    if (!mockCollectionStore[userId]) {
      mockCollectionStore[userId] = { cooks: [] };
    }
    const prevCount = mockCollectionStore[userId].cooks.filter(
      (c) => c.recipe_id === recipeId
    ).length;
    const at = new Date().toISOString();
    mockCollectionStore[userId].cooks.push({ recipe_id: recipeId, name: recipeName, at });
    const cookCount = prevCount + 1;
    const isNew = prevCount === 0;
    return {
      cook_id: Mock.Random.integer(1, 10000),
      recipe_id: recipeId,
      recipe_name: recipeName,
      is_new_badge: isNew,
      cook_count: cookCount,
      badge: {
        recipe_id: recipeId,
        recipe_name: recipeName,
        image_url: '',
        taste: '咸鲜',
        badge_emoji: '👨‍🍳',
        badge_tier: cookCount >= 5 ? 'gold' : cookCount >= 3 ? 'silver' : 'bronze',
        cook_count: cookCount,
        first_cooked_at: at,
        last_cooked_at: at,
      },
      message: isNew
        ? `已选择「${recipeName}」，恭喜解锁新徽章！`
        : `已选择「${recipeName}」，集卡累计 ${cookCount} 次`,
    };
  };

  Mock.mock('/api/recipe/select', 'post', (options: MockRequestOptions) => {
    const body = parseBody<RecipeSelectionRequest & { user_id?: number }>(options);
    const recipeId = Mock.Random.integer(1, 1000);
    const recipeName = Mock.Random.pick(['西红柿炒鸡蛋', '红烧肉', '麻婆豆腐']);

    if (!body.is_selected) {
      return successResponse({
        recommendation_id: body.recommendation_id,
        is_selected: false,
        success: true,
        message: '已取消选择',
      });
    }

    const userId = body.user_id ?? 1;
    const collection = applySelectToMockCollection(userId, recipeId, recipeName);

    return successResponse({
      recommendation_id: body.recommendation_id,
      is_selected: true,
      success: true,
      ...collection,
    });
  });

  Mock.mock(/\/api\/recipe\/\d+\/select/, 'post', (options: MockRequestOptions) => {
    const recipeId = Number(options.url.match(/recipe\/(\d+)/)?.[1] || 1);
    const body = parseBody<{ user_id: number; servings?: number }>(options);
    const recipeName = Mock.Random.pick(['西红柿炒鸡蛋', '红烧肉', '麻婆豆腐']);
    const collection = applySelectToMockCollection(body.user_id || 1, recipeId, recipeName);

    return successResponse({
      recommendation_id: Mock.Random.integer(1, 10000),
      is_selected: true,
      success: true,
      ...collection,
    });
  });

  Mock.mock(/\/api\/recipe\/\d+\/dietary-analysis/, 'get', (options: MockRequestOptions) => {
    const url = new URL(options.url, 'http://mock.local');
    const dietaryMode = url.searchParams.get('dietary_mode') || 'fat_loss';
    const servings = Number(url.searchParams.get('servings') || 2);
    const onAntihypertensive = url.searchParams.get('on_antihypertensive') === 'true';

    const ingredients = [
      {
        name: '西红柿',
        quantity: 2,
        grams_estimated: 200,
        calories: 36,
        sodium_mg: 10,
        sugar_g: 5.2,
        is_high_potassium: true,
        tags: dietaryMode === 'fat_loss' ? ['低卡'] : ['高钾', '低钠'],
        warnings: [],
      },
      {
        name: '土豆',
        quantity: 1.5,
        grams_estimated: 150,
        calories: 115.5,
        sodium_mg: 9,
        sugar_g: 1.2,
        is_high_potassium: true,
        tags: dietaryMode === 'parents' ? ['高钾'] : [],
        warnings: [],
      },
      {
        name: '猪肉',
        quantity: 1,
        grams_estimated: 100,
        calories: 242,
        sodium_mg: 62,
        sugar_g: 0,
        is_high_potassium: false,
        tags: dietaryMode === 'fat_loss' ? ['高热量'] : [],
        warnings: dietaryMode === 'fat_loss' ? ['猪肉 热量较高（242 kcal/100g）'] : [],
      },
    ];

    const totalCalories = ingredients.reduce((s, i) => s + i.calories, 0);
    const medicationConflicts =
      dietaryMode === 'parents' && onAntihypertensive
        ? [
            {
              type: 'antihypertensive_potassium',
              severity: 'warning',
              message:
                '本菜谱含高钾食材：西红柿、土豆。服用降压药时，大量高钾食物可能影响血钾水平，请咨询医生。',
              conflict_ingredients: ['西红柿', '土豆'],
              meituan_pharmacy_url: 'https://yiyao.meituan.com/main/home',
              meituan_pharmacy_label: '美团买药 · 查看用药说明',
            },
          ]
        : [];

    return successResponse({
      dietary_mode: dietaryMode,
      mode_label:
        dietaryMode === 'fat_loss'
          ? '减脂模式'
          : dietaryMode === 'parents'
            ? '爸妈模式'
            : '正常模式',
      servings,
      total_calories: totalCalories,
      calories_per_serving: Math.round((totalCalories / servings) * 10) / 10,
      total_sodium_mg: 81,
      total_sugar_g: 6.4,
      ingredients,
      warnings: medicationConflicts.map((c) => c.message),
      fat_loss_rating: totalCalories / servings <= 350 ? '推荐' : '适中',
      fat_loss_tip: '本道菜人均热量较低，适合减脂期',
      sodium_level: '低',
      sugar_level: '低',
      parents_tip: '钠/糖含量较低，适合长辈日常饮食',
      medication_conflicts: medicationConflicts,
      high_potassium_ingredients: ['西红柿', '土豆'],
    });
  });

  Mock.mock(/\/api\/recipe\/\d+$/, 'get', () => {
    return successResponse({
      recipe_id: Mock.Random.integer(1, 1000),
      name: Mock.Random.pick(['西红柿炒鸡蛋', '土豆丝', '红烧肉', '糖醋里脊']),
      cooking_time: Mock.Random.integer(15, 60),
      serving_size: 2,
      steps: [
        { step: 1, description: '准备食材，洗净切好' },
        { step: 2, description: '热锅下油，爆香调料' },
        { step: 3, description: '下主要食材，翻炒均匀' },
        { step: 4, description: '调味收汁，出锅装盘' },
      ],
      ingredients: [
        {
          ingredient_id: Mock.Random.integer(1, 100),
          name: Mock.Random.pick(['西红柿', '鸡蛋', '土豆', '胡萝卜']),
          required_quantity: Mock.Random.integer(200, 500),
          is_required: true,
        },
        {
          ingredient_id: Mock.Random.integer(1, 100),
          name: Mock.Random.pick(['盐', '生抽', '料酒', '糖']),
          required_quantity: Mock.Random.integer(5, 20),
          is_required: false,
        },
      ],
    });
  });

  Mock.mock(/\/api\/recipe\/user\/\d+\/recommendations\/cache/, 'delete', () => {
    return successResponse({
      deleted_count: Mock.Random.integer(5, 30),
      message: '已清除推荐缓存记录',
    });
  });

  Mock.mock(/\/api\/recipe\/user\/\d+\/recommendations/, 'get', () => {
    const recommendations = Mock.Random.range(5, 15).map(() => ({
      recipe_id: Mock.Random.integer(1, 1000),
      name: Mock.Random.pick(['西红柿炒鸡蛋', '红烧肉', '蒸蛋羹']),
      recommendation_type: Mock.Random.pick([
        'no_purchase',
        'small_purchase',
        'takeout_alternative',
      ]),
      match_score: Mock.Random.float(0.5, 0.99),
      existing_ingredients_ratio: Mock.Random.float(0.3, 1.0),
      missing_ingredients_count: Mock.Random.integer(0, 5),
      missing_ingredients_detail: [],
      recommendation_reason: Mock.Random.pick([
        '现有食材完全满足',
        '只需补购少量食材',
        '需要补购的食材较多',
      ]),
      is_selected: Mock.Random.boolean(),
      created_at: Mock.Random.datetime(),
    }));

    return successResponse({
      recommendations,
      total_count: recommendations.length,
    });
  });

  Mock.mock(/\/api\/recipe\/user\/\d+\/collection/, 'get', (options: MockRequestOptions) => {
    const userId = Number(options.url.match(/user\/(\d+)/)?.[1] || 1);
    const store = mockCollectionStore[userId] || { cooks: [] };
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();

    const recipeAgg: Record<
      number,
      { name: string; count: number; first: string; last: string }
    > = {};
    for (const c of store.cooks) {
      if (!recipeAgg[c.recipe_id]) {
        recipeAgg[c.recipe_id] = { name: c.name, count: 0, first: c.at, last: c.at };
      }
      recipeAgg[c.recipe_id].count += 1;
      recipeAgg[c.recipe_id].last = c.at;
    }

    const badges = Object.entries(recipeAgg).map(([id, agg]) => ({
      recipe_id: Number(id),
      recipe_name: agg.name,
      image_url: '',
      taste: '咸鲜',
      badge_emoji: '👨‍🍳',
      badge_tier: agg.count >= 5 ? 'gold' : agg.count >= 3 ? 'silver' : 'bronze',
      cook_count: agg.count,
      first_cooked_at: agg.first,
      last_cooked_at: agg.last,
    }));

    const daily = Array.from({ length: lastDay }, (_, i) => {
      const day = i + 1;
      const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayCooks = store.cooks.filter((c) => c.at.startsWith(key));
      const seen = new Set<number>();
      const recipes = dayCooks
        .filter((c) => {
          if (seen.has(c.recipe_id)) return false;
          seen.add(c.recipe_id);
          return true;
        })
        .map((c) => ({
          recipe_id: c.recipe_id,
          recipe_name: c.name,
          image_url: '',
        }));
      return { date: key, count: dayCooks.length, recipes };
    });

    const monthCooks = store.cooks.filter((c) => {
      const d = new Date(c.at);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    return successResponse({
      total_badges: badges.length,
      total_cooks: store.cooks.length,
      badges,
      monthly_stats: {
        year,
        month,
        total_cooks: monthCooks.length,
        unique_recipes: new Set(monthCooks.map((c) => c.recipe_id)).size,
        daily_breakdown: daily,
      },
    });
  });

  Mock.mock(/\/api\/recipe\/\d+\/cook/, 'post', (options: MockRequestOptions) => {
    const recipeId = Number(options.url.match(/recipe\/(\d+)/)?.[1] || 1);
    const body = parseBody<{ user_id: number }>(options);
    const name = Mock.Random.pick(['西红柿炒鸡蛋', '红烧肉', '麻婆豆腐', '糖醋里脊']);
    return successResponse(
      applySelectToMockCollection(body.user_id || 1, recipeId, name)
    );
  });

  Mock.mock(/\/api\/recipe\/recommendation-stats\/\d+/, 'get', () => {
    return successResponse({
      total_recommendations: Mock.Random.integer(50, 200),
      type_breakdown: {
        no_purchase: Mock.Random.integer(20, 80),
        small_purchase: Mock.Random.integer(15, 60),
        takeout_alternative: Mock.Random.integer(10, 40),
      },
      selected_count: Mock.Random.integer(5, 30),
    });
  });
}
