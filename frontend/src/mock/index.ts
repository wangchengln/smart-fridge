/**
 * Mock 服务配置
 * 使用 MockJS 拦截 HTTP 请求，返回模拟数据
 */

import Mock from 'mockjs';
import env from '../config/env';

if (env.USE_MOCK) {
  Mock.setup({
    timeout: '200-600',
  });

  void import('./user');
  void import('./ingredient');
  void import('./image-recognition');
  void import('./recipe');
  void import('./purchase');
  void import('./coupon');
  void import('./scenario');

  console.log('Mock服务已启动');
}

export default Mock;
