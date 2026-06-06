/**
 * 图片识别相关 Mock 数据
 */

import Mock, { type MockRequestOptions } from 'mockjs';
import env from '../config/env';
import { messageResponse, parseBody, successResponse } from './helpers';
import type {
  ConfirmRecognitionRequest,
  RecognizedIngredientItem,
  UpdateRecognitionResultRequest,
} from '../types/api';

type RecognitionStatus = 'pending' | 'processing' | 'completed' | 'failed';

const buildStatusPayload = (status: RecognitionStatus) => {
  let progress = 0;
  let ingredients: RecognizedIngredientItem[] | undefined;
  let error_message: string | undefined;

  switch (status) {
    case 'pending':
      progress = 10;
      break;
    case 'processing':
      progress = Mock.Random.integer(30, 70);
      break;
    case 'completed':
      progress = 100;
      ingredients = [
        {
          name: Mock.Random.pick(['西红柿', '鸡蛋', '胡萝卜']),
          quantity: Mock.Random.integer(1, 5),
          confidence: Mock.Random.float(0.8, 0.99),
          category: '蔬菜',
        },
      ];
      break;
    case 'failed':
      progress = 0;
      error_message = '识别失败，请重试';
      break;
  }

  return { progress, ingredients, error_message };
};

if (env.USE_MOCK) {
  Mock.mock('/api/image-recognition/upload', 'post', () => {
    return successResponse({
      recognition_id: Mock.Random.integer(1, 10000),
      image_path: `/static/images/${Mock.Random.guid()}.jpg`,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  });

  Mock.mock(/\/api\/image-recognition\/status\/\d+/, 'get', () => {
    const status = Mock.Random.pick(['pending', 'processing', 'completed', 'failed'] as const);
    const { progress, ingredients, error_message } = buildStatusPayload(status);

    return successResponse({
      recognition_id: Mock.Random.integer(1, 10000),
      status,
      progress,
      ingredients,
      error_message,
      created_at: Mock.Random.datetime(),
      updated_at: new Date().toISOString(),
    });
  });

  Mock.mock(/\/api\/image-recognition\/result\/\d+/, 'get', () => {
    return successResponse({
      recognition_id: Mock.Random.integer(1, 10000),
      status: 'completed',
      ingredients: [
        {
          ingredient_id: Mock.Random.integer(1, 100),
          name: Mock.Random.pick(['西红柿', '鸡蛋', '胡萝卜', '土豆']),
          quantity: Mock.Random.integer(1, 5),
          confidence: Mock.Random.float(0.8, 0.99),
          category: Mock.Random.pick(['蔬菜', '水果', '肉类', '蛋类']),
        },
        {
          ingredient_id: Mock.Random.integer(1, 100),
          name: Mock.Random.pick(['牛奶', '面包', '苹果', '香蕉']),
          quantity: Mock.Random.integer(1, 3),
          confidence: Mock.Random.float(0.8, 0.99),
          category: Mock.Random.pick(['乳制品', '粮食', '水果']),
        },
      ],
      created_at: Mock.Random.datetime(),
      updated_at: new Date().toISOString(),
    });
  });

  Mock.mock('/api/image-recognition/update-result', 'post', (options: MockRequestOptions) => {
    const body = parseBody<UpdateRecognitionResultRequest>(options);

    return successResponse({
      recognition_id: body.recognition_id,
      updated_count: body.ingredients.length,
      success: true,
      message: '识别结果更新成功',
    });
  });

  Mock.mock('/api/image-recognition/confirm', 'post', (options: MockRequestOptions) => {
    const body = parseBody<ConfirmRecognitionRequest>(options);

    return successResponse({
      recognition_id: body.recognition_id,
      confirmed_count: body.confirmed_ingredients.length,
      stock_ids: body.confirmed_ingredients.map(() => Mock.Random.integer(1, 1000)),
      success: true,
      message: `成功创建${body.confirmed_ingredients.length}个库存记录`,
    });
  });

  Mock.mock(/\/api\/image-recognition\/user\/\d+/, 'get', () => {
    const records = Mock.Random.range(3, 10).map(() => ({
      recognition_id: Mock.Random.integer(1, 10000),
      image_path: `/static/images/${Mock.Random.guid()}.jpg`,
      status: Mock.Random.pick(['pending', 'completed', 'confirmed', 'failed']),
      created_at: Mock.Random.datetime(),
    }));

    return successResponse(records);
  });

  Mock.mock(/\/api\/image-recognition\/\d+/, 'delete', () => {
    return messageResponse('识别记录删除成功');
  });
}
