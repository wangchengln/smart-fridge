/**
 * 补购交易相关 Mock 数据
 */

import Mock, { type MockRequestOptions } from 'mockjs';
import env from '../config/env';
import { parseBody, successResponse } from './helpers';
import type {
  OrderCreateRequest,
  ProductItem,
  PurchasePlanItem,
  PurchasePlanSelectionRequest,
} from '../types/api';

const MOCK_INGREDIENTS = [
  { id: 1, name: '西红柿', std: ['有机西红柿 500g', 12.6, 'premium', 4.8], eco: ['实惠西红柿 500g', 5.3, 'economy', 4.1] },
  { id: 2, name: '鸡蛋', std: ['精选鸡蛋 12枚', 19.8, 'premium', 4.7], eco: ['特价鸡蛋 10枚', 11.2, 'economy', 4.0] },
  { id: 3, name: '猪肉', std: ['优选猪里脊 500g', 28.5, 'premium', 4.6], eco: ['实惠猪肉丝 500g', 16.8, 'economy', 4.1] },
];

const buildDifferentiatedPlans = () => {
  const standardItems: PurchasePlanItem[] = MOCK_INGREDIENTS.map((ing) => ({
    ingredient_id: ing.id,
    name: ing.name,
    quantity: 300,
    price: ing.std[1] as number,
    product_id: `std-${ing.id}`,
    product_name: ing.std[0] as string,
    unit: 'g',
    spec: '500g/份',
    tier: ing.std[2] as string,
    rating: ing.std[3] as number,
  }));

  const economyItems: PurchasePlanItem[] = MOCK_INGREDIENTS.map((ing) => ({
    ingredient_id: ing.id,
    name: ing.name,
    quantity: 300,
    price: ing.eco[1] as number,
    product_id: `eco-${ing.id}`,
    product_name: ing.eco[0] as string,
    unit: 'g',
    spec: '500g/份',
    tier: ing.eco[2] as string,
    rating: ing.eco[3] as number,
    savings_vs_standard: (ing.std[1] as number) - (ing.eco[1] as number),
  }));

  return { standardItems, economyItems };
};

const buildProducts = (countRange: [number, number]): ProductItem[] =>
  Mock.Random.range(countRange[0], countRange[1]).map(() => ({
    product_id: Mock.Random.guid(),
    name: Mock.Random.pick(['优质西红柿', '新鲜鸡蛋', '精选胡萝卜', '优质土豆']),
    price: Mock.Random.float(5, 25),
    original_price: Mock.Random.float(8, 30),
    unit: Mock.Random.pick(['500g', '1kg', '12枚', '200g']),
    spec: Mock.Random.pick(['500g/份', '1kg/份', '12枚/盒', '200g/袋']),
    image_url: `https://photo.bj.ide.test.sankuai.com/?keyword=${Mock.Random.pick(['tomato', 'egg', 'carrot', 'potato'])}&width=200&height=200`,
    source: 'meituan',
    category: Mock.Random.pick(['蔬菜', '蛋类', '粮食']),
    rating: Mock.Random.float(4.0, 4.9),
    sales_count: Mock.Random.integer(100, 5000),
    match_score: Mock.Random.float(0.7, 0.99),
  }));

if (env.USE_MOCK) {
  Mock.mock('/api/purchase/analyze', 'post', (options: MockRequestOptions) => {
    const body = parseBody<{ servings?: number }>(options);
    const servings = body.servings && body.servings > 0 ? body.servings : 2;
    const scale = servings / 2;

    const missingIngredients = Mock.Random.range(1, 5).map(() => ({
      ingredient_id: Mock.Random.integer(1, 100),
      name: Mock.Random.pick(['猪肉', '鸡肉', '牛肉', '鱼', '豆腐']),
      required_quantity: Math.round(Mock.Random.integer(200, 500) * scale * 10) / 10,
      current_quantity: 0,
    }));

    return successResponse({ missing_ingredients: missingIngredients });
  });

  Mock.mock('/api/purchase/plan', 'post', () => {
    const { standardItems, economyItems } = buildDifferentiatedPlans();

    const standardTotal = standardItems.reduce((sum, item) => sum + Number(item.price), 0);
    const economyTotal = economyItems.reduce((sum, item) => sum + Number(item.price), 0);
    const standardOriginal = standardTotal + 8.5;
    const economyOriginal = economyTotal + 4.2;

    const standardPlan = {
      plan_type: 'standard',
      plan_name: '标准版方案',
      plan_description: '优选有机/精选商品，品质稳定，适合注重口感与新鲜度',
      total_price: standardTotal,
      original_price: standardOriginal,
      discount_amount: standardOriginal - standardTotal,
      items: standardItems,
      cost_effectiveness: 0.72,
      avg_quality_score: 4.7,
      strategy_tags: ['品质优选', '有机精选', '评分优先'],
    };

    const economyCouponDiscount = economyTotal >= 29 ? 5 : economyTotal >= 20 ? 3 : 0;
    const standardCouponDiscount = standardTotal >= 29 ? 8 : 0;

    const economyPlan = {
      plan_type: 'economy',
      plan_name: '省钱版方案',
      plan_description: '锁定最低单价与特价SKU，凑单满减，同款食材最多可省40%',
      total_price: economyTotal,
      original_price: economyOriginal,
      discount_amount: economyOriginal - economyTotal,
      items: economyItems,
      cost_effectiveness: 0.86,
      avg_quality_score: 4.07,
      strategy_tags: ['低价优先', '凑单满减', '特价SKU'],
      matched_coupons: economyCouponDiscount > 0 ? [{
        user_coupon_id: 1,
        coupon_id: 1,
        coupon_type: 'flash_sale',
        name: '闪购满29减5',
        discount_amount: economyCouponDiscount,
        min_order_amount: 29,
        is_best: true,
      }] : [],
      coupon_discount: economyCouponDiscount,
      final_price: economyTotal - economyCouponDiscount,
    };

    const standardPlanWithCoupon = {
      ...standardPlan,
      matched_coupons: standardCouponDiscount > 0 ? [{
        user_coupon_id: 2,
        coupon_id: 2,
        coupon_type: 'flash_sale',
        name: '闪购新客立减8',
        discount_amount: standardCouponDiscount,
        min_order_amount: 20,
        is_best: true,
      }] : [],
      coupon_discount: standardCouponDiscount,
      final_price: standardTotal - standardCouponDiscount,
    };

    const cookSelfFinal = economyTotal - economyCouponDiscount;
    const takeoutSubtotal = 35;
    const takeoutFinal = takeoutSubtotal + 3 - 6;

    return successResponse({
      standard_plan: standardPlanWithCoupon,
      economy_plan: economyPlan,
      comparison: {
        price_difference: standardTotal - economyTotal,
        final_price_difference: (standardTotal - standardCouponDiscount) - (economyTotal - economyCouponDiscount),
        savings_percentage: Number(((standardTotal - economyTotal) / standardTotal * 100).toFixed(1)),
        item_count_difference: 0,
        different_item_count: 3,
        avg_quality_standard: 4.7,
        avg_quality_economy: 4.07,
        quality_difference: 0.63,
        standard_final_price: standardTotal - standardCouponDiscount,
        economy_final_price: economyTotal - economyCouponDiscount,
        item_diffs: MOCK_INGREDIENTS.map((ing) => ({
          ingredient_name: ing.name,
          standard_product: ing.std[0],
          economy_product: ing.eco[0],
          standard_price: ing.std[1],
          economy_price: ing.eco[1],
          price_diff: (ing.std[1] as number) - (ing.eco[1] as number),
          standard_tier: ing.std[2],
          economy_tier: ing.eco[2],
          same_product: false,
        })),
        recommendation: 'economy',
        recommendation_reason: `省钱版可省¥${(standardTotal - economyTotal).toFixed(2)}（${(((standardTotal - economyTotal) / standardTotal) * 100).toFixed(0)}%），3项换了更实惠的SKU`,
      },
      price_comparison: {
        cook_self: {
          subtotal: economyTotal,
          coupon_discount: economyCouponDiscount,
          delivery_fee: 0,
          final_price: cookSelfFinal,
        },
        takeout: {
          subtotal: takeoutSubtotal,
          coupon_discount: 6,
          delivery_fee: 3,
          final_price: takeoutFinal,
        },
        recommended: cookSelfFinal <= takeoutFinal ? 'cook_self' : 'takeout',
        savings_amount: Math.abs(cookSelfFinal - takeoutFinal),
        savings_tip: cookSelfFinal <= takeoutFinal
          ? `自己买食材+制作到手约¥${cookSelfFinal.toFixed(2)}，比外卖券后价更划算`
          : `外卖券后到手约¥${takeoutFinal.toFixed(2)}，比自己做更省事`,
      },
      available_coupons: [
        { user_coupon_id: 1, coupon_id: 1, coupon_type: 'flash_sale', name: '闪购满29减5', discount_type: 'fixed', discount_value: 5, min_order_amount: 29, applicable_scope: 'grocery', status: 'available', expires_at: new Date().toISOString(), estimated_discount: economyCouponDiscount, is_applicable: economyCouponDiscount > 0 },
        { user_coupon_id: 4, coupon_id: 4, coupon_type: 'delivery', name: '外卖满35减6', discount_type: 'fixed', discount_value: 6, min_order_amount: 35, applicable_scope: 'delivery', status: 'available', expires_at: new Date().toISOString(), estimated_discount: 6, is_applicable: true },
      ],
    });
  });

  Mock.mock('/api/purchase/match', 'post', () => {
    const products = buildProducts([3, 10]);
    return successResponse({
      products,
      total_count: products.length,
    });
  });

  Mock.mock('/api/purchase/products/search', 'get', () => {
    const products = buildProducts([5, 15]);
    return successResponse({
      products,
      total_count: products.length,
    });
  });

  Mock.mock('/api/purchase/plan/select', 'post', (options: MockRequestOptions) => {
    const body = parseBody<PurchasePlanSelectionRequest>(options);

    return successResponse({
      selection_id: Mock.Random.integer(1, 10000),
      plan_type: body.plan_type,
      total_price: Mock.Random.float(20, 100),
      success: true,
      message: '方案选择成功',
    });
  });

  Mock.mock(/\/api\/purchase\/user\/\d+\/plans/, 'get', () => {
    const plans = Mock.Random.range(2, 8).map(() => ({
      record_id: Mock.Random.integer(1, 10000),
      plan_type: Mock.Random.pick(['standard', 'economy']),
      total_price: Mock.Random.float(20, 100),
      original_price: Mock.Random.float(25, 120),
      discount_amount: Mock.Random.float(5, 20),
      items_count: Mock.Random.integer(2, 6),
      status: Mock.Random.pick(['pending', 'selected', 'ordered', 'completed']),
      created_at: Mock.Random.datetime(),
      plan_details: {
        items: [
          {
            name: Mock.Random.pick(['西红柿', '鸡蛋', '胡萝卜']),
            quantity: Mock.Random.integer(200, 500),
            price: Mock.Random.float(5, 20),
          },
        ],
      },
    }));

    return successResponse({
      plans,
      total_count: plans.length,
    });
  });

  Mock.mock('/api/purchase/order', 'post', (options: MockRequestOptions) => {
    const body = parseBody<OrderCreateRequest>(options);
    const totalAmount = body.products.reduce((sum, product) => sum + product.price, 0);

    return successResponse({
      redirect_url: `https://bj.meituan.com/cart?order_id=${Mock.Random.guid()}&total=${totalAmount.toFixed(2)}`,
      order_id: `mt_order_${Mock.Random.guid()}`,
      total_amount: totalAmount,
      plan_details: {
        plan_type: body.plan_type,
        items_count: body.products.length,
      },
    });
  });

  Mock.mock('/api/purchase/meituan/mock-page', 'get', () => {
    return successResponse({
      page_title: '美团购物 - 智能云冰箱补购',
      order_summary: {
        total_items: Mock.Random.integer(2, 6),
        total_amount: Mock.Random.float(30, 120),
        estimated_delivery: '30-45分钟',
      },
      products: Mock.Random.range(2, 5).map(() => ({
        name: Mock.Random.pick(['新鲜西红柿 500g', '土鸡蛋 12枚装', '新鲜胡萝卜 1kg', '优质土豆 2kg']),
        price: Mock.Random.float(5, 25),
        quantity: Mock.Random.integer(1, 3),
        subtotal: Mock.Random.float(5, 75),
      })),
      delivery_info: {
        address: '智能云冰箱用户地址',
        delivery_fee: Mock.Random.float(2, 5),
        delivery_time: '预计30-45分钟送达',
      },
      payment_methods: ['微信支付', '支付宝', '美团支付'],
    });
  });
}
