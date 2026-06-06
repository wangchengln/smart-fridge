/**
 * 食材管理相关 API 接口封装
 */

import http from '../utils/http';
import type {
  BatchUpdateNearExpiryRequest,
  BatchUpdateNearExpiryResponse,
  CheckNearExpiryRequest,
  IngredientRecognitionRequest,
  IngredientRecognitionResponse,
  IngredientBaseListResponse,
  IngredientStockItem,
  NearExpiryResponse,
  OrderSyncRequest,
  OrderSyncResponse,
  StockUpdateRequest,
  StockUpdateResponse,
  UserIngredientsListResponse,
} from '../types/api';

export const recognizeIngredients = async (
  data: IngredientRecognitionRequest
): Promise<IngredientRecognitionResponse> => {
  const response = await http.post<IngredientRecognitionResponse>('/api/ingredient/recognize', data);
  return response.data;
};

export const syncOrder = async (data: OrderSyncRequest): Promise<OrderSyncResponse> => {
  const response = await http.post<OrderSyncResponse>('/api/ingredient/sync-order', data);
  return response.data;
};

export const getIngredientBaseList = async (): Promise<IngredientBaseListResponse> => {
  const response = await http.get<IngredientBaseListResponse>('/api/ingredient/base');
  return response.data;
};

export const createStock = async (data: StockUpdateRequest): Promise<StockUpdateResponse> => {
  const response = await http.post<StockUpdateResponse>('/api/ingredient/stock', data);
  return response.data;
};

export const updateStock = async (
  stockId: number,
  data: StockUpdateRequest
): Promise<StockUpdateResponse> => {
  const response = await http.put<StockUpdateResponse>(
    `/api/ingredient/stock?stock_id=${stockId}`,
    data
  );
  return response.data;
};

export const deleteStock = async (stockId: number): Promise<void> => {
  const response = await http.delete<void>(`/api/ingredient/stock/${stockId}`);
  return response.data;
};

export const checkNearExpiry = async (
  userId: number,
  daysBeforeExpiry = 2
): Promise<NearExpiryResponse> => {
  const body: CheckNearExpiryRequest = {
    user_id: userId,
    days_before_expiry: daysBeforeExpiry,
  };
  const response = await http.post<NearExpiryResponse>('/api/ingredient/check-near-expiry', body);
  return response.data;
};

export const getNearExpiryIngredients = async (userId: number): Promise<NearExpiryResponse> => {
  const response = await http.get<NearExpiryResponse>(
    `/api/ingredient/near-expiry?user_id=${userId}`
  );
  return response.data;
};

export const batchUpdateNearExpiry = async (
  data: BatchUpdateNearExpiryRequest
): Promise<BatchUpdateNearExpiryResponse> => {
  const response = await http.post<BatchUpdateNearExpiryResponse>(
    '/api/ingredient/batch-update-near-expiry',
    data
  );
  return response.data;
};

export type IngredientStockFilters = Record<string, string | number | boolean | undefined>;

export const getUserIngredients = async (
  userId: number,
  filters: IngredientStockFilters = {}
): Promise<UserIngredientsListResponse | IngredientStockItem[]> => {
  const queryParams = new URLSearchParams({
    user_id: userId.toString(),
    ...Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, String(value)])
    ),
  });

  const response = await http.get<UserIngredientsListResponse | IngredientStockItem[]>(
    `/api/ingredient/user/${userId}/stocks?${queryParams}`
  );
  return response.data;
};

export const ingredientApi = {
  recognize: recognizeIngredients,
  syncOrder,
  getBaseList: getIngredientBaseList,
  create: createStock,
  update: updateStock,
  delete: deleteStock,
  getList: (userId: number, filters?: IngredientStockFilters) =>
    getUserIngredients(userId, filters),
  checkNearExpiry,
  getNearExpiry: getNearExpiryIngredients,
  batchUpdateNearExpiry,
};
