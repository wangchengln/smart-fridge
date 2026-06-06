/**
 * 云冰箱三大场景 Bundle API
 */

import http from '../utils/http';
import type {
  BundleOrderCreateRequest,
  BundleOrderResponse,
  CookShopScenarioRequest,
  HomeGatheringScenarioRequest,
  ScenarioBundleResponse,
  ScenarioPreviewResponse,
  WeekendRestockScenarioRequest,
} from '../types/api';

export const getScenarioPreview = async (userId: number): Promise<ScenarioPreviewResponse> => {
  const response = await http.get<ScenarioPreviewResponse>('/api/scenario/preview', {
    params: { user_id: userId },
  });
  return response.data;
};

export const generateCookShopBundle = async (
  data: CookShopScenarioRequest
): Promise<ScenarioBundleResponse> => {
  const response = await http.post<ScenarioBundleResponse>('/api/scenario/cook-shop', data);
  return response.data;
};

export const generateWeekendRestockBundle = async (
  data: WeekendRestockScenarioRequest
): Promise<ScenarioBundleResponse> => {
  const response = await http.post<ScenarioBundleResponse>(
    '/api/scenario/weekend-restock',
    data
  );
  return response.data;
};

export const generateHomeGatheringBundle = async (
  data: HomeGatheringScenarioRequest
): Promise<ScenarioBundleResponse> => {
  const response = await http.post<ScenarioBundleResponse>(
    '/api/scenario/home-gathering',
    data
  );
  return response.data;
};

export const createBundleOrder = async (
  data: BundleOrderCreateRequest
): Promise<BundleOrderResponse> => {
  const response = await http.post<BundleOrderResponse>('/api/scenario/bundle/order', data);
  return response.data;
};
