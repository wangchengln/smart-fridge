/**
 * 食材管理相关 Mock 数据
 */

import Mock, { type MockRequestOptions } from 'mockjs';
import env from '../config/env';
import { messageResponse, parseBody, successResponse } from './helpers';
import type { BatchUpdateNearExpiryRequest } from '../types/api';

if (env.USE_MOCK) {
  Mock.mock('/api/ingredient/base', 'get', () => {
    const ingredients = [
      { id: 1, name: '西红柿', category: '蔬菜', shelf_life: 7 },
      { id: 2, name: '鸡蛋', category: '蛋类', shelf_life: 14 },
      { id: 3, name: '胡萝卜', category: '蔬菜', shelf_life: 14 },
      { id: 4, name: '牛奶', category: '乳制品', shelf_life: 7 },
      { id: 5, name: '苹果', category: '水果', shelf_life: 14 },
    ];

    return successResponse({
      ingredients,
      total_count: ingredients.length,
    });
  });

  Mock.mock('/api/ingredient/recognize', 'post', () => {
    return successResponse({
      ingredients: [
        {
          ingredient_id: Mock.Random.integer(1, 100),
          name: Mock.Random.pick(['西红柿', '鸡蛋', '胡萝卜', '土豆', '洋葱']),
          quantity: Mock.Random.integer(1, 10),
          confidence: Mock.Random.float(0.8, 0.99),
        },
        {
          ingredient_id: Mock.Random.integer(1, 100),
          name: Mock.Random.pick(['牛奶', '面包', '苹果', '香蕉', '酸奶']),
          quantity: Mock.Random.integer(1, 5),
          confidence: Mock.Random.float(0.8, 0.99),
        },
      ],
    });
  });

  Mock.mock('/api/ingredient/sync-order', 'post', () => {
    return successResponse({
      sync_status: 'completed',
      ingredients: [
        { name: '牛奶', quantity: 2, unit: '瓶' },
        { name: '面包', quantity: 1, unit: '袋' },
      ],
    });
  });

  Mock.mock('/api/ingredient/stock', 'post', () => {
    return successResponse({
      stock_id: Mock.Random.integer(1, 1000),
    });
  });

  Mock.mock('/api/ingredient/stock', 'put', () => {
    return successResponse({
      stock_id: Mock.Random.integer(1, 1000),
    });
  });

  Mock.mock(/\/api\/ingredient\/stock\/\d+/, 'delete', () => {
    return messageResponse('删除成功');
  });

  Mock.mock('/api/ingredient/check-near-expiry', 'post', () => {
    const nearExpiryIngredients = Mock.Random.range(0, 5).map(() => ({
      stock_id: Mock.Random.integer(1, 1000),
      ingredient_id: Mock.Random.integer(1, 100),
      ingredient_name: Mock.Random.pick(['牛奶', '酸奶', '面包', '鸡蛋']),
      quantity: Mock.Random.integer(1, 5),
      freshness: Mock.Random.pick(['fresh', 'good', 'expiring']),
      storage_date: Mock.Random.datetime(),
      shelf_life: Mock.Random.integer(3, 14),
      expiry_date: Mock.Random.datetime(),
      days_remaining: Mock.Random.integer(0, 3),
    }));

    return successResponse(
      {
        total_count: nearExpiryIngredients.length,
        near_expiry_ingredients: nearExpiryIngredients,
      },
      '临期检查完成'
    );
  });

  Mock.mock('/api/ingredient/near-expiry', 'get', () => {
    const nearExpiryIngredients = Mock.Random.range(0, 3).map(() => ({
      stock_id: Mock.Random.integer(1, 1000),
      ingredient_id: Mock.Random.integer(1, 100),
      ingredient_name: Mock.Random.pick(['牛奶', '酸奶', '面包', '鸡蛋']),
      quantity: Mock.Random.integer(1, 5),
      freshness: Mock.Random.pick(['fresh', 'good', 'expiring']),
      storage_date: Mock.Random.datetime(),
      shelf_life: Mock.Random.integer(3, 14),
      expiry_date: Mock.Random.datetime(),
      days_remaining: Mock.Random.integer(0, 3),
    }));

    return successResponse({
      total_count: nearExpiryIngredients.length,
      near_expiry_ingredients: nearExpiryIngredients,
    });
  });

  Mock.mock('/api/ingredient/batch-update-near-expiry', 'post', (options: MockRequestOptions) => {
    const body = parseBody<BatchUpdateNearExpiryRequest>(options);

    return successResponse({
      updated_count: body.stock_ids.length,
      success: true,
      message: `成功更新${body.stock_ids.length}个食材的临期状态`,
    });
  });

  Mock.mock(/\/api\/ingredient\/user\/\d+\/stocks/, 'get', () => {
    const stocks = Mock.Random.range(5, 15).map(() => ({
      id: Mock.Random.integer(1, 1000),
      user_id: 1,
      ingredient_id: Mock.Random.integer(1, 100),
      ingredient_name: Mock.Random.pick(['西红柿', '鸡蛋', '胡萝卜', '土豆', '洋葱', '牛奶', '面包']),
      quantity: Mock.Random.integer(1, 10),
      freshness: Mock.Random.pick(['fresh', 'good', 'expiring']),
      storage_method: Mock.Random.pick(['manual', 'ai_recognition', 'order_sync']),
      near_expiry: Mock.Random.boolean(),
      storage_date: Mock.Random.datetime(),
    }));

    return successResponse({
      total_count: stocks.length,
      stocks,
    });
  });
}
