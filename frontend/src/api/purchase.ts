/**
 * 补购交易相关 API 接口封装
 */

import http from '../utils/http';
import type {
  OrderCreateRequest,
  OrderResponse,
  PaginationQueryParams,
  ProductMatchRequest,
  ProductMatchResponse,
  ProductSearchParams,
  PurchaseAnalyzeRequest,
  PurchaseAnalyzeResponse,
  PurchasePlanRecord,
  PurchasePlanRequest,
  PurchasePlanResponseExtended,
  PurchasePlanSelectionRequest,
  PurchasePlanSelectionResponse,
  UserPurchasePlansResponse,
} from '../types/api';

export const analyzeMissingIngredients = async (
  data: PurchaseAnalyzeRequest
): Promise<PurchaseAnalyzeResponse> => {
  const response = await http.post<PurchaseAnalyzeResponse>('/api/purchase/analyze', data);
  return response.data;
};

export const generatePurchasePlans = async (
  data: PurchasePlanRequest
): Promise<PurchasePlanResponseExtended> => {
  const response = await http.post<PurchasePlanResponseExtended>('/api/purchase/plan', data);
  return response.data;
};

export const matchProducts = async (data: ProductMatchRequest): Promise<ProductMatchResponse> => {
  const response = await http.post<ProductMatchResponse>('/api/purchase/match', data);
  return response.data;
};

export const searchProducts = async (params: ProductSearchParams): Promise<ProductMatchResponse> => {
  const response = await http.get<ProductMatchResponse>('/api/purchase/products/search', {
    params,
  });
  return response.data;
};

export const selectPurchasePlan = async (
  data: PurchasePlanSelectionRequest
): Promise<PurchasePlanSelectionResponse> => {
  const response = await http.post<PurchasePlanSelectionResponse>(
    '/api/purchase/plan/select',
    data
  );
  return response.data;
};

export const getUserPurchasePlans = async (
  userId: number,
  params: PaginationQueryParams = {}
): Promise<UserPurchasePlansResponse> => {
  const response = await http.get<UserPurchasePlansResponse>(`/api/purchase/user/${userId}/plans`, {
    params,
  });
  return response.data;
};

export const createOrder = async (data: OrderCreateRequest): Promise<OrderResponse> => {
  const response = await http.post<OrderResponse>('/api/purchase/order', data);
  return response.data;
};

export const getMeituanMockPage = async (): Promise<Record<string, unknown>> => {
  const response = await http.get<Record<string, unknown>>('/api/purchase/meituan/mock-page');
  return response.data;
};
