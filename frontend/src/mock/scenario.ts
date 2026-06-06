/**
 * 场景 Bundle Mock 数据
 */

import Mock, { type MockRequestOptions } from 'mockjs';
import env from '../config/env';
import { parseBody } from './helpers';
import type {
  BundleSkuItem,
  FridgeCoverageDetail,
  HomeGatheringScenarioRequest,
  OrderableBundle,
  ScenarioBundleResponse,
  ScenarioPreviewResponse,
  ScenarioType,
} from '../types/api';

const buildMockSkus = (names: string[]): BundleSkuItem[] =>
  names.map((name, idx) => ({
    sku_id: `mt_bundle_sku_${idx}_${name}`,
    sku_name: `优选${name} 500g`,
    ingredient_id: idx + 1,
    ingredient_name: name,
    quantity: Mock.Random.float(0.5, 2, 1, 1),
    unit: '份',
    spec: '500g/份',
    price: Mock.Random.float(5, 35, 1, 1),
    tier: Mock.Random.pick(['premium', 'standard', 'economy']),
    rating: Mock.Random.float(4.0, 4.9, 1, 1),
  }));

const buildMockBundle = (
  scenario: ScenarioType,
  bundleName: string,
  description: string,
  redirectChannel: OrderableBundle['redirect_channel'],
  redirectLabel: string,
  skuNames: string[],
  tags: string[],
  context: Record<string, unknown> = {}
): OrderableBundle => {
  const items = buildMockSkus(skuNames);
  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
  const bundleSkuId = `mt_bundle_${scenario}_${Mock.Random.string('lower', 8)}`;

  return {
    bundle_id: `bundle_${scenario}_${Mock.Random.string('lower', 12)}`,
    bundle_sku_id: bundleSkuId,
    bundle_name: bundleName,
    bundle_type: scenario,
    description,
    items,
    item_count: items.length,
    total_price: Math.round(totalPrice * 100) / 100,
    original_price: Math.round(totalPrice * 1.12 * 100) / 100,
    discount_amount: Math.round(totalPrice * 0.12 * 100) / 100,
    coupon_discount: Mock.Random.float(2, 8, 1, 1),
    final_price: Math.round((totalPrice - 3) * 100) / 100,
    redirect_channel: redirectChannel,
    redirect_label: redirectLabel,
    redirect_url: `https://bj.meituan.com/bundle/${bundleSkuId}`,
    tags,
    coverage_summary: `库存已覆盖 ${Mock.Random.integer(1, 4)}/${items.length + Mock.Random.integer(1, 3)} 项`,
    context,
  };
};

const scenarioLabels: Record<ScenarioType, string> = {
  cook_shop: '买菜做饭',
  weekend_restock: '周末补货',
  home_gathering: '居家聚会',
};

const buildMockCoverage = (
  covered: string[],
  missing: string[]
): FridgeCoverageDetail => {
  const total = covered.length + missing.length;
  return {
    covered_count: covered.length,
    total_count: total,
    covered_items: covered,
    missing_items: missing,
    coverage_rate: total ? Math.round((covered.length / total) * 100) / 100 : 0,
  };
};

if (env.USE_MOCK) {
  Mock.mock(/\/api\/scenario\/preview(\?.*)?$/, 'get', () => {
    const nearItems = Mock.Random.pick([
      ['西红柿', '鸡蛋'],
      ['豆腐'],
      [],
    ]);
    const response: ScenarioPreviewResponse = {
      headline: nearItems.length
        ? `冰箱有 ${nearItems.length} 项临期，建议先做一道菜`
        : '冰箱在库充足，可智能生成补购方案',
      subheadline: '云冰箱已盘点库存，只买缺口、不重复囤货',
      fridge_total: Mock.Random.integer(8, 20),
      near_expiry_count: nearItems.length,
      near_expiry_items: nearItems,
      suggested_scenario: {
        scenario: nearItems.length ? 'cook_shop' : 'weekend_restock',
        scenario_label: nearItems.length ? '买菜做饭' : '周末补货',
        reason: nearItems.length
          ? `有 ${nearItems.length} 项临期食材待消耗`
          : '周常食材可一次性补齐',
        urgency: nearItems.length ? 'high' : 'medium',
        badge: nearItems.length ? '临期优先' : '本周宜补',
        action_hint: '先查库存，再闪购补齐',
      },
      scenarios: [
        {
          scenario: 'cook_shop',
          scenario_label: '买菜做饭',
          reason: nearItems.length ? `有 ${nearItems.length} 项临期食材待消耗` : '根据冰箱缺口智能匹配菜谱',
          urgency: nearItems.length ? 'high' : 'medium',
          badge: nearItems.length ? '临期优先' : undefined,
        },
        {
          scenario: 'weekend_restock',
          scenario_label: '周末补货',
          reason: '周常食材缺 3 项，建议周末一次性补齐',
          urgency: 'medium',
          badge: '本周宜补',
        },
        {
          scenario: 'home_gathering',
          scenario_label: '居家聚会',
          reason: '朋友来访？先盘点冰箱，缺口组合购一键补齐',
          urgency: 'low',
        },
      ],
    };
    return response;
  });

  Mock.mock('/api/scenario/cook-shop', 'post', () => {
    const recipeName = Mock.Random.pick(['西红柿炒鸡蛋', '清炒土豆丝', '麻婆豆腐']);
    const covered = Mock.Random.pick([['土豆', '葱'], ['鸡蛋'], []]);
    const skus = ['西红柿', '鸡蛋', '葱'];
    const bundle = buildMockBundle(
      'cook_shop',
      `${recipeName} · 缺料补齐包`,
      `基于冰箱库存推荐「${recipeName}」，只补缺口`,
      'flash_sale',
      '美团闪购 / 小象超市',
      skus,
      ['临期优先', '缺料补购', '闪购30分钟'],
      { recipe_id: Mock.Random.integer(1, 20), servings: 2 }
    );

    const response: ScenarioBundleResponse = {
      scenario: 'cook_shop',
      scenario_label: scenarioLabels.cook_shop,
      message: `临期食材优先入菜，缺料闪购补齐`,
      headline: `今晚做「${recipeName}」，只需补齐 ${skus.length} 项`,
      recommendation_reasons: [
        '优先消耗临期食材：西红柿',
        `「${recipeName}」库存已覆盖 2/5 项，只买缺的 3 项`,
        '30 分钟闪购送达，组合购一键加购',
      ],
      fridge_coverage: buildMockCoverage(covered, skus),
      stock_savings_hint: '优先消耗临期 1 项，避免浪费约 ¥8~15',
      bundle,
      recipe_id: Mock.Random.integer(1, 20),
      recipe_name: recipeName,
      near_expiry_used: Mock.Random.pick([['西红柿'], ['鸡蛋', '西红柿'], []]),
    };
    return response;
  });

  Mock.mock('/api/scenario/weekend-restock', 'post', (options: MockRequestOptions) => {
    const body = parseBody<{ family_count?: number }>(options);
    const people = body.family_count ?? Mock.Random.integer(2, 5);
    const skus = ['鸡蛋', '牛奶', '西红柿', '土豆', '猪肉', '大米'];
    const bundle = buildMockBundle(
      'weekend_restock',
      `【周末补货】${people}人周采购 Bundle`,
      `按 ${people} 人家庭用量一键生成周采购清单`,
      'xiaoxiang_scheduled',
      '小象定时达',
      skus,
      ['周末补货', '家庭用量', '定时达Bundle'],
      { family_count: people }
    );

    const response: ScenarioBundleResponse = {
      scenario: 'weekend_restock',
      scenario_label: scenarioLabels.weekend_restock,
      message: `已为 ${people} 人家庭生成补货清单，缺 ${skus.length} 项`,
      headline: `周末补货 · 只买缺的 ${skus.length} 项`,
      recommendation_reasons: [
        `按 ${people} 人家庭周用量计算，缺 ${skus.length} 项`,
        '冰箱已备 2/8 项周常食材，避免重复囤货',
        '小象定时达，周末一次性送到家',
      ],
      fridge_coverage: buildMockCoverage(['大米', '胡萝卜'], skus),
      stock_savings_hint: '冰箱已有 2 项，无需重复购买',
      bundle,
    };
    return response;
  });

  Mock.mock('/api/scenario/home-gathering', 'post', (options: MockRequestOptions) => {
    const body = parseBody<HomeGatheringScenarioRequest>(options);
    const guests = body.guest_count ?? 6;
    const eventType = body.event_type ?? 'hotpot';
    const label = eventType === 'hotpot' ? '火锅聚会' : '烧烤聚会';
    const skus =
      eventType === 'hotpot'
        ? ['火锅底料', '牛肉', '虾', '豆腐', '蘑菇', '土豆']
        : ['猪肉', '鸡肉', '洋葱', '土豆'];

    const bundle = buildMockBundle(
      'home_gathering',
      `【${label}】${guests}人缺口 Bundle`,
      `「来 ${guests} 人吃${label.replace('聚会', '')}」组合购一键补齐`,
      'flash_combo',
      '闪购组合购',
      skus,
      ['居家聚会', '组合购Bundle', '库存盘点'],
      { event_type: eventType, guest_count: guests }
    );

    const response: ScenarioBundleResponse = {
      scenario: 'home_gathering',
      scenario_label: scenarioLabels.home_gathering,
      message: `已为 ${guests} 人${label}生成补齐清单，缺 ${skus.length} 项`,
      headline: `${guests}人${label.replace('聚会', '')} · 只买缺的 ${skus.length} 项`,
      recommendation_reasons: [
        `「来 ${guests} 人吃${label.replace('聚会', '')}」场景模板已匹配`,
        '冰箱已有 2/6 项聚会食材，只补缺口',
        '闪购组合购，一次下单全部到齐',
      ],
      fridge_coverage: buildMockCoverage(['豆腐', '土豆'], skus),
      stock_savings_hint: '冰箱已有 2 项，无需重复购买',
      bundle,
    };
    return response;
  });

  Mock.mock('/api/scenario/bundle/order', 'post', (options: MockRequestOptions) => {
    const body = parseBody<{
      bundle_id: string;
      bundle_sku_id: string;
      scenario: ScenarioType;
      total_amount: number;
      item_count: number;
    }>(options);

    return {
      order_id: `mt_bundle_order_${Mock.Random.string('lower', 12)}`,
      bundle_id: body.bundle_id,
      bundle_sku_id: body.bundle_sku_id,
      redirect_url: `https://bj.meituan.com/bundle/checkout?bundle_sku_id=${body.bundle_sku_id}`,
      total_amount: body.total_amount,
      item_count: body.item_count,
      redirect_channel:
        body.scenario === 'weekend_restock'
          ? 'xiaoxiang_scheduled'
          : body.scenario === 'home_gathering'
            ? 'flash_combo'
            : 'flash_sale',
      redirect_label:
        body.scenario === 'weekend_restock'
          ? '小象定时达'
          : body.scenario === 'home_gathering'
            ? '闪购组合购'
            : '美团闪购 / 小象超市',
    };
  });
}
