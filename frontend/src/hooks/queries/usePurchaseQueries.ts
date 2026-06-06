import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as purchaseApi from '../../api/purchase';
import type {
  OrderCreateRequest,
  PaginationQueryParams,
  ProductMatchRequest,
  ProductSearchParams,
  PurchaseAnalyzeRequest,
  PurchasePlanRequest,
  PurchasePlanSelectionRequest,
} from '../../types/api';

export const useAnalyzeMissingIngredients = () => {
  return useMutation({
    mutationFn: (data: PurchaseAnalyzeRequest) => purchaseApi.analyzeMissingIngredients(data),
    onError: (error: Error) => {
      console.error('分析缺失食材失败:', error);
    },
  });
};

export const useGeneratePurchasePlans = () => {
  return useMutation({
    mutationFn: (data: PurchasePlanRequest) => purchaseApi.generatePurchasePlans(data),
    onError: (error: Error) => {
      console.error('生成补购方案失败:', error);
    },
  });
};

export const useMatchProducts = () => {
  return useMutation({
    mutationFn: (data: ProductMatchRequest) => purchaseApi.matchProducts(data),
    onError: (error: Error) => {
      console.error('匹配商品失败:', error);
    },
  });
};

export const useSearchProducts = (params: ProductSearchParams | undefined) => {
  const { ingredient_id, sort_by, limit } = params ?? {};

  return useQuery({
    queryKey: ['purchase', 'products', 'search', ingredient_id, sort_by, limit],
    queryFn: () => purchaseApi.searchProducts(params!),
    enabled: !!ingredient_id,
    staleTime: 1000 * 60 * 15,
  });
};

export const useSelectPurchasePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PurchasePlanSelectionRequest) => purchaseApi.selectPurchasePlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['purchase', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['coupon', 'weekly-savings'] });
    },
    onError: (error: Error) => {
      console.error('选择补购方案失败:', error);
    },
  });
};

export const useUserPurchasePlans = (
  userId: number | null | undefined,
  params: PaginationQueryParams = {}
) => {
  return useQuery({
    queryKey: ['purchase', 'user', userId, 'plans', params],
    queryFn: () => purchaseApi.getUserPurchasePlans(userId!, params),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OrderCreateRequest) => purchaseApi.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase', 'plans'] });
    },
    onError: (error: Error) => {
      console.error('创建订单失败:', error);
    },
  });
};

export const useMeituanMockPage = () => {
  return useQuery({
    queryKey: ['purchase', 'meituan', 'mockPage'],
    queryFn: purchaseApi.getMeituanMockPage,
    staleTime: 1000 * 60 * 60,
  });
};
