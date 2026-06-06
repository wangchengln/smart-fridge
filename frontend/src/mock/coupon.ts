/**
 * 美团神券 Mock 数据
 */

import Mock, { type MockRequestOptions } from 'mockjs';
import env from '../config/env';
import { successResponse } from './helpers';

if (env.USE_MOCK) {
  const mockCoupons = [
    {
      user_coupon_id: 1,
      coupon_id: 1,
      coupon_type: 'flash_sale',
      name: '闪购满29减5',
      description: '小象超市闪购专享',
      discount_type: 'fixed',
      discount_value: 5,
      min_order_amount: 29,
      applicable_scope: 'grocery',
      status: 'available',
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    },
    {
      user_coupon_id: 2,
      coupon_id: 2,
      coupon_type: 'flash_sale',
      name: '闪购新客立减8',
      description: '闪购新客首单立减8元',
      discount_type: 'fixed',
      discount_value: 8,
      min_order_amount: 20,
      applicable_scope: 'grocery',
      status: 'available',
      expires_at: new Date(Date.now() + 10 * 86400000).toISOString(),
    },
    {
      user_coupon_id: 4,
      coupon_id: 4,
      coupon_type: 'delivery',
      name: '外卖满35减6',
      description: '美团外卖满35元减6元',
      discount_type: 'fixed',
      discount_value: 6,
      min_order_amount: 35,
      applicable_scope: 'delivery',
      status: 'available',
      expires_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    },
    {
      user_coupon_id: 6,
      coupon_id: 6,
      coupon_type: 'cross_store',
      name: '跨店满50减10',
      description: '美团跨店满减',
      discount_type: 'fixed',
      discount_value: 10,
      min_order_amount: 50,
      applicable_scope: 'all',
      status: 'available',
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    },
  ];

  Mock.mock(/\/api\/coupon\/user\/\d+(\?.*)?$/, 'get', (options: MockRequestOptions) => {
    const orderMatch = options.url?.match(/order_amount=([\d.]+)/);
    const orderAmount = orderMatch ? parseFloat(orderMatch[1]) : 0;

    const coupons = mockCoupons.map((c) => {
      const isApplicable = orderAmount >= c.min_order_amount;
      const estimated = isApplicable ? Math.min(c.discount_value, orderAmount) : 0;
      return { ...c, is_applicable: isApplicable, estimated_discount: estimated };
    });

    return successResponse({ coupons, total_count: coupons.length });
  });

  Mock.mock(/\/api\/coupon\/user\/\d+\/weekly-savings/, 'get', () => {
    return successResponse({
      weekly_saved_amount: 70.5,
      week_start: new Date().toISOString(),
      breakdown: {
        stock_used: 12.5,
        no_purchase: 28,
        coupon_saved: 8,
        near_expiry_used: 6.8,
        plan_saved: 15.2,
      },
      recent_logs: [
        {
          id: 1,
          event_type: 'plan_saved',
          saved_amount: 15.2,
          description: '选择省钱版补购方案，比标准版少花15.2元',
          created_at: new Date().toISOString(),
        },
      ],
    });
  });
}
