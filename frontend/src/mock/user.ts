/**
 * 用户管理相关 Mock 数据
 */

import Mock, { type MockRequestOptions } from 'mockjs';
import env from '../config/env';
import { parseBody, successResponse } from './helpers';
import type { DietaryMode, UserCreateRequest, UserUpdate } from '../types/api';

const mockUserStore: {
  family_count: number;
  dietary_mode: DietaryMode;
  on_antihypertensive: boolean;
  parent_mode: boolean;
} = {
  family_count: 3,
  dietary_mode: 'normal',
  on_antihypertensive: false,
  parent_mode: false,
};

if (env.USE_MOCK) {
  Mock.mock('/api/user/auth', 'post', (options: MockRequestOptions) => {
    const body = parseBody<UserCreateRequest>(options);

    return successResponse({
      user_id: 1,
      token: Mock.Random.string('lower', 32),
      nickname: `用户${body.phone.slice(-4)}`,
    });
  });

  Mock.mock('/api/user/parent-mode', 'put', (options: MockRequestOptions) => {
    const body = parseBody<{ parent_mode: boolean }>(options);
    mockUserStore.parent_mode = body.parent_mode;
    mockUserStore.dietary_mode = body.parent_mode ? 'parents' : 'normal';

    return successResponse({
      parent_mode: body.parent_mode,
    });
  });

  Mock.mock(/\/api\/user\/\d+/, 'get', () => {
    return successResponse({
      id: 1,
      nickname: Mock.Random.cname(),
      family_count: mockUserStore.family_count,
      family_type: 'default',
      taste_preference: '清淡,少油,少盐',
      parent_mode: mockUserStore.parent_mode,
      dietary_mode: mockUserStore.dietary_mode,
      on_antihypertensive: mockUserStore.on_antihypertensive,
    });
  });

  Mock.mock(/\/api\/user\/\d+/, 'put', (options: MockRequestOptions) => {
    const body = parseBody<UserUpdate>(options);

    if (body.family_count !== undefined) mockUserStore.family_count = body.family_count;
    if (body.dietary_mode !== undefined) {
      mockUserStore.dietary_mode = body.dietary_mode;
      mockUserStore.parent_mode = body.dietary_mode === 'parents';
    }
    if (body.on_antihypertensive !== undefined) {
      mockUserStore.on_antihypertensive = body.on_antihypertensive;
    }
    if (body.parent_mode !== undefined) {
      mockUserStore.parent_mode = body.parent_mode;
      if (body.parent_mode) mockUserStore.dietary_mode = 'parents';
    }

    return successResponse({
      id: 1,
      nickname: body.nickname ?? Mock.Random.cname(),
      family_count: mockUserStore.family_count,
      family_type: body.family_type ?? 'default',
      taste_preference: body.taste_preference,
      parent_mode: mockUserStore.parent_mode,
      dietary_mode: mockUserStore.dietary_mode,
      on_antihypertensive: mockUserStore.on_antihypertensive,
    });
  });
}
