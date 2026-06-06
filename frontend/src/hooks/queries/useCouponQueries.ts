import { useQuery } from '@tanstack/react-query';
import * as couponApi from '../../api/coupon';

export const useUserCoupons = (
  userId: number | null | undefined,
  orderAmount?: number
) => {
  return useQuery({
    queryKey: ['coupon', 'user', userId, orderAmount],
    queryFn: () => couponApi.getUserCoupons(userId!, orderAmount),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
};

export const useWeeklySavings = (userId: number | null | undefined) => {
  return useQuery({
    queryKey: ['coupon', 'weekly-savings', userId],
    queryFn: () => couponApi.getWeeklySavings(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
};
