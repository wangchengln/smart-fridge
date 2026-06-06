import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ingredientApi from '../../api/ingredient';
import type {
  BatchUpdateNearExpiryRequest,
  IngredientRecognitionRequest,
  StockUpdateRequest,
} from '../../types/api';

export const useRecognizeIngredients = () => {
  return useMutation({
    mutationFn: (data: IngredientRecognitionRequest) => ingredientApi.recognizeIngredients(data),
    onError: (error: Error) => {
      console.error('食材识别失败:', error);
    },
  });
};

export const useSyncOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ingredientApi.syncOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient', 'stock'] });
    },
    onError: (error: Error) => {
      console.error('订单同步失败:', error);
    },
  });
};

export const useIngredientBaseList = () => {
  return useQuery({
    queryKey: ['ingredient', 'base'],
    queryFn: () => ingredientApi.getIngredientBaseList(),
    staleTime: 1000 * 60 * 10,
  });
};

export const useCreateStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StockUpdateRequest) => ingredientApi.createStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient', 'stock'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', 'base'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', 'nearExpiry'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', 'recommendations'] });
    },
    onError: (error: Error) => {
      console.error('创建库存失败:', error);
    },
  });
};

export const useUpdateStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stockId, data }: { stockId: number; data: StockUpdateRequest }) =>
      ingredientApi.updateStock(stockId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient', 'stock'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', 'nearExpiry'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', 'recommendations'] });
    },
    onError: (error: Error) => {
      console.error('更新库存失败:', error);
    },
  });
};

export const useDeleteStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stockId: number) => ingredientApi.deleteStock(stockId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient', 'stock'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', 'recommendations'] });
    },
    onError: (error: Error) => {
      console.error('删除库存失败:', error);
    },
  });
};

export const useCheckNearExpiry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      daysBeforeExpiry,
    }: {
      userId: number;
      daysBeforeExpiry?: number;
    }) => ingredientApi.checkNearExpiry(userId, daysBeforeExpiry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient', 'nearExpiry'] });
    },
    onError: (error: Error) => {
      console.error('检查临期食材失败:', error);
    },
  });
};

export const useNearExpiryIngredients = (userId: number | null | undefined) => {
  return useQuery({
    queryKey: ['ingredient', 'nearExpiry', userId],
    queryFn: () => ingredientApi.getNearExpiryIngredients(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
};

export const useBatchUpdateNearExpiry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BatchUpdateNearExpiryRequest) =>
      ingredientApi.batchUpdateNearExpiry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient', 'nearExpiry'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', 'stock'] });
    },
    onError: (error: Error) => {
      console.error('批量更新临期状态失败:', error);
    },
  });
};

export const useUserIngredients = (userId: number | null | undefined) => {
  return useQuery({
    queryKey: ['ingredient', 'stock', userId],
    queryFn: () => ingredientApi.getUserIngredients(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
};
