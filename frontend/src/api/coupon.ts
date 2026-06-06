/**
 * 美团神券相关 API
 */

import http from '../utils/http';
import type { UserCouponsResponse, WeeklySavingsResponse } from '../types/api';

export const getUserCoupons = async (
  userId: number,
  orderAmount?: number
): Promise<UserCouponsResponse> => {
  const response = await http.get<UserCouponsResponse>(`/api/coupon/user/${userId}`, {
    params: orderAmount && orderAmount > 0 ? { order_amount: orderAmount } : undefined,
  });
  return response.data;
};

export const getWeeklySavings = async (userId: number): Promise<WeeklySavingsResponse> => {
  const response = await http.get<WeeklySavingsResponse>(
    `/api/coupon/user/${userId}/weekly-savings`
  );
  return response.data;
};

export const recordSavingsEvent = async (
  userId: number,
  params: {
    event_type: string;
    saved_amount: number;
    description?: string;
    recipe_id?: number;
  }
): Promise<{ success: boolean; log_id: number; weekly_saved_amount: number }> => {
  const response = await http.post<{ success: boolean; log_id: number; weekly_saved_amount: number }>(
    `/api/coupon/user/${userId}/record-savings`,
    null,
    { params }
  );
  return response.data;
};
