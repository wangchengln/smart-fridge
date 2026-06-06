import { useMutation, useQuery } from '@tanstack/react-query';
import * as scenarioApi from '../../api/scenario';
import type {
  BundleOrderCreateRequest,
  CookShopScenarioRequest,
  HomeGatheringScenarioRequest,
  WeekendRestockScenarioRequest,
} from '../../types/api';

export const useScenarioPreview = (userId: number | null) =>
  useQuery({
    queryKey: ['scenario', 'preview', userId],
    queryFn: () => scenarioApi.getScenarioPreview(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

export const useCookShopBundle = () =>
  useMutation({
    mutationFn: (data: CookShopScenarioRequest) => scenarioApi.generateCookShopBundle(data),
    onError: (error: Error) => {
      console.error('买菜做饭 Bundle 生成失败:', error);
    },
  });

export const useWeekendRestockBundle = () =>
  useMutation({
    mutationFn: (data: WeekendRestockScenarioRequest) =>
      scenarioApi.generateWeekendRestockBundle(data),
    onError: (error: Error) => {
      console.error('周末补货 Bundle 生成失败:', error);
    },
  });

export const useHomeGatheringBundle = () =>
  useMutation({
    mutationFn: (data: HomeGatheringScenarioRequest) =>
      scenarioApi.generateHomeGatheringBundle(data),
    onError: (error: Error) => {
      console.error('居家聚会 Bundle 生成失败:', error);
    },
  });

export const useCreateBundleOrder = () =>
  useMutation({
    mutationFn: (data: BundleOrderCreateRequest) => scenarioApi.createBundleOrder(data),
    onError: (error: Error) => {
      console.error('Bundle 下单失败:', error);
    },
  });
